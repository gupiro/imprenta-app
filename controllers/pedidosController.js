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
      try {
        const revision = JSON.parse(p.revision_archivo || '[]');
        p.imagen = revision.find(fn => /\.(jpg|jpeg|png|gif)$/i.test(fn)) || null;
      } catch {
        p.imagen = null;
      }
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

    const historial = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre
      FROM pedidos p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.estado = 'ENTREGADO' AND p.estado_pago = 'PAGADO'
      ORDER BY p.fecha_pago DESC
    `).all();

    historial.forEach(p => {
      const prods = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(p.id);
      p.productos = prods.map(prod => {
        let imagenes = [];
        try {
          imagenes = JSON.parse(prod.imagenes || '[]');
        } catch {
          imagenes = [];
        }
        return { ...prod, imagenes };
      });

      try {
        const revision = JSON.parse(p.revision_archivo || '[]');
        p.imagen = revision.find(fn => /\.(jpg|jpeg|png|gif)$/i.test(fn)) || null;
      } catch {
        p.imagen = null;
      }

      p.forma_pago = p.forma_pago || 'No especificado';
      p.fecha_pago = p.fecha_pago || 'Sin fecha';
      p.precio = p.precio || 0;
      p.monto_entregado = p.monto_entregado || 0;
      p.monto_restante = p.monto_restante || 0;
    });

    const hoy = new Date().toISOString().slice(0, 10);
    const ingresosHoy = historial
      .filter(p => typeof p.fecha_pago === 'string' && p.fecha_pago.startsWith(hoy))
      .reduce((sum, p) => sum + (p.precio || 0), 0);

    res.render('historial', {
      title: 'Historial de Trabajos',
      pedidos: historial,
      entregados: historial,
      totalDia: ingresosHoy,
      mes,
      anio,
      success: req.flash('success'),
      error: req.flash('error')
    });

  } catch (error) {
    console.error('Error en verHistorial:', error);
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

    let imagenFinal = null;
    try {
      const revisionArchivos = JSON.parse(pedido.revision_archivo || '[]');
      imagenFinal = revisionArchivos.find(fn => /\.(jpg|jpeg|png|gif)$/i.test(fn)) || null;
    } catch {}

    const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const nuevo = db.prepare(`
      INSERT INTO pedidos (client_id, precio, fecha, estado, monto_entregado, monto_restante, medio_pago, revision_archivo)
      VALUES (?, ?, ?, 'PENDIENTE', 0, ?, ?, ?)
    `).run(
      pedido.client_id,
      pedido.precio,
      fecha,
      pedido.precio,
      pedido.medio_pago || 'No especificado',
      imagenFinal ? JSON.stringify([imagenFinal]) : null
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
        imagenFinal ? JSON.stringify([imagenFinal]) : prod.imagenes
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
      WHERE p.estado = 'ENTREGADO' AND p.estado_pago = 'PAGADO'
      ORDER BY p.fecha_pago DESC
    `).all();

    const doc = new PDFDocument();
    const filename = "historial_trabajos.pdf";

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

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
