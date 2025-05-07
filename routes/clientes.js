// routes/clientes.js
const express           = require('express');
const router            = express.Router();
const db                = require('../database');
const checkPermission   = require('../middleware/permissions'); // ← Añadido

// ▶ Búsqueda por nombre (JSON) para autocompletar
router.get('/search', checkPermission, (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const rows = db
    .prepare('SELECT id, name FROM clients WHERE name LIKE ? ORDER BY name LIMIT 10')
    .all(q);
  res.json(rows);
});

// ▶ Listar Clientes
router.get('/', checkPermission, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY id ASC').all();
  res.render('clientes/list', {
    title:   'Clientes',
    clients,
    success: req.flash('success'),
    error:   req.flash('error')
  });
});

// ▶ Formulario Nuevo Cliente (GET)
router.get('/nuevo', checkPermission, (req, res) => {
  res.render('clientes/form', {
    title:   'Nuevo Cliente',
    client:  {},               // objeto vacío para el form
    success: req.flash('success'),
    error:   req.flash('error')
  });
});

// ▶ Procesar Nuevo Cliente (POST)
router.post('/nuevo', checkPermission, (req, res) => {
  const { name, address, phone, email, cuit } = req.body;

  if (!name.trim()) {
    req.flash('error', 'El nombre del cliente es obligatorio.');
    return res.redirect('/clientes/nuevo');
  }

  db.prepare(`
    INSERT INTO clients (name, address, phone, email, cuit)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), address || '', phone || '', email || '', cuit || '');

  req.flash('success', 'Cliente creado exitosamente.');
  res.redirect('/clientes');
});

// ▶ Formulario Editar Cliente (GET)
router.get('/editar/:id', checkPermission, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) {
    req.flash('error', 'Cliente no encontrado.');
    return res.redirect('/clientes');
  }

  res.render('clientes/form', {
    title:   'Editar Cliente',
    client,
    success: req.flash('success'),
    error:   req.flash('error')
  });
});

// ▶ Procesar Edición de Cliente (POST)
router.post('/editar/:id', checkPermission, (req, res) => {
  const { name, address, phone, email, cuit } = req.body;

  if (!name.trim()) {
    req.flash('error', 'El nombre del cliente es obligatorio.');
    return res.redirect(`/clientes/editar/${req.params.id}`);
  }

  db.prepare(`
    UPDATE clients
       SET name    = ?,
           address = ?,
           phone   = ?,
           email   = ?,
           cuit    = ?
     WHERE id = ?
  `).run(
    name.trim(),
    address || '',
    phone   || '',
    email   || '',
    cuit    || '',
    req.params.id
  );

  req.flash('success', 'Cliente actualizado.');
  res.redirect('/clientes');
});

// ▶ Eliminar Cliente con verificación de contraseña
router.post('/eliminar/:id', (req, res) => {
  const claveCorrecta = 'admin'; // Cambia esto por tu clave real
  const { clave } = req.body;

  if (clave !== claveCorrecta) {
    req.flash('error', 'Clave incorrecta. No se eliminó el cliente.');
    return res.redirect('/clientes');
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  req.flash('success', 'Cliente eliminado correctamente.');
  res.redirect('/clientes');
});


// ▶ Historial de pedidos de un cliente
router.get('/:id/historial', checkPermission, (req, res) => {
  const { id } = req.params;
  // 1) Obtenemos cliente
  const cliente = db
    .prepare('SELECT * FROM clients WHERE id = ?')
    .get(id);
  if (!cliente) {
    req.flash('error','Cliente no encontrado');
    return res.redirect('/clientes');
  }
  // 2) Obtenemos sus pedidos
  const pedidos = db.prepare(`
    SELECT p.id, p.fecha, p.precio
      FROM pedidos p
     WHERE p.client_id = ?
  ORDER BY p.fecha DESC
  `).all(id);
  // 3) Para cada pedido cargamos sus productos
  pedidos.forEach(p => {
    p.productos = db.prepare(`
      SELECT material, ancho, alto
        FROM productos
       WHERE pedido_id = ?
    `).all(p.id);
  });
  // 4) Renderizamos la vista
  res.render('clientes/historial', {
    title:    `Historial de ${cliente.name}`,
    cliente,
    pedidos,
    success:  req.flash('success'),
    error:    req.flash('error')
  });
});

module.exports = router;
