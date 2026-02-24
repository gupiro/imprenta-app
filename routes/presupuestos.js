const express = require('express');
const upload = require('../config/multer');
const checkPermission = require('../middleware/permissions');

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

      // Calcular total de items
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

  return router;
};
