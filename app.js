var cluster         = require('cluster'),
    express         = require('express'),
    app             = express(),
    url             = require('url'),
    os              = require('os'),
    fs              = require('fs'),
    i18n            = require('i18n'),
    swig            = require('swig'),
    consolidate     = require('consolidate'),
    config          = require('./config/app.js'),
    auth            = require('./lib/authorization');

app.root_path = __dirname;

// WebStorm debug mode
var isDebug = false;
if (process.execArgv && process.execArgv.length) {
    process.execArgv.forEach(function(v) {
        if (/debug-brk/.test(v)) {
            isDebug = true;
        }
    });
}

if (cluster.isMaster && !isDebug) {
    var procNums = os.cpus().length;
    if (procNums < 2) {
        procNums = 2;
    }
    // Always use only one worker in development mode
    if (app.settings.env === 'development') {
        procNums = 1;
    }
    for (var i = 0; i < procNums; i++) {
        var worker = cluster.fork();
        console.log("worker " + worker.id + " live");
    }
    cluster.on('disconnect', function(worker) {
        console.log("worker " + worker.id + " died");
        worker = cluster.fork();
        console.log("worker " + worker.id + " live");
    });

} else {
    // i18n configuration
    i18n.configure({
        locales: config.locales,
        cookie: 'locale',
        directory: './locales',
        extension: '.json',
        register: global
    });

    app.configure(function() {
        app.engine('html', consolidate.swig);
        app.set('view engine', 'html');
        app.set('views', app.root_path + '/views');
        app.set('view options', { layout: false });

        swig.init({ root: app.settings.views, allowErrors: true });

        app.use(express.favicon());
        app.use(express.bodyParser());
        app.use(express.methodOverride());

        // pass a secret to cookieParser() for signed cookies
        app.use(express.cookieParser(config.cookie.secret));
        // Populates req.session
        app.use(express.session({ secret: config.session.secret, maxAge: config.session.maxAge }));

        app.use(i18n.init);

        app.use(function(req, res, next){
            // expose the current path as a view local
            res.locals.path =  url.parse(req.url).pathname;

            res.locals.config = config;
            res.locals.__ = req.__ = function () {
                return i18n.__.apply(req, arguments);
            };
            res.locals.__n = req.__n = function () {
                return i18n.__n.apply(req, arguments);
            };
            res.locals.locale = i18n.getLocale(req);

            res.locals.user = req.user;
            res.locals.session = req.session;

            res.locals.version = app.settings.env === 'production' ? config.version : new Date().getTime();
            res.locals.now = new Date();

            next();
        });
    });

    // configure environments
    app.configure('development', function(){
        app.set('showStackError', true);
        app.use(express.static(__dirname + '/public'));
    });

    // gzip only in staging and production envs
    app.configure('staging', function(){
        app.use(express.compress());
        app.use(express.static(__dirname + '/public', { maxAge: 86400000 })); // 24h
        app.enable('view cache');
    });
    app.configure('production', function(){
        app.use(express.compress());
        app.use(express.static(__dirname + '/public', { maxAge: 2592000000 })); // one month
        // view cache is enabled by default in production mode
    });

    // Bootstrap controllers
    var controllers_path = app.root_path + '/controllers',
        controller_files = fs.readdirSync(controllers_path);
    controller_files.forEach(function (file) {
        if (/.+\.js/i.test(file)) {
            require(controllers_path + '/' + file)(app, auth);
        }
    });

    // assume "not found" in the error msgs
    // is a 404. this is somewhat silly, but valid,
    app.use(function(err, req, res, next){
        // treat as 404
        if (~(err.message.indexOf('not found'))) {
            return next();
        }
        // log it
        console.error(err.stack);
        // error page
        res.status(500).render('errors/5xx', { error: err, url: req.originalUrl, code: 500 });
    });
    // assume 404 since no middleware responded
    app.use(function(req, res, next){
        res.status(404).render('errors/404', { url: req.originalUrl });
    });

    var server_port = process.env.PORT || 3000;
    app.set('port', server_port); // Easy port access, useful for full url generators
    app.listen(server_port, function() {
        console.log("Express server listening on port " + server_port + " in " + app.settings.env + " mode");
    });
}
