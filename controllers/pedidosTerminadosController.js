// controllers/pedidosTerminadosController.js
const db = require('../database');
const PDFDocument = require('pdfkit');

// ── Ver trabajos TERMINADOS (aún no entregados)
exports.verTerminados = async (req, res) => {
  try {
    const pedidos = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre, c.phone AS telefono
      FROM pedidos p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.estado = 'TERMINADO' AND COALESCE(p.estado_pago, 'PENDIENTE') = 'PENDIENTE'
      ORDER BY p.fecha DESC
    `).all();

    pedidos.forEach(p => {
      const prods = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(p.id);
      const primero = prods[0] || {};
      p.material = primero.material || 'Sin especificar';
      p.descripcion = primero.descripcion || 'Sin descripción';
      p.imagen = JSON.parse(primero.imagenes || '[]')[0] || null;
    });

    res.render('terminados', {
      title: 'Trabajos Terminados',
      pedidos,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Error al mostrar trabajos terminados:', error);
    res.status(500).send('Error interno del servidor');
  }
};

// ── Ver HISTORIAL de trabajos pagados
exports.verHistorial = async (req, res) => {
  try {
    const mes = new Date().getMonth() + 1;
    const anio = new Date().getFullYear();

    const entregados = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre
      FROM pedidos p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.estado = 'TERMINADO' AND p.estado_pago = 'PAGADO'
      ORDER BY p.fecha_pago DESC
    `).all();

    entregados.forEach(p => {
      const prods = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(p.id);
      p.productos = prods.map(x => ({ ...x, imagenes: JSON.parse(x.imagenes || '[]') }));
    });

    const hoy = new Date().toISOString().slice(0, 10);
    const ingresosHoy = entregados
      .filter(p => (p.fecha_pago || '').startsWith(hoy))
      .reduce((sum, p) => sum + (p.precio || 0), 0);

    res.render('historial', {
      title: 'Historial de Trabajos',
      pedidos: entregados,
      entregados,
      totalDia: ingresosHoy,
      mes,
      anio,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Error al mostrar historial:', error);
    res.status(500).send('Error interno del servidor');
  }
};

// ── Repetir un trabajo desde el historial
exports.repetirTrabajo = (req, res) => {
  const { id } = req.params;

  try {
    const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
    if (!pedido) {
      req.flash('error', 'No se encontró el pedido original.');
      return res.redirect('/pedidos/historial');
    }

    const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const nuevo = db.prepare(`
      INSERT INTO pedidos (client_id, precio, fecha, estado, monto_entregado, monto_restante, medio_pago)
      VALUES (?, ?, ?, 'PENDIENTE', 0, ?, ?)
    `).run(
      pedido.client_id,
      pedido.precio,
      fecha,
      pedido.precio,
      pedido.medio_pago
    );

    const nuevoPedidoId = nuevo.lastInsertRowid;

    const productos = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(id);
    productos.forEach(prod => {
      db.prepare(`
        INSERT INTO productos (pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nuevoPedidoId,
        prod.material,
        prod.ancho,
        prod.alto,
        prod.descuento || 0,
        prod.precio,
        prod.descripcion,
        prod.imagenes
      );
    });

    req.flash('success', 'Pedido duplicado correctamente.');
    res.redirect('/pedidos/pendientes');
  } catch (error) {
    console.error('Error al duplicar trabajo:', error);
    req.flash('error', 'Ocurrió un error al duplicar el pedido.');
    res.redirect('/pedidos/historial');
  }
};

// ── Exportar historial como PDF
exports.exportarHistorialPDF = (req, res) => {
  try {
    const pedidos = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre
      FROM pedidos p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.estado = 'TERMINADO' AND p.estado_pago = 'PAGADO'
      ORDER BY p.fecha_pago DESC
    `).all();

    const doc = new PDFDocument();
    const filename = "historial_trabajos.pdf";

    res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Historial de Trabajos Pagados', { align: 'center' });
    doc.moveDown();

    pedidos.forEach(p => {
      doc.fontSize(12).text(`Cliente: ${p.cliente_nombre}`);
      doc.text(`Material: ${p.material || 'N/A'}`);
      doc.text(`Descripción: ${p.descripcion || 'N/A'}`);
      doc.text(`Precio: $${Math.round(p.precio || 0)}`);
      doc.text(`Fecha de pago: ${p.fecha_pago || 'Sin fecha'}`);
      doc.moveDown().moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('Error al generar el PDF:', error);
    res.status(500).send('Error al generar el PDF');
  }
};
