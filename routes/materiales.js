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
    res.render('materiales/list', {
      title:      'Materiales',
      materiales,
      success:    req.flash('success'),
      error:      req.flash('error')
    });
  }
);

// ▶ Formulario Nuevo Material (GET)
router.get(
  '/nuevo',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    res.render('materiales/form', {
      title:    'Nuevo Material',
      material: {},
      success:  req.flash('success'),
      error:    req.flash('error')
    });
  }
);

// ▶ Procesar Nuevo Material (POST)
router.post(
  '/nuevo',
  permitirRoles('Admin','Atención'),
  checkPermission,
  (req, res) => {
    const name        = (req.body.name        || '').trim();
    const price       = parseFloat(req.body.price    || '');
    const tipoUnidad  = (req.body.tipoUnidad || '').trim();
    const unit        = (req.body.unit        || '').trim();

    if (!name || isNaN(price) || !tipoUnidad || !unit) {
      req.flash('error', 'Todos los campos son obligatorios.');
      return res.redirect('/materiales/nuevo');
    }

    try {
      db.prepare(`
        INSERT INTO materials (name, price, tipoUnidad, unit)
        VALUES (?, ?, ?, ?)
      `).run(name, price, tipoUnidad, unit);
      req.flash('success', 'Material creado exitosamente.');
    } catch (err) {
      console.error('Error al crear material:', err);
      req.flash('error', 'Error al guardar el material.');
    }

    res.redirect('/materiales');
  }
);

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
