const express = require('express');
const router = express.Router();

// Este router ahora exporta una función que recibe la instancia de la DB
module.exports = (db) => { // Recibe 'db' como argumento

    // Importamos el controlador y le pasamos la instancia de la DB
    const clientesController = require('../../controllers/clientesController')(db);

    router.post('/crear-desde-modal', express.json(), clientesController.crearClienteDesdeModal);
    router.get('/search', clientesController.buscarClientes);

    return router; // Retornamos el router configurado
};
