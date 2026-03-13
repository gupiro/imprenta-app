// routes/finanzas.js

const express = require('express');
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {
  const router = express.Router();
  const gastosFijosController = require('../controllers/gastosFijosController')(db);
  const comprasCuotasController = require('../controllers/comprasCuotasController')(db);
  const facturasRecibidasController = require('../controllers/facturasRecibidasController')(db);
  const vencimientosFiscalesController = require('../controllers/vencimientosFiscalesController')(db);

  // ========== GASTOS FIJOS ==========

  router.get('/gastos-fijos', checkPermission, async (req, res) => {
    return gastosFijosController.listar(req, res);
  });

  router.post('/gastos-fijos/crear', checkPermission, async (req, res) => {
    return gastosFijosController.crear(req, res);
  });

  router.post('/gastos-fijos/:id/editar', checkPermission, async (req, res) => {
    return gastosFijosController.editar(req, res);
  });

  router.post('/gastos-fijos/:id/eliminar', checkPermission, async (req, res) => {
    return gastosFijosController.eliminar(req, res);
  });

  router.post('/gastos-fijos/:id/marcar-pagado', checkPermission, async (req, res) => {
    return gastosFijosController.marcarPagado(req, res);
  });

  router.post('/gastos-fijos/:id/pago-parcial', checkPermission, async (req, res) => {
    return gastosFijosController.registrarPagoParcial(req, res);
  });

  // ========== COMPRAS EN CUOTAS ==========

  router.get('/compras-cuotas', checkPermission, async (req, res) => {
    return comprasCuotasController.listar(req, res);
  });

  router.post('/compras-cuotas/crear', checkPermission, async (req, res) => {
    return comprasCuotasController.crear(req, res);
  });

  router.post('/compras-cuotas/:id/editar', checkPermission, async (req, res) => {
    return comprasCuotasController.editar(req, res);
  });

  router.post('/compras-cuotas/:id/eliminar', checkPermission, async (req, res) => {
    return comprasCuotasController.eliminar(req, res);
  });

  router.post('/compras-cuotas/:id/registrar-cuota', checkPermission, async (req, res) => {
    return comprasCuotasController.registrarCuota(req, res);
  });

  // ========== FACTURAS RECIBIDAS ==========

  router.get('/facturas-recibidas', checkPermission, async (req, res) => {
    return facturasRecibidasController.listar(req, res);
  });

  router.post('/facturas-recibidas/crear', checkPermission, async (req, res) => {
    return facturasRecibidasController.crear(req, res);
  });

  router.post('/facturas-recibidas/:id/editar', checkPermission, async (req, res) => {
    return facturasRecibidasController.editar(req, res);
  });

  router.post('/facturas-recibidas/:id/eliminar', checkPermission, async (req, res) => {
    return facturasRecibidasController.eliminar(req, res);
  });

  router.post('/facturas-recibidas/:id/cambiar-estado', checkPermission, async (req, res) => {
    return facturasRecibidasController.cambiarEstado(req, res);
  });

  router.get('/facturas-recibidas/:id/detalle', checkPermission, async (req, res) => {
    return facturasRecibidasController.getDetalle(req, res);
  });

  router.post('/facturas-recibidas/:id/registrar-pago', checkPermission, async (req, res) => {
    return facturasRecibidasController.registrarPago(req, res);
  });

  // ========== VENCIMIENTOS FISCALES ==========

  router.get('/vencimientos-fiscales', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.listar(req, res);
  });

  router.post('/vencimientos-fiscales/crear', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.crear(req, res);
  });

  router.post('/vencimientos-fiscales/:id/editar', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.editar(req, res);
  });

  router.post('/vencimientos-fiscales/:id/eliminar', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.eliminar(req, res);
  });

  router.post('/vencimientos-fiscales/:id/pagar', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.marcarPagado(req, res);
  });

  return router;
};
