// middleware/permissions.js
// Verifica que el usuario esté autenticado con un rol válido.
// La autorización por sección ya la maneja middleware/roles.js en server.js.

const ROLES_VALIDOS = ['admin', 'vendedor', 'operador', 'empleado', 'recepcionista'];

module.exports = (req, res, next) => {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Debes iniciar sesión primero');
    return res.redirect('/auth/login');
  }

  const rol = (req.session.user.rol || '').toLowerCase();
  if (ROLES_VALIDOS.includes(rol)) {
    return next();
  }

  req.flash('error', 'No tienes permisos para realizar esta acción');
  res.status(403).redirect('/');
};
