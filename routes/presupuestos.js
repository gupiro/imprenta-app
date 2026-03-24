const express = require('express');
const upload = require('../config/multer');
const checkPermission = require('../middleware/permissions');
const puppeteer = require('puppeteer');

module.exports = (db) => {
  const router = express.Router();
  const presupuestosController = require('../controllers/presupuestosController')(db);

  // Rutas base
  // ✅ Presupuesto público (sin autenticación)
  router.get('/publico', presupuestosController.formPresupuestoPublico);
  router.post('/publico', upload.single('archivo_imagen'), presupuestosController.recibirPresupuestoPublico);

  // ✅ Presupuestos para usuarios autenticados (admin, vendedor, operador, empleado)
  router.get('/nuevo', checkPermission, presupuestosController.formNuevoPresupuesto);
  router.post('/nuevo', checkPermission, upload.single('archivo_imagen'), presupuestosController.crearPresupuesto);
  router.get('/', checkPermission, presupuestosController.listarPresupuestos);
  
  // ✅ NUEVA RUTA: Editar presupuesto (GET - cargar formulario)
  router.get('/:id/editar', checkPermission, async (req, res) => {
    const id = req.params.id;
    try {
      const presupuesto = await db.get('SELECT * FROM presupuestos WHERE id = ?', id);
      if (!presupuesto) {
        req.flash('error', 'Presupuesto no encontrado');
        return res.redirect('/presupuestos');
      }

      // Cargar items existentes
      const items = await db.all('SELECT * FROM presupuesto_items WHERE presupuesto_id = ?', id);
      
      // Cargar dropdowns
      const productos = await db.all('SELECT * FROM catalogo_productos ORDER BY nombre ASC');
      const clientes = await db.all('SELECT id, name FROM clients ORDER BY name ASC');

      res.render('presupuestos/editar', {
        title: `Editar Presupuesto #${id}`,
        presupuesto,
        items: items || [],
        productos,
        clientes,
        csrfToken: req.csrfToken ? req.csrfToken() : '',
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (err) {
      console.error('Error al cargar presupuesto para editar:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/presupuestos');
    }
  });

  // ✅ NUEVA RUTA: Actualizar presupuesto (POST)
  router.post('/:id/editar', checkPermission, upload.single('archivo_imagen'), async (req, res) => {
    const id = req.params.id;
    const { cliente_id, nombre_cliente, email_cliente, telefono_cliente, detalle = '', precio_extra = '0', descripcion = [], producto_id = [], cantidad = [], precio_unitario = [], descuento_item = [] } = req.body;

    try {
      const presupuesto = await db.get('SELECT * FROM presupuestos WHERE id = ?', id);
      if (!presupuesto) {
        req.flash('error', 'Presupuesto no encontrado');
        return res.redirect('/presupuestos');
      }

      let nombreFinal = nombre_cliente || presupuesto.nombre_cliente;
      let emailFinal = email_cliente || presupuesto.email_cliente;
      let telefonoFinal = telefono_cliente || presupuesto.telefono_cliente;
      let clienteIdFinal = cliente_id ? parseInt(cliente_id, 10) : presupuesto.cliente_id;

      // Calcular total de items con validaciones
      let totalPresupuesto = 0;
      const descripciones = Array.isArray(descripcion) ? descripcion : [descripcion];
      const cantidades = Array.isArray(cantidad) ? cantidad : [cantidad];
      const preciosUnit = Array.isArray(precio_unitario) ? precio_unitario : [precio_unitario];
      const descuentos = Array.isArray(descuento_item) ? descuento_item : [descuento_item];

      for (let i = 0; i < descripciones.length; i++) {
        if (descripciones[i]) {
          const cant = parseFloat(cantidades[i]) || 0;
          const precio = parseFloat(preciosUnit[i]) || 0;
          const desc = parseFloat(descuentos[i]) || 0;

          // Validar valores positivos
          if (cant <= 0) {
            req.flash('error', `Cantidad debe ser mayor a 0 en item "${descripciones[i]}"`);
            return res.redirect(`/presupuestos/${id}/editar`);
          }
          if (precio < 0) {
            req.flash('error', `Precio no puede ser negativo en item "${descripciones[i]}"`);
            return res.redirect(`/presupuestos/${id}/editar`);
          }
          if (desc < 0) {
            req.flash('error', `Descuento no puede ser negativo en item "${descripciones[i]}"`);
            return res.redirect(`/presupuestos/${id}/editar`);
          }

          totalPresupuesto += (cant * precio) - desc;
        }
      }

      // Agregar precio extra
      const precioExtraVal = parseFloat(precio_extra) || 0;
      totalPresupuesto += precioExtraVal;

      // Actualizar presupuesto
      await db.run(`
        UPDATE presupuestos SET
          cliente_id = ?,
          nombre_cliente = ?,
          email_cliente = ?,
          telefono_cliente = ?,
          precio_estimado = ?,
          detalle = ?,
          precio_extra = ?
        WHERE id = ?
      `, clienteIdFinal || null, nombreFinal, emailFinal, telefonoFinal, totalPresupuesto, detalle, precioExtraVal, id);

      // ELIMINAR items viejos
      await db.run('DELETE FROM presupuesto_items WHERE presupuesto_id = ?', id);

      // CREAR items nuevos
      for (let i = 0; i < descripciones.length; i++) {
        if (descripciones[i]) {
          const cant = parseFloat(cantidades[i]) || 1;
          const precio = parseFloat(preciosUnit[i]) || 0;
          const desc = parseFloat(descuentos[i]) || 0;
          const subtotal = (cant * precio) - desc;
          const prodId = parseInt(producto_id[i]) || null;

          await db.run(`
            INSERT INTO presupuesto_items (presupuesto_id, producto_id, descripcion, cantidad, precio_unitario, descuento_item, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, id, prodId, descripciones[i], cant, precio, desc, subtotal);
        }
      }

      req.flash('success', 'Presupuesto actualizado correctamente.');
      res.redirect('/presupuestos/' + id);
    } catch (err) {
      console.error('Error al actualizar presupuesto:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/presupuestos/' + id);
    }
  });

  // ✅ Cambiar estado presupuesto
  router.post('/:id/cambiar-estado', checkPermission, async (req, res) => {
    const presupuestoId = req.params.id;
    
    try {
      const { estado } = req.body;

      // Estados permitidos para presupuestos
      const estadosPermitidos = ['PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'CONVERTIDO'];

      if (!estadosPermitidos.includes(estado)) {
        req.flash('error', `Estado no válido: ${estado}`);
        return res.redirect(`/presupuestos/${presupuestoId}`);
      }

      await db.run('UPDATE presupuestos SET estado = ? WHERE id = ?', estado, presupuestoId);

      req.flash('success', `Presupuesto actualizado a ${estado}`);
      res.redirect(`/presupuestos/${presupuestoId}`);
    } catch (err) {
      console.error('Error al cambiar estado presupuesto:', err);
      req.flash('error', 'Error al cambiar estado: ' + err.message);
      res.redirect(`/presupuestos/${presupuestoId}`);
    }
  });

  // ✅ Crear pedido desde presupuesto
  router.post('/:id/crear-pedido', checkPermission, async (req, res) => {
    const presupuestoId = req.params.id;
    
    try {
      const presupuesto = await db.get('SELECT * FROM presupuestos WHERE id = ?', presupuestoId);
      if (!presupuesto) {
        req.flash('error', 'Presupuesto no encontrado');
        return res.redirect('/presupuestos');
      }

      if (presupuesto.usado) {
        req.flash('error', 'Este presupuesto ya fue convertido a pedido');
        return res.redirect(`/presupuestos/${presupuestoId}`);
      }

      const items = await db.all('SELECT * FROM presupuesto_items WHERE presupuesto_id = ?', presupuestoId);
      
      // Crear pedido
      const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
      let clientId = presupuesto.cliente_id;
      
      // Si no hay cliente_id, crear uno temporal con los datos del presupuesto
      if (!clientId && presupuesto.nombre_cliente) {
        const existente = await db.get('SELECT id FROM clients WHERE name = ?', presupuesto.nombre_cliente);
        if (existente) {
          clientId = existente.id;
        } else {
          const result = await db.run(
            'INSERT INTO clients (name, phone, email, address) VALUES (?, ?, ?, ?)',
            presupuesto.nombre_cliente,
            presupuesto.telefono_cliente || '',
            presupuesto.email_cliente || '',
            ''
          );
          clientId = result.lastID;
        }
      }

      if (!clientId) {
        req.flash('error', 'No se pudo determinar el cliente');
        return res.redirect(`/presupuestos/${presupuestoId}`);
      }

      // Crear pedido
      const pedidoResult = await db.run(
        'INSERT INTO pedidos (client_id, precio, fecha, estado, presupuesto_id) VALUES (?, ?, ?, ?, ?)',
        clientId,
        presupuesto.precio_estimado,
        fecha,
        'PENDIENTE',
        presupuestoId
      );
      const pedidoId = pedidoResult.lastID;

      // Crear productos del pedido desde items del presupuesto
      for (const item of items) {
        await db.run(
          'INSERT INTO productos (pedido_id, material, descuento, precio, descripcion) VALUES (?, ?, ?, ?, ?)',
          pedidoId,
          item.descripcion,
          item.descuento_item || 0,
          item.subtotal,
          item.descripcion
        );
      }

      // Marcar presupuesto como convertido
      await db.run('UPDATE presupuestos SET estado = "CONVERTIDO", usado = 1 WHERE id = ?', presupuestoId);

      req.flash('success', `✅ Pedido #${pedidoId} creado desde presupuesto`);
      res.redirect(`/pedidos/detalle/${pedidoId}`);
    } catch (err) {
      console.error('Error al crear pedido desde presupuesto:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect(`/presupuestos/${presupuestoId}`);
    }
  });

  // Detalle
  router.get('/:id', presupuestosController.verDetallePresupuesto);

  // Eliminar
  router.post('/:id/eliminar', checkPermission, async (req, res) => {
    const id = req.params.id;
    try {
      await db.run('DELETE FROM presupuesto_items WHERE presupuesto_id = ?', id);
      await db.run('DELETE FROM presupuestos WHERE id = ?', id);
      req.flash('success', 'Presupuesto eliminado');
    } catch (err) {
      req.flash('error', 'Error: ' + err.message);
    }
    res.redirect('/presupuestos');
  });

  // Generar PDF de presupuesto
  router.get('/:id/pdf', async (req, res) => {
    try {
      const id = req.params.id;

      // Obtener presupuesto y datos del cliente
      const presupuesto = await db.get(`
        SELECT p.*, c.name, c.phone, c.email, c.address
        FROM presupuestos p
        LEFT JOIN clients c ON p.cliente_id = c.id
        WHERE p.id = ?
      `, id);

      if (!presupuesto) {
        return res.status(404).send('Presupuesto no encontrado');
      }

      // Obtener items del presupuesto
      const items = await db.all(
        'SELECT * FROM presupuesto_items WHERE presupuesto_id = ?',
        id
      ) || [];

      // Generar HTML del presupuesto
      const itemsHTML = items.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.descripcion}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.cantidad}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.precio_unitario || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.subtotal || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 30px; }
            .empresa { font-size: 24px; font-weight: bold; color: #2563eb; }
            .empresa-data { font-size: 12px; color: #666; margin-top: 5px; }
            .title { font-size: 18px; font-weight: bold; margin: 20px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
            .section { }
            .section h3 { font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 8px; }
            .section p { margin: 4px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            table thead { background: #f0f0f0; }
            table th { padding: 12px; text-align: left; font-size: 12px; font-weight: bold; border-bottom: 2px solid #ddd; }
            .totales { margin-top: 20px; text-align: right; }
            .totales-row { display: flex; justify-content: flex-end; margin: 8px 0; font-size: 12px; }
            .totales-row .label { width: 150px; }
            .totales-row .value { width: 100px; text-align: right; font-weight: bold; }
            .total-final { font-size: 18px; color: #2563eb; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 10px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="empresa">📊 IMPRENTA EL GRÁFICO</div>
            <div class="empresa-data">El Gráfico de Orán - Salta | Tel: 3878 22-4908</div>
          </div>

          <div class="title">Presupuesto #${presupuesto.id}</div>

          <div class="grid">
            <div class="section">
              <h3>Datos del Presupuesto</h3>
              <p><strong>Fecha:</strong> ${new Date(presupuesto.fecha_creacion).toLocaleDateString('es-AR')}</p>
              <p><strong>Estado:</strong> ${presupuesto.estado}</p>
              <p><strong>Válido hasta:</strong> ${presupuesto.fecha_vencimiento ? new Date(presupuesto.fecha_vencimiento).toLocaleDateString('es-AR') : 'Sin especificar'}</p>
            </div>
            <div class="section">
              <h3>Datos del Cliente</h3>
              <p><strong>${presupuesto.name || presupuesto.nombre_cliente || 'Cliente'}</strong></p>
              <p>Teléfono: ${presupuesto.phone || '-'}</p>
              <p>Email: ${presupuesto.email || '-'}</p>
              <p>Dirección: ${presupuesto.address || '-'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Descripción</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: right;">Precio Unit.</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="totales">
            <div class="totales-row">
              <div class="label">Subtotal:</div>
              <div class="value">$${(presupuesto.precio_estimado || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
            </div>
            ${presupuesto.precio_extra ? `
              <div class="totales-row">
                <div class="label">Extras:</div>
                <div class="value">$${(presupuesto.precio_extra).toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
              </div>
            ` : ''}
            <div class="totales-row total-final">
              <div class="label">TOTAL:</div>
              <div class="value">$${((presupuesto.precio_estimado || 0) + (presupuesto.precio_extra || 0)).toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
            </div>
          </div>

          ${presupuesto.detalle ? `
            <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 5px;">
              <h3 style="font-size: 12px; margin-top: 0;">Observaciones:</h3>
              <p style="font-size: 12px; color: #666;">${presupuesto.detalle}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Este presupuesto es válido por 7 días hábiles desde su emisión.</p>
            <p>Generado: ${new Date().toLocaleString('es-AR')}</p>
          </div>
        </body>
        </html>
      `;

      // Generar PDF con Puppeteer
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', margin: { top: 10, right: 10, bottom: 10, left: 10 } });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="presupuesto-${id}.pdf"`);
      res.send(pdf);
    } catch (err) {
      console.error('Error al generar PDF de presupuesto:', err);
      res.status(500).send('Error al generar PDF: ' + err.message);
    }
  });

  return router;
};
