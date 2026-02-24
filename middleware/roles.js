// middleware/roles.js

module.exports = function permitirRoles(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            req.flash('error', 'Debés iniciar sesión primero.');
            return res.redirect('/auth/login');
        }
        const rol = (req.session.user.rol || '').toLowerCase();
        if (roles.includes(rol)) return next();
        req.flash('error', 'No tenés permiso para acceder a esa sección.');
        return res.redirect('/');
    };
};
