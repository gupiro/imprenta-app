const express = require('express');
const router = express.Router();

// Este router ahora exporta una función que recibe la instancia de la DB
module.exports = (db) => { // Recibe 'db' como argumento

    // Importamos el controlador y le pasamos la instancia de la DB
    const catalogoController = require('../controllers/catalogoController')(db);

    // Rutas del catálogo de productos
    router.get('/', catalogoController.listarCatalogo);
    router.get('/nuevo', catalogoController.formNuevo);
    router.post('/nuevo', catalogoController.crearProducto);
    router.get('/editar/:id', catalogoController.formEditar);
    router.post('/editar/:id', catalogoController.actualizarProducto);
    router.post('/eliminar/:id', catalogoController.eliminarProducto);

    return router; // Retornamos el router configurado
};
