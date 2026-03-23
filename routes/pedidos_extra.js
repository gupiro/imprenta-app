const express = require('express');
const permitirRoles = require('../middleware/roles');
const pedidosController = require('../controllers/pedidosController');

module.exports = (db) => {
  const router = express.Router();

  // ▶ Ver historial de trabajos
  router.get('/historial', permitirRoles('admin','vendedor'), pedidosController.verHistorial);

  // ▶ Exportar historial a PDF
  router.get('/historial/pdf', permitirRoles('admin','vendedor'), pedidosController.exportarHistorialPDF);

  // ▶ Ver trabajos terminados
  router.get('/terminados', permitirRoles('admin','vendedor'), pedidosController.verTerminados);

  // ▶ Repetir trabajo desde historial
  router.get('/:id/repetir', permitirRoles('admin','vendedor'), pedidosController.repetirTrabajo);

  // ▶ Completar pago de pedido entregado
  router.post('/:id/completar-pago', permitirRoles('admin','vendedor'), async (req, res) => {
    try {
      const { id } = req.params;
      const montoPagado = parseFloat(req.body.monto_pagado) || 0;

      const pedido = await db.get('SELECT monto_restante, monto_entregado, precio FROM pedidos WHERE id = ?', id);
      if (!pedido) {
        req.flash('error', 'Pedido no encontrado');
        return res.redirect('/pedidos/entregados');
      }

      const nuevoEntregado = (pedido.monto_entregado || 0) + montoPagado;
      const nuevoSaldo     = Math.max(0, pedido.precio - nuevoEntregado);
      const nuevoEstadoPago = nuevoSaldo <= 0 ? 'PAGADO' : 'PENDIENTE';
      const fechaPago = nuevoEstadoPago === 'PAGADO' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

      await db.run(
        `UPDATE pedidos SET monto_entregado = ?, monto_restante = ?, estado_pago = ?, fecha_pago = COALESCE(?, fecha_pago) WHERE id = ?`,
        [nuevoEntregado, nuevoSaldo, nuevoEstadoPago, fechaPago, id]
      );

      req.flash('success', nuevoEstadoPago === 'PAGADO'
        ? '✅ Pago completado. Trabajo totalmente abonado.'
        : '💰 Pago parcial registrado correctamente.');

      res.redirect('/pedidos/entregados');
    } catch (err) {
      console.error('Error al completar pago:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/pedidos/entregados');
    }
  });

  return router;
};
