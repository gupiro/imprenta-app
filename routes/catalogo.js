const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');

// ✅ Rutas del catálogo de productos
router.get('/', catalogoController.listarCatalogo);
router.get('/nuevo', catalogoController.formNuevo);
router.post('/nuevo', catalogoController.crearProducto);
router.get('/editar/:id', catalogoController.formEditar);
router.post('/editar/:id', catalogoController.actualizarProducto);
router.post('/eliminar/:id', catalogoController.eliminarProducto);

module.exports = router;
