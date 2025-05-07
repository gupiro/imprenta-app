// routes/pedidos.js
const express         = require('express');
const router          = express.Router();
const fs              = require('fs');
const sharp           = require('sharp');               // Para procesamiento de imágenes
const db              = require('../database');
const upload          = require('../config/multer');
const checkPermission = require('../middleware/permissions'); // control de permisos
const archiver        = require('archiver');
const path            = require('path');
const pdf             = require('html-pdf');

// Asegurar rutas absolutas en URL-encoded
router.use(express.urlencoded({ extended: false }));

// --- Configuración de directorios de uploads y miniaturas ---
const uploadsDir = path.join(__dirname, '../public/uploads');
const thumbsDir  = path.join(uploadsDir, 'thumbs');
if (!fs.existsSync(thumbsDir)) {
  fs.mkdirSync(thumbsDir, { recursive: true });
}

// 1) Formulario de Nuevo Pedido (view)
// routes/pedidos.js
router.get('/nuevo', checkPermission, (req, res) => {
  const clientes   = db.prepare('SELECT * FROM clients ORDER BY id ASC').all();
  const materiales = db.prepare('SELECT * FROM materials ORDER BY name ASC').all();
  res.render('pedidos/nuevo', {
    title:       'Nuevo Pedido',
    clientes,
    materiales,            // <-- añadimos aquí
    success:     req.flash('success'),
    error:       req.flash('error')
  });
});


