const express = require('express');
const fs = require('fs');
const sharp = require('sharp');
const upload = require('../config/multer');
const checkPermission = require('../middleware/permissions');
const path = require('path');
const pdf = require('html-pdf');

// Función auxiliar para obtener fecha y hora en zona horaria local (no UTC)
function obtenerFechaLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  const horas = String(now.getHours()).padStart(2, '0');
  const minutos = String(now.getMinutes()).padStart(2, '0');
  const segundos = String(now.getSeconds()).padStart(2, '0');

  return {
    fecha: `${year}-${mes}-${dia}`,
    timestamp: `${year}-${mes}-${dia} ${horas}:${minutos}:${segundos}`
  };
}

module.exports = (db) => {
  const router = express.Router();
  // Configuración de directorios
  const uploadsDir = path.join(__dirname, '../public/uploads');
  const thumbsDir = path.join(uploadsDir, 'thumbs');
  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  // ==================== RUTAS ====================

  // 0) Raíz → pendientes (navbar apunta a /pedidos)
  router.get('/', (_, res) => res.redirect('/pedidos/pendientes'));

  // 1) Nuevo Pedido (GET)
  router.get('/nuevo', checkPermission, async (req, res) => {
    try {
      const clientes = await db.all('SELECT * FROM clients ORDER BY id ASC');
      const materiales = await db.all('SELECT id, nombre AS name, tipo, precio_base AS price FROM catalogo_productos ORDER BY nombre ASC');
      res.render('pedidos/nuevo', {
        title: 'Nuevo Pedido',
        clientes,
        materiales,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error al cargar');
    }
  });

  // 2) Crear Nuevo Pedido (POST)
  router.post('/nuevo', checkPermission, upload.any(), async (req, res) => {
    try {
      const { clienteExistente, clienteInput, telefonoNuevo, direccionNuevo, cuitNuevo, emailNuevo, precioTotalPedido, monto_entregado, medio_pago, fecha_entrega } = req.body;
      const presupuestoId = req.body.presupuesto_id || null;

      let clientId = null;
      if (clienteExistente && clienteExistente !== 'undefined') {
        const maybeId = parseInt(clienteExistente, 10);
        if (!isNaN(maybeId)) clientId = maybeId;
      }

      if (!clientId && clienteInput && clienteInput.trim()) {
        const name = clienteInput.trim();
        const fila = await db.get('SELECT id FROM clients WHERE name = ?', name);
        if (fila) {
          clientId = fila.id;
        } else {
          const insert = await db.run('INSERT INTO clients (name, phone, address, cuit, email) VALUES (?, ?, ?, ?, ?)', name, telefonoNuevo || '', direccionNuevo || '', cuitNuevo || '', emailNuevo || '');
          clientId = insert.lastID;
        }
      }

      if (!clientId) {
        req.flash('error', 'Debés seleccionar o ingresar un cliente.');
        return res.redirect('/pedidos/nuevo');
      }

      const materiales = [].concat(req.body.material || []).filter(Boolean);
      if (materiales.length === 0) {
        req.flash('error', 'Debés agregar al menos un producto.');
        return res.redirect('/pedidos/nuevo');
      }

      const precio = parseFloat(precioTotalPedido) || 0;
      const entregado = parseFloat(monto_entregado) || 0;
      const restante = precio - entregado;
      const { timestamp: fecha } = obtenerFechaLocal();
      const usuarioId = req.session.user?.id || null;

      const infoPed = await db.run('INSERT INTO pedidos (client_id, precio, fecha, estado, monto_entregado, monto_restante, medio_pago, presupuesto_id, fecha_entrega, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', clientId, precio, fecha, 'PENDIENTE', entregado, restante, medio_pago, presupuestoId, fecha_entrega || null, usuarioId);
      const pedidoId = infoPed.lastID;

      // 💰 REGISTRAR ADELANTO EN CAJA DIARIA (si hay monto adelantado)
      if (entregado > 0) {
        const nombreCliente = clienteInput || (clienteExistente ? 'Cliente' : 'Cliente');
        const concepto = `Adelanto Pedido #${pedidoId} - ${nombreCliente}`;
        await db.run('INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, pedido_id, fecha, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 'ingreso', concepto, 'Ventas - Adelanto', entregado, medio_pago || 'Efectivo', pedidoId, fecha, usuarioId);
      }

      const anchos = [].concat(req.body.ancho || []).map(v => parseFloat(v) || 0);
      const altos = [].concat(req.body.alto || []).map(v => parseFloat(v) || 0);
      const preciosArr = [].concat(req.body.precio || []).map(v => parseFloat(v) || 0);
      const descripciones = [].concat(req.body.descripcion || []);
      const cantidades = [].concat(req.body.cantidad || []).map(v => parseFloat(v) || 1);

      for (let i = 0; i < materiales.length; i++) {
        const mat = materiales[i];
        const imgs = (req.files || []).filter(f => f.fieldname === 'imagen_' + (i + 1)).map(f => f.filename);
        // 💡 preciosArr[i] ya contiene el precio FINAL (cantidad * unitario - descuento)
        // NO multiplicar por qty nuevamente
        const precioFinal = preciosArr[i] || 0;
        const cantidad = cantidades[i] || 1;
        await db.run('INSERT INTO productos (pedido_id, material, ancho, alto, cantidad, descuento, precio, descripcion, imagenes) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)', pedidoId, mat, anchos[i], altos[i], cantidad, precioFinal, descripciones[i] || 'Sin descripción', JSON.stringify(imgs));
      }

      req.flash('success', 'Pedido creado correctamente');
      res.redirect('/pedidos/pendientes');
    } catch (err) {
      console.error('Error al crear pedido:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/pedidos/nuevo');
    }
  });

  // 3) Listar Pendientes
  router.get('/pendientes', checkPermission, async (req, res) => {
    try {
      const pedidos = await db.all('SELECT p.*, c.name AS cliente_nombre, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE p.estado = ? ORDER BY p.id ASC', 'PENDIENTE');
      for (let p of pedidos) {
        const prods = await db.all('SELECT * FROM productos WHERE pedido_id = ?', p.id);
        p.productos = prods.map(x => ({ ...x, imagenes: JSON.parse(x.imagenes || '[]') }));
      }
      res.render('pedidos/pendientes', {
        title: 'Trabajos Encargados',
        pedidos,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error');
    }
  });

  // 3B) Cambiar estado (SIMPLIFICADO) - CON SCOPE ARREGLADO
  router.post('/:id/cambiar-estado', checkPermission, async (req, res) => {
    const pedidoId = req.params.id;
    
    try {
      const { estado } = req.body;

      // Estados permitidos simplificados (DEBEN COINCIDIR CON BD)
      const estadosPermitidos = ['PENDIENTE', 'EN_PRODUCCION', 'LISTO', 'ENTREGADO', 'CANCELADO'];

      if (!estadosPermitidos.includes(estado)) {
        req.flash('error', `Estado no válido: ${estado}`);
        return res.redirect(`/pedidos/detalle/${pedidoId}`);
      }

      await db.run('UPDATE pedidos SET estado = ? WHERE id = ?', estado, pedidoId);

      req.flash('success', `Pedido movido a ${estado}`);
      res.redirect(`/pedidos/detalle/${pedidoId}`);
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      req.flash('error', 'Error al cambiar estado: ' + err.message);
      res.redirect(`/pedidos/detalle/${pedidoId}`);
    }
  });

  // 4) Detalle de Pedido
  router.get('/detalle/:id', checkPermission, async (req, res) => {
    try {
      const { id } = req.params;
      await db.run('UPDATE revision_comments SET leido = 1 WHERE pedido_id = ?', id);
      await db.run('UPDATE pedidos SET unread_comments = 0 WHERE id = ?', id);

      const pedido = await db.get('SELECT p.*, c.name AS cliente_nombre, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE p.id = ?', id);
      if (!pedido) {
        req.flash('error', 'Pedido no encontrado');
        return res.redirect('/pedidos/pendientes');
      }

      const prodsRaw = await db.all('SELECT * FROM productos WHERE pedido_id = ?', id);
      pedido.productos = prodsRaw.map(p => ({ ...p, imagenes: JSON.parse(p.imagenes || '[]') }));

      const comentarios = await db.all('SELECT comment, "user", fecha FROM revision_comments WHERE pedido_id = ? ORDER BY fecha ASC', id);
      const imagenesRevision = await db.all('SELECT filename FROM revision_images WHERE pedido_id = ? ORDER BY fecha ASC', id);

      res.render('pedidos/detalle', {
        title: `Detalle Pedido #${pedido.id}`,
        pedido,
        comentarios,
        imagenesRevision,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error');
    }
  });

  // ✅ Cancelar deuda (POST)
  router.post('/:id/cancelar-deuda', checkPermission, async (req, res) => {
    try {
      const { id } = req.params;
      const { monto_a_pagar, metodo_pago } = req.body;

      const pedido = await db.get('SELECT p.*, c.name AS cliente_nombre, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE p.id = ?', id);

      if (!pedido) {
        req.flash('error', 'Pedido no encontrado');
        return res.redirect('/pedidos');
      }

      const monto = parseFloat(monto_a_pagar);
      if (isNaN(monto) || monto <= 0) {
        req.flash('error', 'Monto inválido');
        return res.redirect(`/pedidos/detalle/${id}`);
      }

      const saldo_actual = (pedido.precio || 0) - (pedido.monto_entregado || 0);
      if (monto > saldo_actual + 0.01) {
        req.flash('error', `Monto mayor que la deuda. Saldo: $${saldo_actual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
        return res.redirect(`/pedidos/detalle/${id}`);
      }

      const nuevo_entregado = (pedido.monto_entregado || 0) + monto;
      const nuevo_saldo = Math.max(0, (pedido.precio || 0) - nuevo_entregado);
      const { timestamp: fecha_ahora } = obtenerFechaLocal();

      await db.run('UPDATE pedidos SET monto_entregado = ?, monto_restante = ?, fecha_pago = ?, medio_pago = ?, estado_pago = CASE WHEN ? <= 0.01 THEN "PAGADO" ELSE "PARCIAL" END WHERE id = ?', nuevo_entregado, nuevo_saldo, fecha_ahora, metodo_pago || 'Efectivo', nuevo_saldo, id);

      const concepto = `Pago Pedido #${id} - ${pedido.cliente_nombre}`;
      await db.run('INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, fecha) VALUES (?, ?, ?, ?, ?, ?)', 'ingreso', concepto, 'Ventas - Pago de Pedido', monto, metodo_pago || 'Efectivo', fecha_ahora);

      req.flash('success', `✅ Deuda cancelada. $${monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })} registrado en caja diaria.`);
      res.redirect(`/pedidos/detalle/${id}`);

    } catch (err) {
      console.error('Error al cancelar deuda:', err);
      req.flash('error', 'Error al cancelar deuda: ' + err.message);
      res.redirect(`/pedidos/detalle/${id}`);
    }
  });

  // 6) Eliminar
  router.post('/eliminar/:id', checkPermission, async (req, res) => {
    try {
      const { id } = req.params;
      await db.run('DELETE FROM productos WHERE pedido_id = ?', id);
      await db.run('DELETE FROM pedidos WHERE id = ?', id);
      req.flash('success', 'Pedido eliminado correctamente');
      res.redirect('/pedidos/pendientes');
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/pedidos/pendientes');
    }
  });

  // 7) Completar pago GET
  router.get('/:id/completar-pago', checkPermission, async (req, res) => {
    try {
      const { id } = req.params;
      const pedido = await db.get('SELECT p.*, c.name AS cliente_nombre, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE p.id = ?', id);
      if (!pedido) {
        req.flash('error', 'Pedido no encontrado.');
        return res.redirect('/pedidos/entregados');
      }
      res.render('pedidos/completar-pago', {
        title: `Pagar saldo Pedido #${id}`,
        pedido,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error');
    }
  });

  // 8) Completar pago POST
  router.post('/:id/completar-pago', checkPermission, async (req, res) => {
    try {
      const { id } = req.params;
      const monto = parseFloat(req.body.monto_extra) || 0;
      const medio = req.body.forma_pago;
      if (monto <= 0) {
        req.flash('error', 'Ingresa un monto válido.');
        return res.redirect(`/pedidos/${id}/completar-pago`);
      }
      const pedido = await db.get('SELECT precio, monto_entregado, client_id FROM pedidos WHERE id = ?', id);
      if (!pedido) {
        req.flash('error', 'Pedido no encontrado.');
        return res.redirect('/pedidos/entregados');
      }
      const nuevoEntregado = (pedido.monto_entregado || 0) + monto;
      const nuevoRestante = (pedido.precio || 0) - nuevoEntregado;
      const { timestamp: fecha_pago } = obtenerFechaLocal();

      await db.run('UPDATE pedidos SET monto_entregado = ?, monto_restante = ?, medio_pago = ?, fecha_pago = ?, estado_pago = CASE WHEN ? <= 0 THEN "PAGADO" ELSE estado_pago END, estado = CASE WHEN ? <= 0 THEN "ENTREGADO" ELSE estado END WHERE id = ?', nuevoEntregado, nuevoRestante, medio, fecha_pago, nuevoRestante, nuevoRestante, id);

      // 💰 REGISTRAR PAGO EN CAJA DIARIA
      const cliente = await db.get('SELECT name FROM clients WHERE id = ?', pedido.client_id);
      const concepto = `Pago Pedido #${id} - ${cliente?.name || 'Cliente'}`;
      await db.run('INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, pedido_id, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)', 'ingreso', concepto, 'Ventas - Pago de Pedido', monto, medio || 'Efectivo', id, fecha_pago);

      req.flash('success', `✅ Pago de $${monto.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado en caja diaria.`);
      res.redirect('/pedidos/entregados');
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect(`/pedidos/${id}/completar-pago`);
    }
  });

  // 9) Ver En Producción
  router.get('/en-produccion', checkPermission, async (req, res) => {
    try {
      const pedidos = await db.all('SELECT p.*, c.name AS cliente_nombre, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE p.estado = ? ORDER BY p.id ASC', 'EN_PRODUCCION');
      for (let p of pedidos) {
        const prods = await db.all('SELECT * FROM productos WHERE pedido_id = ?', p.id);
        p.productos = prods.map(x => ({ ...x, imagenes: JSON.parse(x.imagenes || '[]') }));
      }
      res.render('pedidos/en-produccion', {
        title: 'Trabajos en Producción',
        pedidos,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error');
    }
  });

  // 10) Ver Listos
  router.get('/listos', checkPermission, async (req, res) => {
    try {
      const pedidos = await db.all('SELECT p.*, c.name AS cliente_nombre, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE p.estado = ? ORDER BY p.id ASC', 'LISTO');
      for (let p of pedidos) {
        const prods = await db.all('SELECT * FROM productos WHERE pedido_id = ?', p.id);
        p.productos = prods.map(x => ({ ...x, imagenes: JSON.parse(x.imagenes || '[]') }));
      }
      res.render('pedidos/listos', {
        title: 'Trabajos Listos para Entregar',
        pedidos,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error');
    }
  });

  // 11) Ver Entregados
  router.get('/entregados', checkPermission, async (req, res) => {
    try {
      const pedidos = await db.all('SELECT p.*, c.name AS cliente_nombre, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE p.estado = ? ORDER BY p.id ASC', 'ENTREGADO');
      for (let p of pedidos) {
        const prods = await db.all('SELECT * FROM productos WHERE pedido_id = ?', p.id);
        p.productos = prods.map(x => ({ ...x, imagenes: JSON.parse(x.imagenes || '[]') }));
      }
      res.render('pedidos/entregados', {
        title: 'Trabajos Entregados',
        pedidos,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error');
    }
  });

  // 12) Cancelar Pedido con Devolución
  router.post('/:id/cancelar-pedido', checkPermission, async (req, res) => {
    const pedidoId = req.params.id;
    try {
      const pedido = await db.get('SELECT * FROM pedidos WHERE id = ?', pedidoId);
      if (!pedido) {
        req.flash('error', 'Pedido no encontrado');
        return res.redirect('/pedidos/pendientes');
      }

      // Si hay dinero entregado, crear movimiento de egreso (devolución)
      if (pedido.monto_entregado > 0) {
        const { timestamp: fecha_ahora } = obtenerFechaLocal();
        const concepto = `Devolución - Pedido #${pedidoId} Cancelado`;
        await db.run(
          'INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, pedido_id, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)',
          'egreso',
          concepto,
          'Devoluciones',
          pedido.monto_entregado,
          pedido.medio_pago || 'Efectivo',
          pedidoId,
          fecha_ahora
        );
      }

      // Cambiar estado a CANCELADO
      await db.run('UPDATE pedidos SET estado = "CANCELADO" WHERE id = ?', pedidoId);

      req.flash('success', `✅ Pedido #${pedidoId} cancelado. Devolución de $${pedido.monto_entregado.toLocaleString('es-AR', { minimumFractionDigits: 2 })} registrada en caja.`);
      res.redirect(`/pedidos/detalle/${pedidoId}`);
    } catch (err) {
      console.error('Error al cancelar pedido:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect(`/pedidos/detalle/${pedidoId}`);
    }
  });

  // Comprobante (Receipt)
  router.get('/:id/comprobante', checkPermission, async (req, res) => {
    try {
      const { id } = req.params;
      const pedido = await db.get('SELECT p.*, c.name AS cliente_nombre, c.phone FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?', id);
      if (!pedido) {
        req.flash('error', 'Pedido no encontrado');
        return res.redirect('/pedidos/pendientes');
      }

      const productos = await db.all('SELECT * FROM productos WHERE pedido_id = ?', id);

      res.render('pedidos/comprobante', {
        title: `Comprobante Pedido #${id}`,
        pedido,
        productos,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/pedidos/pendientes');
    }
  });

  // ── EDITAR PEDIDO ──────────────────────────────────────────────────────────

  // GET: formulario de edición
  router.get('/editar/:id', checkPermission, async (req, res) => {
    try {
      const { id } = req.params;
      const pedido = await db.get(
        'SELECT p.*, c.name AS cliente_nombre, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE p.id = ?', id
      );
      if (!pedido) {
        req.flash('error', 'Pedido no encontrado');
        return res.redirect('/pedidos/pendientes');
      }
      const items = await db.all('SELECT * FROM productos WHERE pedido_id = ?', id);
      items.forEach(i => { i.imagenes = JSON.parse(i.imagenes || '[]'); });
      const clients = await db.all('SELECT id, name FROM clients ORDER BY name ASC');
      res.render('pedidos/edit', {
        title: `Editar Pedido #${id}`,
        pedido,
        items,
        clients,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/pedidos/pendientes');
    }
  });

  // POST: guardar edición
  router.post('/editar/:id', checkPermission, upload.any(), async (req, res) => {
    const { id } = req.params;
    try {
      const { client_id, monto_entregado, medio_pago, fecha_entrega } = req.body;
      const pedido = await db.get('SELECT * FROM pedidos WHERE id = ?', id);
      if (!pedido) {
        req.flash('error', 'Pedido no encontrado');
        return res.redirect('/pedidos/pendientes');
      }

      // Actualizar items existentes
      const itemIds = [].concat(req.body.item_id || []);
      let totalItems = 0;
      for (const itemId of itemIds) {
        const ancho  = parseFloat(req.body[`ancho_${itemId}`])  || 0;
        const alto   = parseFloat(req.body[`alto_${itemId}`])   || 0;
        const precio = parseFloat(req.body[`precio_${itemId}`]) || 0;
        const desc   = req.body[`descripcion_${itemId}`] || '';
        totalItems += precio;
        await db.run(
          'UPDATE productos SET ancho = ?, alto = ?, precio = ?, descripcion = ? WHERE id = ? AND pedido_id = ?',
          ancho, alto, precio, desc, itemId, id
        );
      }

      // Procesar nuevos productos agregados desde la edición
      const nuevosMateriales = [].concat(req.body.nuevo_material || []);
      const nuevosCantidades = [].concat(req.body.nuevo_cantidad || []);
      const nuevosAnchos = [].concat(req.body.nuevo_ancho || []);
      const nuevosAltos = [].concat(req.body.nuevo_alto || []);
      const nuevosPrecios = [].concat(req.body.nuevo_precio || []);
      const nuevasDescripciones = [].concat(req.body.nuevo_descripcion || []);

      for (let i = 0; i < nuevosMateriales.length; i++) {
        const material = (nuevosMateriales[i] || '').trim();
        const cantidad = parseFloat(nuevosCantidades[i]) || 1;
        const ancho = parseFloat(nuevosAnchos[i]) || 0;
        const alto = parseFloat(nuevosAltos[i]) || 0;
        const precio = parseFloat(nuevosPrecios[i]) || 0;
        const descripcion = (nuevasDescripciones[i] || '').trim();

        // Ignorar filas vacías o sin precio
        if (!material || precio <= 0) continue;

        await db.run(
          'INSERT INTO productos (pedido_id, material, cantidad, ancho, alto, precio, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)',
          id, material, cantidad, ancho, alto, precio, descripcion
        );
        totalItems += precio;
      }

      // Recalcular totales
      const nuevoEntregado = parseFloat(monto_entregado) || pedido.monto_entregado || 0;
      const nuevoRestante  = Math.max(0, totalItems - nuevoEntregado);
      const estadoPago     = nuevoRestante <= 0 ? 'PAGADO' : (nuevoEntregado > 0 ? 'PARCIAL' : 'PENDIENTE');

      await db.run(
        'UPDATE pedidos SET client_id = ?, precio = ?, monto_entregado = ?, monto_restante = ?, medio_pago = ?, estado_pago = ?, fecha_entrega = ? WHERE id = ?',
        client_id, totalItems, nuevoEntregado, nuevoRestante, medio_pago, estadoPago, fecha_entrega || null, id
      );

      req.flash('success', `Pedido #${id} actualizado correctamente`);
      res.redirect(`/pedidos/detalle/${id}`);
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect(`/pedidos/editar/${id}`);
    }
  });

  // POST: eliminar un item del pedido (desde formulario de edición)
  router.post('/editar/:id/eliminar/:item_id', checkPermission, async (req, res) => {
    const { id, item_id } = req.params;
    try {
      await db.run('DELETE FROM productos WHERE id = ? AND pedido_id = ?', item_id, id);
      // Recalcular total del pedido
      const items = await db.all('SELECT precio FROM productos WHERE pedido_id = ?', id);
      const nuevoTotal = items.reduce((s, i) => s + (i.precio || 0), 0);
      const pedido = await db.get('SELECT monto_entregado FROM pedidos WHERE id = ?', id);
      const nuevoRestante = Math.max(0, nuevoTotal - (pedido?.monto_entregado || 0));
      await db.run('UPDATE pedidos SET precio = ?, monto_restante = ? WHERE id = ?', nuevoTotal, nuevoRestante, id);
      req.flash('success', 'Producto eliminado');
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
    }
    res.redirect(`/pedidos/editar/${id}`);
  });

  // 📱 API: Obtener teléfono del cliente para WhatsApp
  router.get('/:id/cliente-phone', async (req, res) => {
    try {
      const pedido = await db.get(
        'SELECT c.phone FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?',
        req.params.id
      );
      res.json({ phone: pedido?.phone || null });
    } catch (err) {
      console.error('Error:', err);
      res.json({ phone: null });
    }
  });

  return router;
};
