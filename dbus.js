const DBus = require('dbus');
const sessionBus = DBus.getBus('session');

sessionBus.getInterface('org.freedesktop.secrets', '/org/freedesktop/secrets', 'org.freedesktop.Secret.Service', (err, iface) => {
    if (err) {
        console.log(err);
        return;
    }

    iface.OpenSession('plain', '', (err, [output, session]) => {

        iface.SearchItems({ service: 'rutracker-cli' }, (err, [unlocked, locked]) => {
            iface.GetSecrets(unlocked, session, (err, result) => {
                Object.keys(result).forEach(key => {
                    console.log(result[key]);
                });
            });
        });

    });

});
