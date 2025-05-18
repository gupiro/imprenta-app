const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');

router.get('/', productosController.listarProductos);
router.get('/nuevo', productosController.formNuevoProducto);
router.post('/nuevo', productosController.crearProducto);

module.exports = router;
