// routes/materiales.js
const express         = require('express');
const router          = express.Router();
const db              = require('../database');
const checkPermission = require('../middleware/permissions');
const { permitirRoles } = require('../middleware/roles');

// ▶ Listar materiales
router.get(
  '/',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    const materiales = db
      .prepare('SELECT * FROM materials ORDER BY id ASC')
      .all();
    res.render('materiales/index', {   // apuntamos a views/materiales/index.ejs
      title:      'Materiales',
      materials:  materiales,
      success:    req.flash('success'),
      error:      req.flash('error')
    });
  }
);

// ▶ Formulario para nuevo material
router.get(
  '/new',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    res.render('materiales/new', {    // apuntamos a views/materiales/new.ejs
      title: 'Agregar Material',
      error: req.flash('error')
    });
  }
);

// ▶ Crear material
router.post(
  '/',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    const { name, price, tipoUnidad } = req.body;
    if (!name || !price) {
      req.flash('error', 'Nombre y precio son obligatorios.');
      return res.redirect('/materiales/new');
    }
    try {
      db.prepare(
        'INSERT INTO materials (name, price, tipoUnidad) VALUES (?, ?, ?)'
      ).run(name.trim(), parseFloat(price), tipoUnidad || 'unidad');
      req.flash('success', `Material "${name}" agregado correctamente.`);
      res.redirect('/materiales');
    } catch (err) {
      req.flash('error', 'Error al crear el material: ' + err.message);
      res.redirect('/materiales/new');
    }
  }
);

module.exports = router;


// ▶ Formulario Editar Material (GET)
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
    res.render('materiales/form', {
      title:    'Editar Material',
      material,
      success:  req.flash('success'),
      error:    req.flash('error')
    });
  }
);

// ▶ Procesar Edición de Material (POST)
router.post(
  '/editar/:id',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    const name        = (req.body.name        || '').trim();
    const price       = parseFloat(req.body.price    || '');
    const tipoUnidad  = (req.body.tipoUnidad || '').trim();
    const unit        = (req.body.unit        || '').trim();

    if (!name || isNaN(price) || !tipoUnidad || !unit) {
      req.flash('error', 'Todos los campos son obligatorios.');
      return res.redirect(`/materiales/editar/${req.params.id}`);
    }

    try {
      db.prepare(`
        UPDATE materials
           SET name       = ?,
               price      = ?,
               tipoUnidad = ?,
               unit       = ?
         WHERE id = ?
      `).run(name, price, tipoUnidad, unit, req.params.id);
      req.flash('success', 'Material actualizado.');
    } catch (err) {
      console.error('Error al actualizar material:', err);
      req.flash('error', 'Error al actualizar el material.');
    }

    res.redirect('/materiales');
  }
);

// ▶ Eliminar Material (POST)
router.post(
  '/eliminar/:id',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    try {
      db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
      req.flash('success', 'Material eliminado.');
    } catch (err) {
      console.error('Error al eliminar material:', err);
      req.flash('error', 'Error al eliminar el material.');
    }
    res.redirect('/materiales');
  }
);

module.exports = router;
