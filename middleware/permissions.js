// middleware/permissions.js

/**
 * Comprueba que el usuario tenga un permiso para el recurso y acción.
 * El permiso se forma como "<recurso>.<acción>", p.ej. "pedidos.view".
 */
function checkPermission(req, res, next) {
  const user = req.session.user;

  // 1) Si no hay usuario en sesión, pedir login
  if (!user) {
    req.flash('error', 'Debes iniciar sesión.');
    return res.redirect('/auth/login');
  }

  // 2) Super-Admin (rol "Admin") salta todas las comprobaciones
  if (user.rol === 'Admin') {
    return next();
  }

  // 3) Lista de permisos del usuario
  const permisos = Array.isArray(user.permisos) ? user.permisos : [];

  // 4) Derivar recurso de la ruta (/pedidos/...)
  const resource = req.baseUrl.replace(/^\//, '').split('/')[0];

  // 5) Determinar acción según método HTTP y params
  let action;
  switch (req.method) {
    case 'GET':
      action = 'view';
      break;
    case 'POST':
      // Si la ruta termina en /nuevo o no hay :id, entendemos "create"
      action = (req.baseUrl.endsWith('/nuevo') || !req.params.id)
        ? 'create'
        : 'edit';
      break;
    case 'PUT':
      action = 'edit';
      break;
    case 'DELETE':
      action = 'delete';
      break;
    default:
      action = '';
  }

  // 6) Formar la llave y verificar permiso
  const llave = `${resource}.${action}`;
  if (permisos.includes(llave)) {
    return next();
  }

  // 7) En caso contrario, denegar acceso
  req.flash('error', 'Acceso restringido');
  return res.redirect('/');
}

module.exports = checkPermission;
