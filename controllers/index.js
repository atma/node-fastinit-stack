/*
 * GET index page.
 */
module.exports = function(app, auth){
    app.get('/', function(req, res){
        res.render('pages/index');
    });

    app.get('/noauth', auth.requiresLogin, function(req, res){
        res.render('pages/index');
    });
};