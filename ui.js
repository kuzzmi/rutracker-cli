const figlet = require('figlet');

const clc = require('cli-color');
const green = clc.xterm(34);
const red = clc.xterm(196);
const orange = clc.xterm(208);
const bold = clc.bold;

module.exports = {
    renderHeader: () => {
        console.log('');
        console.log(figlet.textSync(' RuTracker . org', {
            font: 'Small',
        }));
    },
    green,
    red,
    orange,
    bold,
}
