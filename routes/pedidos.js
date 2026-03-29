const express = require('express');
const fs = require('fs');
const sharp = require('sharp');
const upload = require('../config/multer');
const checkPermission = require('../middleware/permissions');
const path = require('path');
const pdf = require('html-pdf');
const { obtenerFechaLocal, turnoByHora } = require('../utils/dateHelper');

module.exports = (db) => {
  const router = express.Router();
  // Configuración de directorios
  const uploadsDir = path.join(__dirname, '../public/uploads');
  const thumbsDir = path.join(uploadsDir, 'thumbs');
  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  // ==================== FUNCIONES AUXILIARES ====================

  // Función para obtener pedidos con filtrado, búsqueda y ordenamiento
  async function obtenerPedidosFiltrados(estado = '', search = '', sortBy = 'fecha', sortDir = 'desc', mes = '', deuda = '', hoy = '', estadoFiltro = '') {
    let query = 'SELECT p.*, c.name AS cliente_nombre, c.phone AS cliente_phone, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE 1=1';
    const params = [];

    if (estado) {
      query += ' AND p.estado = ?';
      params.push(estado);
    }

    if (estadoFiltro) {
      query += ' AND p.estado = ?';
      params.push(estadoFiltro);
    }

    // Filtro de búsqueda
    if (search.trim()) {
      const searchTerm = `%${search}%`;
      query += ' AND (p.id LIKE ? OR c.name LIKE ? OR p.detalle LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Filtro de mes (formato: YYYY-MM)
    if (mes && /^\d{4}-\d{2}$/.test(mes)) {
      query += ` AND SUBSTR(p.fecha, 1, 7) = ?`;
      params.push(mes);
    }

    // Filtro de deuda
    if (deuda === 'con') {
      query += ' AND (p.monto_restante > 0)';
    } else if (deuda === 'sin') {
      query += ' AND (p.monto_restante <= 0)';
    }

    // Filtro para hoy por fecha de entrega
    if (hoy === '1') {
      query += " AND DATE(p.fecha_entrega) = DATE('now','localtime')";
    }

    // Ordenamiento
    const columnasPermitidas = {
      'fecha': 'p.fecha',
      'fecha_entrega': 'p.fecha_entrega',
      'cliente': 'c.name',
      'monto': 'p.precio',
      'deuda': 'p.monto_restante',
      'estado': 'p.estado',
      'id': 'p.id',
      'responsable': 'u.username'
    };
    const columnaSQL = columnasPermitidas[sortBy] || 'p.fecha';
    const direccion = sortDir === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${columnaSQL} ${direccion}`;

    const pedidos = await db.all(query, params);

    // ✅ OPTIMIZADO: Cargar todos los productos en 1 query (no N queries)
    if (pedidos.length > 0) {
      const pedidoIds = pedidos.map(p => p.id);
      const todosProds = await db.all(
        `SELECT * FROM productos WHERE pedido_id IN (${pedidoIds.map(() => '?').join(',')})`,
        pedidoIds
      );

      // Agrupar productos por pedido_id
      const prodsByPedido = {};
      todosProds.forEach(prod => {
        if (!prodsByPedido[prod.pedido_id]) {
          prodsByPedido[prod.pedido_id] = [];
        }
        prodsByPedido[prod.pedido_id].push(prod);
      });

      // Asignar productos a cada pedido
      pedidos.forEach(p => {
        const prods = prodsByPedido[p.id] || [];
        p.productos = prods.map(x => ({ ...x, imagenes: JSON.parse(x.imagenes || '[]') }));
      });
    } else {
      pedidos.forEach(p => { p.productos = []; });
    }

    return pedidos;
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
        csrfToken: req.csrfToken ? req.csrfToken() : '', // CSRF puede estar desactivado
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error al cargar nuevo pedido:', err);
      res.status(500).send('Error al cargar');
    }
  });

  // 2) Crear Nuevo Pedido (POST)
  router.post('/nuevo', checkPermission, upload.any(), async (req, res) => {
    try {
      const { clienteExistente, clienteInput, telefonoNuevo, direccionNuevo, cuitNuevo, emailNuevo, precioTotalPedido, monto_entregado, medio_pago, fecha_entrega, detalle } = req.body;
      const presupuestoId = req.body.presupuesto_id || null;

      if (!detalle || !detalle.trim()) {
        req.flash('error', 'El detalle del trabajo es obligatorio.');
        return res.redirect('/pedidos/nuevo');
      }

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
          const insert = await db.run('INSERT INTO clients (name, phone, address, cuit, email) VALUES (?, ?, ?, ?, ?)', [name, telefonoNuevo || '', direccionNuevo || '', cuitNuevo || '', emailNuevo || '']);
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

      const infoPed = await db.run('INSERT INTO pedidos (client_id, precio, fecha, estado, monto_entregado, monto_restante, medio_pago, presupuesto_id, fecha_entrega, detalle, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [clientId, precio, fecha, 'PENDIENTE', entregado, restante, medio_pago, presupuestoId, fecha_entrega || null, detalle.trim(), usuarioId]);
      const pedidoId = infoPed.lastID;

      // 💰 REGISTRAR ADELANTO EN CAJA DIARIA (si hay monto adelantado)
      if (entregado > 0) {
        const nombreCliente = clienteInput || (clienteExistente ? 'Cliente' : 'Cliente');
        const concepto = `Adelanto Pedido #${pedidoId} - ${nombreCliente}`;
        await db.run('INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, pedido_id, turno, fecha, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ['ingreso', concepto, 'Ventas - Adelanto', entregado, medio_pago || 'Efectivo', pedidoId, turnoByHora(), fecha, usuarioId]);
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
        await db.run('INSERT INTO productos (pedido_id, material, ancho, alto, cantidad, descuento, precio, descripcion, imagenes) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)', [pedidoId, mat, anchos[i], altos[i], cantidad, precioFinal, descripciones[i] || 'Sin descripción', JSON.stringify(imgs)]);
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
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'fecha';
      const sortDir = req.query.sortDir || 'desc';
      const view = req.query.view || 'cards'; // cards, tabla, lista
      const deuda = req.query.deuda || '';
      const hoy = req.query.hoy || '';
      const estadoFiltro = req.query.estado || '';

      const pedidos = await obtenerPedidosFiltrados('PENDIENTE', search, sortBy, sortDir, '', deuda, hoy, estadoFiltro);

      // Contar pedidos por estado
      const countsRaw = await db.all("SELECT estado, COUNT(*) as c FROM pedidos GROUP BY estado");
      const estadoCounts = {};
      countsRaw.forEach(r => { estadoCounts[r.estado] = r.c; });

      res.render('pedidos/pendientes', {
        title: 'Trabajos Encargados',
        pedidos,
        estadoCounts,
        estadoActual: 'PENDIENTE',
        search,
        sortBy,
        sortDir,
        view,
        deuda,
        hoy,
        estado: estadoFiltro,
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

      await db.run('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, pedidoId]);

      const estadoEmojis = {
        'PENDIENTE': '📋 PENDIENTE',
        'EN_PRODUCCION': '⚙️ EN PRODUCCIÓN',
        'LISTO': '✅ LISTO',
        'ENTREGADO': '🎉 ENTREGADO',
        'CANCELADO': '❌ CANCELADO'
      };

      const msgSuccess = `✅ Pedido #${pedidoId} movido a ${estadoEmojis[estado] || estado}`;
      req.flash('success', msgSuccess);

      // Redirect inteligente: si viene de un listado, redirigir al listado del nuevo estado
      const rutas = {
        PENDIENTE: '/pedidos/pendientes',
        EN_PRODUCCION: '/pedidos/en-produccion',
        LISTO: '/pedidos/listos',
        ENTREGADO: '/pedidos/entregados',
        CANCELADO: '/pedidos/detalle/' + pedidoId
      };
      const referer = req.get('Referer') || '';
      const fromList = /\/pedidos\/(pendientes|en-produccion|listos|entregados)/.test(referer);
      res.redirect(fromList ? (rutas[estado] || `/pedidos/detalle/${pedidoId}`) : `/pedidos/detalle/${pedidoId}`);
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
      await db.run('UPDATE revision_comments SET leido = 1 WHERE pedido_id = ?', [id]);
      await db.run('UPDATE pedidos SET unread_comments = 0 WHERE id = ?', [id]);

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
      const isJSON = req.is('application/json');

      const pedido = await db.get('SELECT p.*, c.name AS cliente_nombre, u.username FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN users u ON p.usuario_id = u.id WHERE p.id = ?', id);

      if (!pedido) {
        if (isJSON) return res.status(404).json({ ok: false, error: 'Pedido no encontrado' });
        req.flash('error', 'Pedido no encontrado');
        return res.redirect('/pedidos');
      }

      const monto = parseFloat(monto_a_pagar);
      if (isNaN(monto) || monto <= 0) {
        if (isJSON) return res.status(400).json({ ok: false, error: 'Monto inválido' });
        req.flash('error', 'Monto inválido');
        return res.redirect(`/pedidos/detalle/${id}`);
      }

      const saldo_actual = (pedido.precio || 0) - (pedido.monto_entregado || 0);
      if (monto > saldo_actual + 0.01) {
        const errMsg = `Monto mayor que la deuda. Saldo: $${saldo_actual.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        if (isJSON) return res.status(400).json({ ok: false, error: errMsg });
        req.flash('error', errMsg);
        return res.redirect(`/pedidos/detalle/${id}`);
      }

      const nuevo_entregado = (pedido.monto_entregado || 0) + monto;
      const nuevo_saldo = Math.max(0, (pedido.precio || 0) - nuevo_entregado);
      const { timestamp: fecha_ahora } = obtenerFechaLocal();

      await db.run('UPDATE pedidos SET monto_entregado = ?, monto_restante = ?, fecha_pago = ?, medio_pago = ?, estado_pago = CASE WHEN ? <= 0.01 THEN "PAGADO" ELSE "PARCIAL" END WHERE id = ?', [nuevo_entregado, nuevo_saldo, fecha_ahora, metodo_pago || 'Efectivo', nuevo_saldo, id]);

      const concepto = `Pago Pedido #${id} - ${pedido.cliente_nombre}`;
      await db.run('INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, turno, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)', ['ingreso', concepto, 'Ventas - Pago de Pedido', monto, metodo_pago || 'Efectivo', turnoByHora(), fecha_ahora]);

      const msgSuccess = `✅ Deuda cancelada. $${monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })} registrado en caja diaria.`;

      if (isJSON) {
        return res.json({ ok: true, message: msgSuccess });
      }

      req.flash('success', msgSuccess);
      res.redirect(`/pedidos/detalle/${id}`);

    } catch (err) {
      console.error('Error al cancelar deuda:', err);
      if (req.is('application/json')) {
        return res.status(500).json({ ok: false, error: 'Error al cancelar deuda: ' + err.message });
      }
      req.flash('error', 'Error al cancelar deuda: ' + err.message);
      res.redirect(`/pedidos/detalle/${id}`);
    }
  });

  // 6) Eliminar
  router.post('/eliminar/:id', checkPermission, async (req, res) => {
    try {
      const { id } = req.params;
      await db.run('DELETE FROM productos WHERE pedido_id = ?', [id]);
      await db.run('DELETE FROM pedidos WHERE id = ?', [id]);
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

      await db.run('UPDATE pedidos SET monto_entregado = ?, monto_restante = ?, medio_pago = ?, fecha_pago = ?, estado_pago = CASE WHEN ? <= 0 THEN "PAGADO" ELSE estado_pago END, estado = CASE WHEN ? <= 0 THEN "ENTREGADO" ELSE estado END WHERE id = ?', [nuevoEntregado, nuevoRestante, medio, fecha_pago, nuevoRestante, nuevoRestante, id]);

      // 💰 REGISTRAR PAGO EN CAJA DIARIA
      const cliente = await db.get('SELECT name FROM clients WHERE id = ?', [pedido.client_id]);
      const concepto = `Pago Pedido #${id} - ${cliente?.name || 'Cliente'}`;
      await db.run('INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, pedido_id, turno, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['ingreso', concepto, 'Ventas - Pago de Pedido', monto, medio || 'Efectivo', id, turnoByHora(), fecha_pago]);

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
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'fecha';
      const sortDir = req.query.sortDir || 'desc';
      const view = req.query.view || 'cards';
      const deuda = req.query.deuda || '';
      const hoy = req.query.hoy || '';
      const estadoFiltro = req.query.estado || '';

      const pedidos = await obtenerPedidosFiltrados('EN_PRODUCCION', search, sortBy, sortDir, '', deuda, hoy, estadoFiltro);

      // Contar pedidos por estado
      const countsRaw = await db.all("SELECT estado, COUNT(*) as c FROM pedidos GROUP BY estado");
      const estadoCounts = {};
      countsRaw.forEach(r => { estadoCounts[r.estado] = r.c; });

      res.render('pedidos/en-produccion', {
        title: 'Trabajos en Producción',
        pedidos,
        estadoCounts,
        estadoActual: 'EN_PRODUCCION',
        search,
        sortBy,
        sortDir,
        view,
        deuda,
        hoy,
        estado: estadoFiltro,
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
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'fecha';
      const sortDir = req.query.sortDir || 'desc';
      const view = req.query.view || 'cards';
      const deuda = req.query.deuda || '';
      const hoy = req.query.hoy || '';
      const estadoFiltro = req.query.estado || '';

      const pedidos = await obtenerPedidosFiltrados('LISTO', search, sortBy, sortDir, '', deuda, hoy, estadoFiltro);

      // Contar pedidos por estado
      const countsRaw = await db.all("SELECT estado, COUNT(*) as c FROM pedidos GROUP BY estado");
      const estadoCounts = {};
      countsRaw.forEach(r => { estadoCounts[r.estado] = r.c; });

      res.render('pedidos/listos', {
        title: 'Trabajos Listos para Entregar',
        pedidos,
        estadoCounts,
        estadoActual: 'LISTO',
        search,
        sortBy,
        sortDir,
        view,
        deuda,
        hoy,
        estado: estadoFiltro,
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
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'fecha';
      const sortDir = req.query.sortDir || 'desc';
      const view = req.query.view || 'cards';
      const groupBy = req.query.groupBy || 'none'; // none, semana
      const deuda = req.query.deuda || '';
      const hoy = req.query.hoy || '';
      const estadoFiltro = req.query.estado || '';

      // Filtro de mes: por defecto mes actual
      let mes = req.query.mes || '';
      if (!mes) {
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
        const año = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        mes = `${año}-${m}`;
      }

      const pedidos = await obtenerPedidosFiltrados('ENTREGADO', search, sortBy, sortDir, mes, deuda, hoy, estadoFiltro);

      // Función auxiliar para obtener número de semana
      function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      }

      // Agrupar si está solicitado
      let pedidosAgrupados = pedidos;
      if (groupBy === 'semana') {
        const grupos = {};
        pedidos.forEach(p => {
          const fecha = new Date(p.fecha);
          const semana = getWeekNumber(fecha);
          const año = fecha.getFullYear();
          const key = `${año}-S${String(semana).padStart(2, '0')}`;

          if (!grupos[key]) {
            grupos[key] = {
              label: `Semana ${semana} de ${año}`,
              fecha: fecha,
              pedidos: []
            };
          }
          grupos[key].pedidos.push(p);
        });

        // Ordenar grupos por fecha
        pedidosAgrupados = Object.values(grupos).sort((a, b) => b.fecha - a.fecha);
      }

      // Contar pedidos por estado
      const countsRaw = await db.all("SELECT estado, COUNT(*) as c FROM pedidos GROUP BY estado");
      const estadoCounts = {};
      countsRaw.forEach(r => { estadoCounts[r.estado] = r.c; });

      res.render('pedidos/entregados', {
        title: 'Trabajos Entregados',
        pedidos,
        pedidosAgrupados,
        estadoCounts,
        estadoActual: 'ENTREGADO',
        search,
        sortBy,
        sortDir,
        view,
        groupBy,
        mes,
        deuda,
        hoy,
        estado: estadoFiltro,
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
          'INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, pedido_id, turno, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['egreso', concepto, 'Devoluciones', pedido.monto_entregado, pedido.medio_pago || 'Efectivo', pedidoId, turnoByHora(), fecha_ahora]
        );
      }

      // Cambiar estado a CANCELADO
      await db.run('UPDATE pedidos SET estado = "CANCELADO" WHERE id = ?', [pedidoId]);

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
        const ancho    = parseFloat(req.body[`ancho_${itemId}`])    || 0;
        const alto     = parseFloat(req.body[`alto_${itemId}`])     || 0;
        const cantidad = parseFloat(req.body[`cantidad_${itemId}`]) || 1;
        const precio   = parseFloat(req.body[`precio_${itemId}`])   || 0;
        const desc     = req.body[`descripcion_${itemId}`] || '';
        totalItems += precio;
        await db.run(
          'UPDATE productos SET ancho = ?, alto = ?, cantidad = ?, precio = ?, descripcion = ? WHERE id = ? AND pedido_id = ?',
          [ancho, alto, cantidad, precio, desc, itemId, id]
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
          [id, material, cantidad, ancho, alto, precio, descripcion]
        );
        totalItems += precio;
      }

      // Recalcular totales
      const nuevoEntregado = parseFloat(monto_entregado) || pedido.monto_entregado || 0;
      const nuevoRestante  = Math.max(0, totalItems - nuevoEntregado);
      const estadoPago     = nuevoRestante <= 0 ? 'PAGADO' : (nuevoEntregado > 0 ? 'PARCIAL' : 'PENDIENTE');

      await db.run(
        'UPDATE pedidos SET client_id = ?, precio = ?, monto_entregado = ?, monto_restante = ?, medio_pago = ?, estado_pago = ?, fecha_entrega = ? WHERE id = ?',
        [client_id, totalItems, nuevoEntregado, nuevoRestante, medio_pago, estadoPago, fecha_entrega || null, id]
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
      await db.run('DELETE FROM productos WHERE id = ? AND pedido_id = ?', [item_id, id]);
      // Recalcular total del pedido
      const items = await db.all('SELECT precio FROM productos WHERE pedido_id = ?', id);
      const nuevoTotal = items.reduce((s, i) => s + (i.precio || 0), 0);
      const pedido = await db.get('SELECT monto_entregado FROM pedidos WHERE id = ?', id);
      const nuevoRestante = Math.max(0, nuevoTotal - (pedido?.monto_entregado || 0));
      await db.run('UPDATE pedidos SET precio = ?, monto_restante = ? WHERE id = ?', [nuevoTotal, nuevoRestante, id]);
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

  // 📊 VISTA RÁPIDA - Resumen de todos los estados
  router.get('/vista-rapida', checkPermission, async (req, res) => {
    try {
      const estados = ['PENDIENTE', 'EN_PRODUCCION', 'LISTO', 'ENTREGADO'];
      const resumen = {};

      for (const estado of estados) {
        const result = await db.all(
          `SELECT p.*, c.name FROM pedidos p
           LEFT JOIN clients c ON p.client_id = c.id
           WHERE p.estado = ?
           ORDER BY p.fecha DESC LIMIT 10`,
          estado
        );
        resumen[estado] = result || [];
      }

      res.render('pedidos/vista-rapida', {
        title: 'Vista Rápida de Pedidos',
        resumen
      });
    } catch (err) {
      console.error('Error vista-rapida:', err);
      req.flash('error', 'Error al cargar vista rápida');
      res.redirect('/pedidos');
    }
  });

  return router;
};
