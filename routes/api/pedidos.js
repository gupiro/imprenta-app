// routes/api/pedidos.js
const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // Get client phone for WhatsApp
  router.get('/:id/cliente-phone', async (req, res) => {
    try {
      const pedidoId = parseInt(req.params.id);
      const pedido = await db.get(
        'SELECT c.phone FROM pedidos p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?',
        pedidoId
      );
      
      if (pedido && pedido.phone) {
        res.json({ phone: pedido.phone });
      } else {
        res.json({ phone: null, error: 'No phone found' });
      }
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
