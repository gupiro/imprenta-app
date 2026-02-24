// middleware/authMiddleware.js

exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  req.flash('error', 'Debes iniciar sesión primero.');
  res.redirect('/auth/login');
};

exports.isAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Debes iniciar sesión primero.');
    return res.redirect('/auth/login');
  }
  const rol = (req.session.user.rol || '').toLowerCase();
  if (rol === 'admin') return next();
  req.flash('error', 'Acceso restringido. Solo administradores.');
  res.redirect('/');
};
