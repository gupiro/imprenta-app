const express = require('express');
const router = express.Router();
const db = require('../database');
const permit = require('../middleware/permissions');
const pedidosController = require('../controllers/pedidosController');

// ▶ Ver historial de trabajos
router.get('/historial', permit('Admin','Atención'), pedidosController.verHistorial);

// ▶ Exportar historial a PDF
router.get('/historial/pdf', permit('Admin','Atención'), pedidosController.exportarHistorialPDF);

// ▶ Ver trabajos terminados
router.get('/terminados', permit('Admin','Atención'), pedidosController.verTerminados);

// ▶ Repetir trabajo desde historial
router.get('/:id/repetir', permit('Admin','Atención'), pedidosController.repetirTrabajo);

// ▶ Completar pago de pedido entregado
router.post('/:id/completar-pago', permit('Admin','Atención'), (req, res) => {
  const { id } = req.params;
  const montoPagado = parseFloat(req.body.monto_pagado) || 0;

  const pedido = db.prepare('SELECT monto_restante, monto_entregado, precio FROM pedidos WHERE id = ?').get(id);
  if (!pedido) {
    req.flash('error', 'Pedido no encontrado');
    return res.redirect('/pedidos/entregados');
  }

  const nuevoEntregado = (pedido.monto_entregado || 0) + montoPagado;
  const nuevoSaldo     = Math.max(0, pedido.precio - nuevoEntregado);
  const nuevoEstadoPago = nuevoSaldo <= 0 ? 'PAGADO' : 'PENDIENTE';
  const fechaPago = nuevoEstadoPago === 'PAGADO' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;

  db.prepare(`
    UPDATE pedidos
    SET monto_entregado = ?,
        monto_restante  = ?,
        estado_pago     = ?,
        fecha_pago      = COALESCE(?, fecha_pago)
    WHERE id = ?
  `).run(nuevoEntregado, nuevoSaldo, nuevoEstadoPago, fechaPago, id);

  req.flash('success', nuevoEstadoPago === 'PAGADO'
    ? '✅ Pago completado. Trabajo totalmente abonado.'
    : '💰 Pago parcial registrado correctamente.');

  res.redirect('/pedidos/entregados');
});

module.exports = router;
