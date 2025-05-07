const db = require('../database');

module.exports = (req, res) => {
  const { id } = req.params;

  const pedido = db.prepare(`
    SELECT p.*, c.name AS cliente_nombre
    FROM pedidos p
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE p.id = ?
  `).get(id);

  if (!pedido) {
    req.flash('error', 'Pedido no encontrado');
    return res.redirect('/pedidos/pendientes');
  }

  const productos = db.prepare(`
    SELECT * FROM productos WHERE pedido_id = ?
  `).all(id);

  pedido.productos = productos.map(p => {
    let imagenes = [];
    try {
      imagenes = JSON.parse(p.imagenes || '[]');
    } catch {
      imagenes = [];
    }
    return { ...p, imagenes };
  });

  const comentarios = db.prepare(`
    SELECT comment, "user", fecha
    FROM revision_comments
    WHERE pedido_id = ?
    ORDER BY fecha ASC
  `).all(id);
// ── Marcar comentarios como leídos ────────────────────────────────────────
db.prepare(
  'UPDATE revision_comments SET leido = 1 WHERE pedido_id = ?'
).run(id);
db.prepare(
  'UPDATE pedidos SET unread_comments = 0 WHERE id = ?'
).run(id);

  res.render('pedidos/detalle', {
    title: `Detalle Pedido #${id}`,
    pedido,
    comentarios,
    success: req.flash('success'),
    error: req.flash('error')
  });
};
