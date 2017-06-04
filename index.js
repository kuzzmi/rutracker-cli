#!/usr/bin/env node

require('clear')();

const RutrackerApi = require('rutracker-api');
const minimist = require('minimist');
const inquirer = require('inquirer');
const fs = require('fs');

const mkdir = require('make-dir');
const defaultPathMode = 0o0700;

const groupBy = require('lodash.groupby');
const sortBy = require('lodash.sortby');

const homedir = require('home-dir');
const Configstore = require('configstore');
const pkg = require('./package.json');
const conf = new Configstore(pkg.name, {
    downloadPath: homedir('/Torrents'),
    username: '',
    password: '',
}, {
    globalConfigPath: `$CONFIG/${pkg.name}/config.json`,
});

const clui = require('clui');
const Progress = clui.Progress;
const Spinner = clui.Spinner;

const argv = minimist(process.argv.slice(2));

const UI = require('./ui.js');
UI.renderHeader();

// --------------- Utils --------------------

const pad = str =>
    ('    ' + str).slice(-4);

const deHtml = str =>
    str.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const parseStats = num => {
    const parsed = parseInt(num, 10);
    return isNaN(parsed) ? 0 : parsed;
};

// ------------- Utils end -----------------

const getTopicChoice = topic => {
    const _seeds = parseStats(topic.seeds);
    const _leechs = parseStats(topic.leechs);

    const seeds = _seeds === 0 ? UI.red(pad(_seeds)) : UI.green(pad(_seeds));
    const leechs = _leechs > _seeds ? UI.orange(pad(_leechs)) : UI.green(pad(_leechs));

    const size = UI.orange(topic.size);

    const title = deHtml(topic.title);

    return {
        value: topic.id,
        name: `[${size}] [${seeds}/${leechs}] ${title}`,
    };
};

const downloadProgress = new Progress(26);

const rutracker = new RutrackerApi();

const ERRORS = {
    login: 'Authentication failed. Please check your credentials and try again.',
    permission: 'You don\'t have access to a download directory',
    noResults: 'Nothing found for "%d"...\r\nTry again.',
};

function auth(username, password) {
    const _username = username || conf.get('username');
    const _password = password || conf.get('password');
    const questions = [{
        type: 'input',
        name: 'username',
        message: 'Username:',
        validate: v => v.length > 0,
    }, {
        type: 'password',
        name: 'password',
        message: 'Password:',
        validate: v => v.length > 0,
    }];

    if (!_username || !_password) {
        return inquirer.prompt(questions).then(({ username, password }) => {
            conf.set('username', username);
            conf.set('password', password);
            return {
                username,
                password,
            };
        }, err => {
            console.log(err);
        });
    } else {
        return new Promise((resolve) => {
            resolve({
                username: _username,
                password: _password,
            });
        });
    }
}

function download(total, completed) {
    return function(id) {
        const path = conf.get('downloadPath');

        return new Promise((resolve, reject) => {
            rutracker.download(id, response => {
                const name = `rutracker.org.${id}.torrent`;
                const writable = fs.createWriteStream(`${path}/${name}`);

                response.on('error', err => {
                    writable.close();
                    reject(err);
                });

                writable.on('error', err => {
                    // Create download directory if it doesn't exist
                    // and retry piping
                    if (err.code === 'ENOENT') {
                        mkdir.sync(path, defaultPathMode);
                        const _writable = fs.createWriteStream(`${path}/${name}`);
                        response.pipe(_writable);
                    }

                    if (err.code === 'EACCES') {
                        reject({ type: 'permission' });
                    }
                });

                response.pipe(writable);

                response.on('end', () => {
                    completed++;
                    const output = downloadProgress.update(completed, total);
                    if (completed === total) {
                        console.log(output);
                        console.log(UI.bold('Download completed.'));
                    } else {
                        process.stdout.write(output + '\r');
                    }
                    resolve();
                });
            });
        });
    }
}

