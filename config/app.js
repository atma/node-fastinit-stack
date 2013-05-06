var pkg = require('../package.json');

module.exports = {
    appname: pkg.title,
    description: pkg.description,
    version: pkg.version,
    locales: ['en', 'ru'],
    cookie: {
        secret: 'qazxswedc'
    },
    session: {
        secret: 'qazwsxedc',
        maxAge: (3600*24*30)
    }
};
