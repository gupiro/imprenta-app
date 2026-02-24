module.exports = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.session.usuario.rol)) {
      return res.status(403).render('error', {
        mensaje: 'No tienes permisos para acceder a esta página',
        usuario: req.session.usuario
      });
    }
    next();
  };
};
