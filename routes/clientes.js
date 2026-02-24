// routes/clientes.js
const express = require('express');
const router = express.Router();
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {
    const clientesController = require('../controllers/clientesController')(db);

    // Crear cliente desde modal - SIN AUTENTICACIÓN (acceso público para modal)
    router.post('/crear-desde-modal', clientesController.crearClienteDesdeModal);

    // Buscar clientes por nombre - SIN AUTENTICACIÓN
    router.get('/search', clientesController.buscarClientes);

    // ▶ Listar Clientes (HTML)
    router.get('/', checkPermission, clientesController.listarClientes);

    // ▶ Formulario Nuevo Cliente (GET)
    router.get('/nuevo', checkPermission, clientesController.formNuevoCliente);

    // ▶ Procesar Nuevo Cliente (POST)
    router.post('/nuevo', checkPermission, clientesController.crearCliente);

    // ▶ Formulario Editar Cliente (GET)
    router.get('/editar/:id', checkPermission, clientesController.formEditarCliente);

    // ▶ Procesar Edición de Cliente (POST)
    router.post('/editar/:id', checkPermission, clientesController.editarCliente);

    // ▶ Eliminar Cliente con verificación de contraseña (POST)
    router.post('/eliminar/:id', checkPermission, clientesController.eliminarCliente);

    // ▶ Historial de pedidos de un cliente (GET)
    router.get('/:id/historial', checkPermission, clientesController.historialCliente);

    return router;
};
