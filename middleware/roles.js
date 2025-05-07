// middleware/roles.js

function soloRol(rolEsperado) {
  return function (req, res, next) {
    const user = req.session.user;
    if (user && user.rol === rolEsperado) return next();
    req.flash('error', 'No tenés permiso para acceder a esta sección.');
    return res.redirect('/');
  };
}

function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) {
      // redirige al login centralizado
      return res.redirect('/auth/login');
    }
    if (!rolesPermitidos.includes(user.rol)) {
      req.flash('error', 'Acceso restringido.');
      return res.status(403).redirect('/');
    }
    next();
  };
}

module.exports = { permitirRoles, soloRol };
