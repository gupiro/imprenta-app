const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // API: Autocomplete de clientes
  router.get('/clientes', async (req, res) => {
    try {
      const query = req.query.q || '';
      const clientes = await db.all(`
        SELECT id, name AS text, phone, email, cuit
        FROM clients
        WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR cuit LIKE ?
        ORDER BY name ASC
        LIMIT 10
      `, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) || [];

      res.json(clientes.map(c => ({
        id: c.id,
        text: `${c.text} (${c.cuit || c.phone || c.email || 'Sin contacto'})`,
        phone: c.phone,
        email: c.email,
        cuit: c.cuit,
        name: c.text
      })));
    } catch (err) {
      console.error('Error:', err);
      res.json([]);
    }
  });

  // API: Autocomplete de productos
  router.get('/productos', async (req, res) => {
    try {
      const query = req.query.q || '';
      const productos = await db.all(`
        SELECT id, nombre AS text, precio_base, tipo, unidad, codigo
        FROM catalogo_productos
        WHERE (nombre LIKE ? OR tipo LIKE ? OR codigo LIKE ?)
        AND activo = 1
        ORDER BY nombre ASC
        LIMIT 10
      `, `%${query}%`, `%${query}%`, `%${query}%`) || [];

      res.json(productos.map(p => ({
        id: p.id,
        text: `[${p.codigo || 'S/C'}] ${p.text} - $${p.precio_base} (${p.unidad})`,
        precio: p.precio_base,
        nombre: p.text,
        codigo: p.codigo,
        tipo: p.tipo,
        unidad: p.unidad
      })));
    } catch (err) {
      console.error('Error:', err);
      res.json([]);
    }
  });

  // API: Autocomplete de presupuestos
  router.get('/presupuestos', async (req, res) => {
    try {
      const query = req.query.q || '';
      const presupuestos = await db.all(`
        SELECT p.id, p.id AS text, p.nombre_cliente, p.precio_estimado, p.estado, c.name
        FROM presupuestos p
        LEFT JOIN clients c ON p.cliente_id = c.id
        WHERE p.nombre_cliente LIKE ? OR c.name LIKE ? OR p.id LIKE ?
        AND p.estado = 'PENDIENTE'
        ORDER BY p.fecha_creacion DESC
        LIMIT 10
      `, `%${query}%`, `%${query}%`, `%${query}%`) || [];

      res.json(presupuestos.map(p => ({
        id: p.id,
        text: `Presupuesto #${p.text} - ${p.nombre_cliente || p.name} - $${p.precio_estimado}`,
        cliente: p.nombre_cliente || p.name,
        monto: p.precio_estimado,
        estado: p.estado
      })));
    } catch (err) {
      console.error('Error:', err);
      res.json([]);
    }
  });

  // API: Obtener producto por ID (para cargar datos)
  router.get('/producto/:id', async (req, res) => {
    try {
      const producto = await db.get(
        'SELECT id, nombre, precio_base, tipo, unidad, stock FROM catalogo_productos WHERE id = ?',
        req.params.id
      );

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio_base,
        tipo: producto.tipo,
        unidad: producto.unidad,
        stock: producto.stock
      });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: Obtener cliente por ID (para cargar datos)
  router.get('/cliente/:id', async (req, res) => {
    try {
      const cliente = await db.get(
        'SELECT * FROM clients WHERE id = ?',
        req.params.id
      );

      if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      res.json(cliente);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: Obtener presupuesto por ID
  router.get('/presupuesto/:id', async (req, res) => {
    try {
      const presupuesto = await db.get(
        'SELECT * FROM presupuestos WHERE id = ?',
        req.params.id
      );

      if (!presupuesto) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      const items = await db.all(
        'SELECT * FROM presupuesto_items WHERE presupuesto_id = ?',
        req.params.id
      ) || [];

      res.json({ ...presupuesto, items });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
