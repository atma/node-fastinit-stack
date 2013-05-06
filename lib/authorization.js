/*
 * Generic require login routing middleware stub
 */
exports.requiresLogin = function (req, res, next) {
    if (!req.loggedIn) {
        var msg = req.__('You are not authorized or session has expired. Please login');
        if (req.xhr) {
            res.status(401).json({ success: false, message: msg });
        } else {
            res.status(401).render('errors/401', { url: req.originalUrl, message: msg });
        }
    }
    next();
};