function categorizeResults(data) {
    const grouped = groupBy(data, 'category');
    const sort = arr =>
        sortBy(arr, [
            o => parseFloat(o.size, 10),
            o => parseInt(o.seeds, 10)
        ]).reverse();


    return Object.keys(grouped).reduce((items, category) => ([
        ...items,
        new inquirer.Separator(UI.bold(`----- ${deHtml(category)} -----`)),
        ...sort(grouped[category]).map(getTopicChoice),
    ]), []);
}

function processSearch(data) {
    const choices = categorizeResults(data);

    const questions = [{
        type: 'checkbox',
        name: 'topic',
        paginated: true,
        pageSize: 10,
        message: 'Please select what to download (you can pick multiple torrents)',
        validate: answer => {
            if (answer.length < 1) {
                return 'You must choose something to download';
            }
            return true;
        },
        choices,
    }];

    return inquirer.prompt(questions).then(answers => {
        const total = answers.topic.length;
        let completed = 0;

        console.log(UI.bold('Downloading...'));
        return Promise.all(answers.topic.map(download(total, completed)));
    });
}

function search(query) {
    return new Promise((resolve, reject) => {
        const loader = new Spinner('Searching...');
        loader.start();

        rutracker.on('error', err => {
            loader.stop();
            reject(err);
        });

        rutracker.search(query, data => {
            loader.stop();

            if (data.length === 0) {
                reject({ type: 'noResults', data: query });
            } else {
                resolve(data);
            }
        });
    });
}

function login({ skip = false }) {
    return function({ username, password }) {
        return new Promise((resolve, reject) => {
            const loader = new Spinner('Authentication...');

            if (!skip) {
                loader.start();
            }

            rutracker.on('login-error', () => {
                loader.stop();
                reject({
                    type: 'login',
                });
            });
            rutracker.on('login', () => {
                loader.stop();
                resolve();
            });

            if (!skip) {
                rutracker.login(username, password);
            } else {
                resolve();
            }
        });
    }
}

function getQuery(query) {
    if (!query) {
        const questions = [{
            type: 'input',
            name: 'query',
            message: 'What are you looking for?',
            validate: answer =>
                answer.length === 0 ?
                'Please enter your search query. E.g. "breaking bad 1080p"' :
                true,
        }];

        return inquirer.prompt(questions).then(({ query }) => {
            return query;
        }, err => {
            console.log(err);
        }).catch(err => {
            console.log(err);
        });
    } else {
        return new Promise((resolve) => {
            resolve(query);
        });
    }
}

function repeatSearch() {
    const questions = [{
        type: 'expand',
        name: 'repeat',
        message: 'Looking for something else?',
        choices: [{
            key: 'y',
            name: 'Yes',
            value: true,
        }, {
            key: 'n',
            name: 'No, exit',
            value: false,
        }],
    }];

    return inquirer.prompt(questions).then(({ repeat }) => {
        return repeat;
    });
}

const app = options => {
    const {
        skipAuth = false,
    } = options || {};

    // Search query
    const query = argv.q || argv.query;
    const username = argv.u || argv.username;
    const password = argv.p || argv.password;

    auth(username, password)
        .then(login({ skip: skipAuth }))
        .then(() => getQuery(query))
        .then(search)
        .then(processSearch)
        .then(repeatSearch)
        .then(toRepeat => {
            if (toRepeat) {
                argv.q = '';
                argv.query = '';
                app({
                    skipAuth: true,
                });
            }
        })
        .catch(err => {
            if (err.type) {
                console.log('Error:', ERRORS[err.type].replace(/%d/g, err.data));
            } else {
                console.log('UNHANDLED:');
                console.log(err);
            }
            switch (err.type) {
                case 'login':
                    if (!username) {
                        conf.set('username', '');
                    }
                    if (!password) {
                        conf.set('password', '');
                    }
                    app();
                    break;
                case 'noResults':
                    argv.q = '';
                    argv.query = '';
                    app({
                        skipAuth: true,
                    });
                    break;
                default:
                    break;
            }
        });
}

app();
