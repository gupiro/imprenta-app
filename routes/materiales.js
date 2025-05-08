// routes/materiales.js
const express         = require('express');
const router          = express.Router();
const db              = require('../database');
const checkPermission = require('../middleware/permissions');
const { permitirRoles } = require('../middleware/roles');

// ▶ GET /materiales — Listar materiales
router.get(
  '/',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    const materiales = db
      .prepare('SELECT * FROM materials ORDER BY id ASC')
      .all();
    res.render('materiales/list', {
      title:      'Materiales',
      materiales,                 // la vista espera "materiales"
      success:    req.flash('success'),
      error:      req.flash('error')
    });
  }
);

// ▶ GET /materiales/nuevo — Formulario para crear nuevo material
router.get(
  '/nuevo',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    res.render('materiales/new', {
      title:    'Agregar Material',
      success:  req.flash('success'),
      error:    req.flash('error'),
      material: null            // lo marcamos explícitamente para la vista
    });
  }
);

// ▶ POST /materiales — Crear material incluyendo la columna `unit`
router.post(
  '/',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    console.log('🛠️  POST /materiales → body:', req.body);
    const { name, price, tipoUnidad } = req.body;
    if (!name || !price) {
      req.flash('error', 'Nombre y precio son obligatorios.');
      return res.redirect('/materiales/nuevo');
    }
    const unit = tipoUnidad;  // tu tabla tiene `unit NOT NULL`
    try {
      const info = db.prepare(
        'INSERT INTO materials (name, price, tipoUnidad, unit) VALUES (?, ?, ?, ?)'
      ).run(name.trim(), parseFloat(price), tipoUnidad, unit);
      console.log('✅ Material insertado, id =', info.lastInsertRowid);
      req.flash('success', `Material "${name}" agregado correctamente.`);
      res.redirect('/materiales');
    } catch (err) {
      console.error('❌ Error al crear material:', err);
      req.flash('error', 'Error al crear el material: ' + err.message);
      res.redirect('/materiales/nuevo');
    }
  }
);

// ▶ GET /materiales/editar/:id — Formulario para editar material
router.get(
  '/editar/:id',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    const material = db
      .prepare('SELECT * FROM materials WHERE id = ?')
      .get(req.params.id);
    if (!material) {
      req.flash('error', 'Material no encontrado.');
      return res.redirect('/materiales');
    }
    res.render('materiales/new', {
      title:    'Editar Material',
      success:  req.flash('success'),
      error:    req.flash('error'),
      material                  // pasamos el objeto para precargar el form
    });
  }
);

// ▶ POST /materiales/editar/:id — Procesar edición incluyendo `unit`
router.post(
  '/editar/:id',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    console.log(`🛠️  POST /materiales/editar/${req.params.id} → body:`, req.body);
    const id = req.params.id;
    const { name, price, tipoUnidad } = req.body;
    if (!name || isNaN(parseFloat(price)) || !tipoUnidad) {
      req.flash('error', 'Todos los campos son obligatorios.');
      return res.redirect(`/materiales/editar/${id}`);
    }
    const unit = tipoUnidad;
    try {
      db.prepare(
        'UPDATE materials SET name = ?, price = ?, tipoUnidad = ?, unit = ? WHERE id = ?'
      ).run(name.trim(), parseFloat(price), tipoUnidad, unit, id);
      req.flash('success', 'Material actualizado.');
      res.redirect('/materiales');
    } catch (err) {
      console.error('❌ Error al actualizar material:', err);
      req.flash('error', 'Error al actualizar el material.');
      res.redirect(`/materiales/editar/${id}`);
    }
  }
);

// ▶ POST /materiales/eliminar/:id — Eliminar material
router.post(
  '/eliminar/:id',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    console.log(`🗑️  POST /materiales/eliminar/${req.params.id}`);
    try {
      db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
      req.flash('success', 'Material eliminado.');
    } catch (err) {
      console.error('❌ Error al eliminar material:', err);
      req.flash('error', 'Error al eliminar el material.');
    }
    res.redirect('/materiales');
  }
);

module.exports = router;