// ▶ 2) Crear Nuevo Pedido + Productos (create)
router.post(
  '/nuevo',
  checkPermission,
  upload.any(),
  (req, res) => {
    // 1️⃣ DEBUG: ver qué llega
    console.log('🆕 POST /pedidos/nuevo → body:', req.body, 'files:', req.files);

    // 2️⃣ Destructuring inicial
    const {
      clienteExistente, clienteInput,
      telefonoNuevo,   direccionNuevo,
      cuitNuevo,       emailNuevo,
      precioTotalPedido, monto_entregado, medio_pago,
      cantidad = []
    } = req.body;

    // —— 3️⃣ Obtener o crear cliente —— 
    let clientId = null;

    // a) Si vienen un ID válido (numérico), lo usamos
    if (clienteExistente && clienteExistente !== 'undefined') {
      const maybeId = parseInt(clienteExistente, 10);
      if (!isNaN(maybeId)) {
        clientId = maybeId;
      }
    }

    // b) Si no tenemos ID pero dan nombre, buscamos por nombre
    if (!clientId && clienteInput && clienteInput.trim()) {
      const name = clienteInput.trim();
      // ¿Ya existe un cliente con ese nombre?
      const fila = db.prepare('SELECT id FROM clients WHERE name = ?').get(name);
      if (fila) {
        clientId = fila.id;
      } else {
        // No existe: lo creamos
        const insert = db.prepare(`
          INSERT INTO clients (name, phone, address, cuit, email)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          name,
          telefonoNuevo  || '',
          direccionNuevo || '',
          cuitNuevo      || '',
          emailNuevo     || ''
        );
        clientId = insert.lastInsertRowid;
      }
    }

    // c) Si aún no hay clientId, error
    if (!clientId) {
      req.flash('error','Debés seleccionar o ingresar un cliente.');
      return res.redirect('/pedidos/nuevo');
    }

    // —— 4️⃣ Validar que haya al menos un producto —— 
    const materiales = [].concat(req.body.material || []).filter(Boolean);
    if (materiales.length === 0) {
      req.flash('error','Debés agregar al menos un producto.');
      return res.redirect('/pedidos/nuevo');
    }

    // —— 5️⃣ Crear cabecera de pedido —— 
    const precio    = parseFloat(precioTotalPedido) || 0;
    const entregado = parseFloat(monto_entregado)     || 0;
    const restante  = precio - entregado;
    const fecha     = new Date().toISOString().slice(0,19).replace('T',' ');
    const infoPed   = db.prepare(`
      INSERT INTO pedidos
        (client_id, precio, fecha, estado, monto_entregado, monto_restante, medio_pago)
      VALUES (?, ?, ?, 'PENDIENTE', ?, ?, ?)
    `).run(clientId, precio, fecha, entregado, restante, medio_pago);
    const pedidoId = infoPed.lastInsertRowid;
    console.log('👀 Pedido creado con pedidoId =', pedidoId);

    // —— 6️⃣ Preparar arrays de detalle —— 
    const anchos        = [].concat(req.body.ancho      || []).map(v => parseFloat(v) || 0);
    const altos         = [].concat(req.body.alto       || []).map(v => parseFloat(v) || 0);
    const preciosArr    = [].concat(req.body.precio     || []).map(v => parseFloat(v) || 0);
    const cantidadesArr = [].concat(cantidad             || []).map(v => parseInt(v)       || 1);
    const descripciones = [].concat(req.body.descripcion || []);

    console.log('👀 Insertando productos para pedidoId =', pedidoId, 'materiales=', materiales);

    // —— 7️⃣ Insertar productos uno a uno —— 
    materiales.forEach((mat, i) => {
      const qty = cantidadesArr[i] || 1;
      const imgs = (req.files||[])
        .filter(f => f.fieldname === 'imagen_' + (i+1))
        .map(f => f.filename);

      // Precio total = unitario × cantidad
      const precioUnitario = preciosArr[i] || 0;
      const precioTotal    = precioUnitario * qty;

      db.prepare(`
        INSERT INTO productos
          (pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes)
        VALUES (?, ?, ?, ?, 0, ?, ?, ?)
      `).run(
        pedidoId,
        mat,
        anchos[i],
        altos[i],
        precioTotal,
        descripciones[i] || 'Sin descripción',
        JSON.stringify(imgs)
      );
    });

    req.flash('success','Pedido creado correctamente');
    res.redirect('/pedidos/pendientes');
  }
);


// 3) Listar Pedidos Pendientes (view)
router.get(
  '/pendientes',
  checkPermission,
  (req, res) => {
    const pedidos = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre
        FROM pedidos p
   LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.estado = 'PENDIENTE'
    ORDER BY p.id ASC
    `).all();
    pedidos.forEach(p => {
      const prods = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(p.id);
      p.productos = prods.map(x => ({ ...x, imagenes: JSON.parse(x.imagenes||'[]') }));
    });
    res.render('pedidos/pendientes', {
      title:   'Trabajos Encargados',
      pedidos,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  }
);

// 4) Detalle de un Pedido (view)
router.get('/detalle/:id', checkPermission, (req, res) => {
  const { id } = req.params;

  // ── 1) Marcar comentarios como leídos ─────────────────────────────
  db.prepare('UPDATE revision_comments SET leido = 1 WHERE pedido_id = ?')
    .run(id);
  db.prepare('UPDATE pedidos SET unread_comments = 0 WHERE id = ?')
    .run(id);

  // ── 2) Cargar datos del pedido con nombre de cliente ───────────────
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

  // ── 3) Cargar productos y parsear su JSON de imágenes ─────────────
  const prodsRaw = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(id);
  pedido.productos = prodsRaw.map(p => ({
    ...p,
    imagenes: JSON.parse(p.imagenes || '[]')
  }));

  // ── 4) Cargar comentarios ─────────────────────────────────────────
  const comentarios = db.prepare(`
    SELECT comment, "user", fecha
      FROM revision_comments
     WHERE pedido_id = ?
     ORDER BY fecha ASC
  `).all(id);

  // ── 5) Renderizar la vista ───────────────────────────────────────
  res.render('pedidos/detalle', {
    title:    `Detalle Pedido #${pedido.id}`,
    pedido,
    comentarios,
    success:  req.flash('success'),
    error:    req.flash('error')
  });
});


// 4.1) Agregar comentario de revisión (create)
router.post('/:id/comentar', checkPermission, (req, res) => {
  const { id } = req.params;
  const { comentario } = req.body;
  if (!comentario?.trim()) {
    req.flash('error', 'El comentario no puede estar vacío.');
    return res.redirect(`/pedidos/detalle/${id}`);
  }

  const usuario = req.session.user.username;
  const fecha   = new Date().toISOString();

  // Insertar comentario no leído
  db.prepare(`
    INSERT INTO revision_comments (pedido_id, comment, "user", fecha, leido)
    VALUES (?, ?, ?, ?, 0)
  `).run(id, comentario.trim(), usuario, fecha);

  // Incrementar contador en pedidos
  db.prepare(`
    UPDATE pedidos
       SET unread_comments = unread_comments + 1
     WHERE id = ?
  `).run(id);

  req.flash('success', 'Comentario agregado correctamente.');
  res.redirect('/pedidos/revision');
});


// 7) Listar pedidos EN_REVISIÓN (view)
router.get('/revision', checkPermission, (req, res) => {
  const pedidos = db.prepare(`
    SELECT p.*, c.name AS cliente_nombre
      FROM pedidos p
LEFT JOIN clients c ON p.client_id = c.id
     WHERE p.estado = 'EN_REVISIÓN'
  ORDER BY p.fecha DESC
  `).all();

  pedidos.forEach(p => {
    try { p.archivos = JSON.parse(p.revision_archivo || '[]'); }
    catch { p.archivos = []; }

    // Usamos el campo precalculado
    p.commentCount = p.unread_comments || 0;
  });

  res.render('pedidos/revision', {
    title:   'Pedidos en Revisión',
    pedidos,
    success: req.flash('success'),
    error:   req.flash('error')
  });
});


// 5) Eliminar Pedido (delete)
router.post(
  '/eliminar/:id',
  checkPermission,
  (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM productos WHERE pedido_id = ?').run(id);
    db.prepare('DELETE FROM pedidos  WHERE id = ?').run(id);
    req.flash('success','Pedido eliminado correctamente');
    res.redirect('/pedidos/pendientes');
  }
);

// 6) Edición de Pedido (view & edit)
router.get(
  '/editar/:id',
  checkPermission,
  (req, res) => {
    const { id } = req.params;
    const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
    if (!pedido) return res.redirect('/pedidos/pendientes');
    const clients  = db.prepare('SELECT * FROM clients ORDER BY id ASC').all();
    const prodsRaw = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(id);
    const items    = prodsRaw.map(p => ({ ...p, imagenes: JSON.parse(p.imagenes||'[]') }));
    res.render('pedidos/edit', {
      title:   `Editar Pedido #${id}`,
      pedido, clients, items,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  }
);
router.post(
  '/editar/:id',
  checkPermission,
  upload.any(),
  (req, res) => {
    const { id } = req.params;
    const { client_id, monto_entregado, medio_pago } = req.body;
    // Actualizar cabecera
    db.prepare(`
      UPDATE pedidos
         SET client_id      = ?,
             monto_entregado = ?,
             medio_pago      = ?
       WHERE id = ?
    `).run(client_id, parseFloat(monto_entregado)||0, medio_pago, id);

    // Actualizar items existentes...
    const itemIds = [].concat(req.body.item_id||[]);
    itemIds.forEach(itemId => {
      const ancho   = parseFloat(req.body[`ancho_${itemId}`])||0;
      const alto    = parseFloat(req.body[`alto_${itemId}`])||0;
      const precio  = parseFloat(req.body[`precio_${itemId}`])||0;
      const desc    = req.body[`descripcion_${itemId}`]||'';
      const nuevas  = (req.files||[]).filter(f=>f.fieldname===`file_${itemId}`).map(f=>f.filename);
      const fila    = db.prepare('SELECT imagenes FROM productos WHERE id = ?').get(itemId);
      const antiguas= JSON.parse(fila.imagenes||'[]');
      const todas   = antiguas.concat(nuevas);
      db.prepare(`
        UPDATE productos
           SET ancho      = ?,
               alto       = ?,
               precio     = ?,
               descripcion= ?,
               imagenes   = ?
         WHERE id = ?
      `).run(ancho, alto, precio, desc, JSON.stringify(todas), itemId);
    });

    // Insertar nuevos items...
    const newMat   = [].concat(req.body.new_material||[]);
    const newAncho = [].concat(req.body.new_ancho   ||[]).map(v=>parseFloat(v)||0);
    const newAlto  = [].concat(req.body.new_alto    ||[]).map(v=>parseFloat(v)||0);
    const newDesc  = [].concat(req.body.new_descripcion||[]);
    newMat.forEach((mat,i) => {
      const precio = Math.round(newAncho[i]*newAlto[i]*(mat==='Lona'?13600:mat==='Vinilo'?15400:3000));
      const imgs   = (req.files||[]).filter(f=>f.fieldname===`new_file_${i+1}`).map(f=>f.filename);
      db.prepare(`
        INSERT INTO productos
          (pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes)
        VALUES (?,?,?,?,0,?,?,?)
      `).run(id, mat, newAncho[i], newAlto[i], precio, newDesc[i]||'Sin descripción', JSON.stringify(imgs));
    });

    req.flash('success','Pedido actualizado correctamente');
    res.redirect('/pedidos/pendientes');
  }
);

// ── Descargar imagen con watermark tiled (view) ──
router.get(
  '/revision/descargar/:filename',
  checkPermission,
  async (req, res) => {
    try {
      const { filename } = req.params;
      const imgPath  = path.join(__dirname, '../public/uploads', filename);
      const logoPath = path.join(__dirname, '../public/logo.png');

      console.log(
        '→ watermark:',
        '\n   img  =', imgPath,  'exists?', fs.existsSync(imgPath),
        '\n   logo =', logoPath, 'exists?', fs.existsSync(logoPath)
      );

      const [ imgBuf, logoBuf ] = await Promise.all([
        fs.promises.readFile(imgPath),
        fs.promises.readFile(logoPath)
      ]);

      const imgMeta   = await sharp(imgBuf).metadata();
      const minSide   = Math.min(imgMeta.width, imgMeta.height);
      const logoMeta  = await sharp(logoBuf).metadata();
      const scale     = (minSide/5) / Math.max(logoMeta.width, logoMeta.height);
      const logoW     = Math.floor(logoMeta.width * scale);
      const logoH     = Math.floor(logoMeta.height * scale);
      const logoImg   = await sharp(logoBuf).resize(logoW, logoH).png().toBuffer();

      const composites = [];
      const stepX = logoW * 2;
      const stepY = logoH * 2;
      for (let x = 0; x < imgMeta.width; x += stepX) {
        for (let y = 0; y < imgMeta.height; y += stepY) {
          composites.push({ input: logoImg, left: x, top: y, blend: 'overlay' });
        }
      }

      const outBuf = await sharp(imgBuf)
        .composite(composites)
        .png()
        .toBuffer();

      const base = path.parse(filename).name;
      res.setHeader('Content-Disposition', `attachment; filename="${base}-watermarked.png"`);
      res.setHeader('Content-Type', 'image/png');
      res.send(outBuf);

    } catch (err) {
      console.error('Error al procesar watermark tiled con Sharp:', err);
      res.status(404).send('Imagen no disponible');
    }
  }
);

// 7) Listar pedidos EN_REVISIÓN (view)
router.get(
  '/revision',
  checkPermission,
  (req, res) => {
    const pedidos = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre
        FROM pedidos p
   LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.estado = 'EN_REVISIÓN'
    ORDER BY p.fecha DESC
    `).all();

    pedidos.forEach(p => {
      // parseo de archivos
      try {
        p.archivos = JSON.parse(p.revision_archivo || '[]');
      } catch {
        p.archivos = [];
      }
      // conteo de comentarios
      const row = db.prepare(`
        SELECT COUNT(*) AS cnt
          FROM revision_comments
         WHERE pedido_id = ?
      `).get(p.id);
      p.commentCount = row ? row.cnt : 0;
      // unread_comments ya viene en p.unread_comments
    });

    res.render('pedidos/revision', {
      title:   'Pedidos en Revisión',
      pedidos,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  }
);

// 8) Enviar a revisión (create) – ahora con generación de thumbs
router.post(
  '/enviarRevision/:id',
  checkPermission,
  upload.array('archivosRevision'),
  async (req, res) => {
    const { id } = req.params;
    if (!req.files.length) {
      req.flash('error','Debes adjuntar al menos un archivo.');
      return res.redirect(`/pedidos/detalle/${id}`);
    }

    // 1) Guardar nombres en la BD
    const nombres = req.files.map(f => f.filename);
    db.prepare('UPDATE pedidos SET estado=?, revision_archivo=? WHERE id=?')
      .run('EN_REVISIÓN', JSON.stringify(nombres), id);

    // 2) Crear miniaturas con Sharp
    const uploadsDir = path.join(__dirname, '../public/uploads');
    const thumbsDir  = path.join(uploadsDir, 'thumbs');
    for (const file of req.files) {
      const inputPath  = path.join(uploadsDir, file.filename);
      const outputPath = path.join(thumbsDir,  file.filename);
      try {
        await sharp(inputPath)
          .resize({ width: 300 })      // ancho de la thumb
          .toFile(outputPath);
      } catch (err) {
        console.error('Error al generar thumb de', file.filename, err);
      }
    }

    req.flash('success','Archivos enviados a revisión correctamente');
    res.redirect(`/pedidos/detalle/${id}`);
  }
);


// 9) Eliminar archivo de Revisión (edit)
router.post(
  '/revision/:id/eliminarArchivo/:idx',
  checkPermission,
  (req, res) => {
    const { id, idx } = req.params;
    const row = db.prepare('SELECT revision_archivo FROM pedidos WHERE id = ?').get(id);
    let arr = [];
    try { arr = JSON.parse(row.revision_archivo||'[]'); } catch{}
    arr.splice(Number(idx), 1);
    db.prepare('UPDATE pedidos SET revision_archivo = ? WHERE id = ?')
      .run(JSON.stringify(arr), id);
    req.flash('success','Archivo eliminado');
    res.redirect('/pedidos/revision');
  }
);

// 10) Marcar para imprimir (edit)
router.post(
  '/imprimir/:id',
  checkPermission,
  (req, res) => {
    db.prepare("UPDATE pedidos SET estado='LISTO_IMPRESION' WHERE id=?")
      .run(req.params.id);
    req.flash('success','Pedido marcado para impresión');
    res.redirect('/pedidos/pendientes');
  }
);

// 11) Listos para impresión (view)
router.get(
  '/impresiones',
  checkPermission,
  (req, res) => {
    const pedidos = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre
        FROM pedidos p
   LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.estado = 'LISTO_IMPRESION'
    ORDER BY p.fecha DESC
    `).all();
    pedidos.forEach(p=>{
      try { p.archivos = JSON.parse(p.revision_archivo||'[]'); } catch{ p.archivos=[]; }
      const prods = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(p.id);
      p.productos = prods.map(x=>({ ...x, imagenes: JSON.parse(x.imagenes||'[]')}));
    });
    res.render('pedidos/impresiones', {
      title:   'Pedidos Listos para Impresión',
      pedidos,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  }
);

// 12) Marcar como TERMINADO (edit)
router.post(
  '/terminar/:id',
  checkPermission,
  (req, res) => {
    db.prepare("UPDATE pedidos SET estado='TERMINADO' WHERE id=?")
      .run(req.params.id);
    req.flash('success','Pedido marcado como terminado');
    res.redirect('/pedidos/impresiones');
  }
);

// 13) Ver TERMINADOS (view)
router.get(
  '/terminados',
  checkPermission,
  (req, res) => {
    const pedidos = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre, c.phone AS telefono
        FROM pedidos p
   LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.estado = 'TERMINADO'
    ORDER BY p.fecha DESC
    `).all();
    pedidos.forEach(p=>{
      try {
        const arr = JSON.parse(p.revision_archivo||'[]');
        p.imagen = arr.find(fn=>/\.(jpg|jpeg|png|gif)$/i.test(fn))||null;
      } catch{ p.imagen=null; }
      const prods = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(p.id);
      const pr    = prods[0]||{};
      p.material       = pr.material       || 'Sin especificar';
      p.descripcion    = pr.descripcion    || 'Sin descripción';
      p.monto_restante = p.monto_restante  || 0;
    });
    res.render('pedidos/terminados', {
      title:   'Trabajos Terminados',
      pedidos,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  }
);
// GET ­– Formulario para completar el pago del saldo pendiente
router.get('/:id/completar-pago', checkPermission, (req, res) => {
  const { id } = req.params;
  // Traer pedido con saldo pendiente
  const pedido = db.prepare(`
    SELECT p.*, c.name AS cliente_nombre
      FROM pedidos p
 LEFT JOIN clients c ON p.client_id = c.id
     WHERE p.id = ?
  `).get(id);

  if (!pedido) {
    req.flash('error', 'Pedido no encontrado.');
    return res.redirect('/pedidos/entregados');
  }

  res.render('pedidos/completar-pago', {
    title:      `Pagar saldo Pedido #${id}`,
    pedido,
    error:      req.flash('error'),
    success:    req.flash('success')
  });
});
// POST ­– Procesar el pago parcial o total del saldo
router.post('/:id/completar-pago', checkPermission, (req, res) => {
  const { id } = req.params;
  const monto = parseFloat(req.body.monto_extra) || 0;
  const medio = req.body.forma_pago;  // aquí recibimos 'forma_pago' del formulario
  if (monto <= 0) {
    req.flash('error', 'Ingresa un monto válido.');
    return res.redirect(`/pedidos/${id}/completar-pago`);
  }

  // Traer datos actuales del pedido
  const pedido = db.prepare('SELECT precio, monto_entregado FROM pedidos WHERE id = ?').get(id);
  if (!pedido) {
    req.flash('error', 'Pedido no encontrado.');
    return res.redirect('/pedidos/entregados');
  }

  const nuevoEntregado = (pedido.monto_entregado || 0) + monto;
  const nuevoRestante  = (pedido.precio || 0) - nuevoEntregado;
  const fecha_pago     = new Date().toISOString().slice(0, 19).replace('T',' ');

  // Actualizar montos y, si llega a 0, marcar PAGADO y ENTREGADO
  db.prepare(`
    UPDATE pedidos
       SET monto_entregado = ?,
           monto_restante  = ?,
           medio_pago      = ?,            -- cambiamos aquí
           fecha_pago      = ?,
           estado_pago     = CASE WHEN ? <= 0 THEN 'PAGADO' ELSE estado_pago END,
           estado          = CASE WHEN ? <= 0 THEN 'ENTREGADO' ELSE estado END
     WHERE id = ?
  `).run(
    nuevoEntregado,
    nuevoRestante,
    medio,           // usar medio_pago
    fecha_pago,
    nuevoRestante,
    nuevoRestante,
    id
  );

  req.flash('success','Pago registrado correctamente.');
  res.redirect('/pedidos/entregados');
});

// 14) Marcar como PAGADO (mover a ENTREGADOS)
router.post('/:id/pagar', checkPermission, (req, res) => {
  const { id }        = req.params;
  const medio         = req.body.forma_pago;  // recibimos forma_pago
  const fecha_pago    = new Date().toISOString().slice(0,19).replace('T',' ');

  db.prepare(`
    UPDATE pedidos
       SET estado_pago = 'PAGADO',
           medio_pago   = ?,            -- aquí también
           fecha_pago   = ?,
           estado       = 'ENTREGADO'
     WHERE id = ?
  `).run(medio, fecha_pago, id);

  req.flash('success', 'Pedido marcado como pagado y movido a entregados.');
  res.redirect('/pedidos/entregados');
});



// 15) Marcar como ENTREGADO (edit)
router.post(
  '/:id/entregar',
  checkPermission,
  (req, res) => {
    const { id } = req.params;
    const extra  = parseFloat(req.body.monto_extra)||0;
    const pedido = db.prepare('SELECT monto_entregado, precio FROM pedidos WHERE id = ?').get(id);
    if (!pedido) {
      req.flash('error','Pedido no encontrado');
      return res.redirect('/pedidos/terminados');
    }
    const nuevoEnt = (pedido.monto_entregado||0) + extra;
    const nuevoSal = (pedido.precio||0) - nuevoEnt;
    const fechaEnt = new Date().toISOString().slice(0,19).replace('T',' ');
    db.prepare(`
      UPDATE pedidos
         SET estado='ENTREGADO', monto_entregado=?, monto_restante=?, fecha_entrega=?
       WHERE id=?
    `).run(nuevoEnt, nuevoSal, fechaEnt, id);
    req.flash('success','Pedido entregado');
    res.redirect('/pedidos/entregados');
  }
);

// 16) Ver ENTREGADOS (view)
router.get(
  '/entregados',
  checkPermission,
  (req, res) => {
    const pedidos = db.prepare(`
      SELECT p.*, c.name AS cliente_nombre, c.phone, c.email
        FROM pedidos p
   LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.estado = 'ENTREGADO'
    ORDER BY p.fecha_entrega DESC
    `).all();
    pedidos.forEach(p=>{
      try {
        p.imagen = JSON.parse(p.revision_archivo||'[]')
          .find(fn=>/\.(jpg|jpeg|png|gif)$/i.test(fn))||null;
      } catch{ p.imagen=null; }
      const prods = db.prepare('SELECT * FROM productos WHERE pedido_id = ?').all(p.id);
      p.productos = prods.map(pr=>({ ...pr, imagenes: JSON.parse(pr.imagenes||'[]') }));
    });
    res.render('pedidos/entregados', {
      title:   'Trabajos Entregados',
      pedidos,
      success: req.flash('success'),
      error:   req.flash('error')
    });
  }
);

// routes/pedidos.js

// … otras importaciones …
// 17) Historial de Pedidos (view) con fecha por defecto
router.get('/historial', checkPermission, (req, res) => {
  // 1) Tomamos start/end y los forzamos a hoy si faltan
  let { start, end } = req.query;
  const hoy = new Date().toISOString().slice(0,10);
  start = start || hoy;
  end   = end   || hoy;

  // 2) Montamos la consulta con esos valores
  let sql = `
    SELECT p.*, c.name AS cliente_nombre
      FROM pedidos p
 LEFT JOIN clients c ON p.client_id = c.id
     WHERE p.estado IN ('TERMINADO','ENTREGADO')
  `;
  const params = [];
  sql += ' AND DATE(p.fecha_pago) BETWEEN ? AND ?';
  params.push(start, end);
  sql += ' ORDER BY p.fecha_pago DESC';

  // 3) Ejecutamos y cargamos miniaturas y productos
  const pedidos = db.prepare(sql).all(...params);
  pedidos.forEach(pedido => {
    try {
      const files = JSON.parse(pedido.revision_archivo || '[]');
      pedido.imagen = files.find(fn=>/\.(jpg|jpeg|png|gif)$/i.test(fn)) || null;
    } catch { pedido.imagen = null; }
    pedido.productos = db.prepare(`
      SELECT material, ancho, alto
        FROM productos
       WHERE pedido_id = ?
    `).all(pedido.id);
  });

  // 4) Total de hoy (no cambia)
  const totalDia = pedidos
    .filter(p => p.fecha_pago.startsWith(hoy))
    .reduce((sum,p) => sum + (p.precio||0), 0);

  // 5) Render con start/end ya con hoy por defecto
  res.render('pedidos/historial', {
    title:    'Historial de Trabajos',
    pedidos,
    totalDia,
    start, end,
    success:  req.flash('success'),
    error:    req.flash('error')
  });
});


// 17.b) Exportar PDF del historial filtrado
router.get('/historial/pdf', checkPermission, (req, res) => {
  // 1) Fecha por defecto = hoy
  let { start, end } = req.query;
  const hoy = new Date().toISOString().slice(0,10);
  start = start || hoy;
  end   = end   || hoy;

  // 2) Consulta con BETWEEN
  let sql = `
    SELECT p.*, c.name AS cliente_nombre
      FROM pedidos p
 LEFT JOIN clients c ON p.client_id = c.id
     WHERE p.estado IN ('TERMINADO','ENTREGADO')
  `;
  const params = [];
  sql += ' AND DATE(p.fecha_pago) BETWEEN ? AND ?';
  params.push(start, end);
  sql += ' ORDER BY p.fecha_pago DESC';

  const pedidos = db.prepare(sql).all(...params);

  // 3) Inyectar miniatura y productos
  pedidos.forEach(pedido => {
    try {
      const files = JSON.parse(pedido.revision_archivo || '[]');
      pedido.imagen = files.find(fn => /\.(jpg|jpeg|png|gif)$/i.test(fn)) || null;
    } catch {
      pedido.imagen = null;
    }
    pedido.productos = db.prepare(`
      SELECT material, ancho, alto
        FROM productos
       WHERE pedido_id = ?
    `).all(pedido.id);
  });

  // 4) Render a HTML y luego a PDF
  res.render('pedidos/historial-pdf', { pedidos, start, end }, (err, html) => {
    if (err) return res.status(500).send('Error renderizando PDF');

    // Asegura rutas correctas en Windows
    const basePath = path.resolve(__dirname, '../public').replace(/\\/g, '/');

    pdf.create(html, {
      format: 'A4',
      border: { top: '20mm', right: '10mm', bottom: '10mm', left: '10mm' },
      base: 'file://' + basePath + '/'
    }).toStream((err, stream) => {
      if (err) return res.status(500).send('Error generando PDF');
      res.setHeader('Content-Type', 'application/pdf');
      stream.pipe(res);
    });
  });
});


module.exports = router;
