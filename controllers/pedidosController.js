const path = require('path');
const fs   = require('fs');
const db   = require('../database');

// ── Ver trabajos ENTREGADOS agrupados por fecha
exports.verEntregados = async (req, res) => {
  try {
    db.prepare(`UPDATE pedidos SET visto_entregado = 1 WHERE estado = 'ENTREGADO'`).run();

    const pedidos = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre, c.phone AS telefono, c.email
      FROM pedidos p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.estado = 'ENTREGADO'
      ORDER BY p.fecha_entrega DESC
    `).all();

    pedidos.forEach(p => {
      try {
        const arr = JSON.parse(p.revision_archivo || '[]');
        p.imagen = arr.find(fn => /\.(jpg|jpeg|png|gif)$/i.test(fn)) || null;
      } catch {
        p.imagen = null;
      }

      const prods = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(p.id);
      p.productos = prods.map(pr => ({ ...pr, imagenes: JSON.parse(pr.imagenes || '[]') }));
    });

    const pedidosAgrupados = {};
    pedidos.forEach(p => {
      let fecha = p.fecha_entrega || '';
      const d = fecha ? new Date(fecha) : new Date();
      const hoy = new Date();
      const ayer = new Date();
      ayer.setDate(hoy.getDate() - 1);
      let clave = d.toISOString().slice(0, 10);
      if (clave === hoy.toISOString().slice(0, 10)) {
        clave = 'Hoy';
      } else if (clave === ayer.toISOString().slice(0, 10)) {
        clave = 'Ayer';
      } else {
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        clave = `${d.getDate()} de ${meses[d.getMonth()]}`;
      }
      if (!pedidosAgrupados[clave]) pedidosAgrupados[clave] = [];
      pedidosAgrupados[clave].push(p);
    });

    res.render('pedidos/entregados', {
      title: 'Trabajos Entregados',
      pedidosAgrupados,
      success: req.flash('success'),
      error: req.flash('error')
    });

  } catch (err) {
    console.error('Error al cargar entregados:', err);
    res.status(500).send('Error interno al mostrar entregados');
  }
};

// ── Agregar comentario con imagenes desde vista detalle
exports.comentarPedido = async (req, res) => {
  const pedidoId   = req.params.id;
  const comentario = (req.body.comentario || '').trim();
  const archivos   = req.files || [];

  try {
    if (!comentario && archivos.length === 0) {
      req.flash('error', 'Debes escribir un comentario o adjuntar una imagen');
      return res.redirect('back');
    }

    const textoComentario = comentario || '[Imagen adjunta]';

    db.prepare(`
      INSERT INTO revision_comments (pedido_id, comment, user, fecha)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `).run(pedidoId, textoComentario, req.session.user.rol || 'Desconocido');

    if (archivos.length) {
      const insert = db.prepare(`
        INSERT INTO revision_images (pedido_id, filename, fecha)
        VALUES (?, ?, datetime('now', 'localtime'))
      `);
      for (const file of archivos) {
        insert.run(pedidoId, file.filename);
      }
    }

    db.prepare(`UPDATE pedidos SET estado = 'PENDIENTE' WHERE id = ?`).run(pedidoId);
    res.redirect('/');

  } catch (err) {
    console.error('❌ Error al comentar pedido:', err);
    req.flash('error', 'Ocurrió un error al guardar el comentario');
    res.redirect('back');
  }
};
