const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // GET /stock - Listar todo el stock
  router.get('/', async (req, res) => {
    try {
      const stocks = await db.all(`
        SELECT s.*, p.nombre AS producto_nombre, p.tipo
        FROM stock s
        LEFT JOIN catalogo_productos p ON s.producto_id = p.id
        ORDER BY s.nombre ASC
      `) || [];

      // Calcular totales
      let totalValor = 0;
      let cantidadArticulos = 0;
      let articulosBajos = 0;

      stocks.forEach(s => {
        totalValor += (s.cantidad * s.precio_costo) || 0;
        cantidadArticulos += s.cantidad || 0;
        if (s.cantidad <= s.stock_minimo) articulosBajos++;
      });

      res.render('stock/lista', {
        title: 'Stock de Productos',
        stocks,
        totalValor: totalValor.toFixed(2),
        cantidadArticulos,
        articulosBajos,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/');
    }
  });

  // GET /stock/movimientos - Historial de movimientos
  router.get('/movimientos', async (req, res) => {
    try {
      const movimientos = await db.all(`
        SELECT m.*, p.nombre AS producto_nombre, u.username
        FROM movimientos_stock m
        LEFT JOIN catalogo_productos p ON m.producto_id = p.id
        LEFT JOIN users u ON m.usuario_id = u.id
        ORDER BY m.fecha DESC LIMIT 50
      `) || [];

      res.render('stock/movimientos', {
        title: 'Movimientos de Stock',
        movimientos,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/stock');
    }
  });

  // GET /stock/nuevo-movimiento - Formulario
  router.get('/nuevo-movimiento', async (req, res) => {
    try {
      const productos = await db.all('SELECT * FROM catalogo_productos WHERE activo = 1 ORDER BY nombre ASC') || [];
      const tipos = ['entrada', 'salida', 'ajuste'];

      res.render('stock/nuevo-movimiento', {
        title: 'Registrar Movimiento de Stock',
        productos,
        tipos,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/stock');
    }
  });

  // POST /stock/nuevo-movimiento - Crear movimiento
  router.post('/nuevo-movimiento', async (req, res) => {
    try {
      const { producto_id, tipo, cantidad, notas } = req.body;
      const userId = req.session.user?.id || 1;
      const cantidadNum = parseFloat(cantidad);

      if (!producto_id || !tipo || isNaN(cantidadNum) || cantidadNum === 0) {
        req.flash('error', 'Datos inválidos');
        return res.redirect('/stock/nuevo-movimiento');
      }

      // Insertar movimiento
      await db.run(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, usuario_id, notas)
         VALUES (?, ?, ?, ?, ?)`,
        producto_id, tipo, cantidadNum, userId, notas || null
      );

      // Actualizar stock en stock table
      const stock = await db.get('SELECT * FROM stock WHERE producto_id = ?', producto_id);
      
      if (stock) {
        let nuevaCantidad = stock.cantidad;
        if (tipo === 'entrada') nuevaCantidad += cantidadNum;
        else if (tipo === 'salida') nuevaCantidad -= cantidadNum;
        else if (tipo === 'ajuste') nuevaCantidad = cantidadNum;

        await db.run('UPDATE stock SET cantidad = ? WHERE producto_id = ?', nuevaCantidad, producto_id);
      } else {
        // Crear nuevo registro si no existe
        let cantFinal = (tipo === 'entrada') ? cantidadNum : (tipo === 'ajuste' ? cantidadNum : -cantidadNum);
        await db.run(
          'INSERT INTO stock (producto_id, nombre, cantidad) SELECT id, nombre, ? FROM catalogo_productos WHERE id = ?',
          cantFinal, producto_id
        );
      }

      req.flash('success', 'Movimiento registrado correctamente');
      res.redirect('/stock/movimientos');
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/stock/nuevo-movimiento');
    }
  });

  // POST /stock/ajustar/:id - Ajuste rápido
  router.post('/ajustar/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { cantidad } = req.body;
      const cantidadNum = parseFloat(cantidad);

      const stock = await db.get('SELECT * FROM stock WHERE id = ?', id);
      if (!stock) {
        req.flash('error', 'Stock no encontrado');
        return res.redirect('/stock');
      }

      await db.run('UPDATE stock SET cantidad = ? WHERE id = ?', cantidadNum, id);
      
      // Registrar movimiento de ajuste
      await db.run(
        'INSERT INTO movimientos_stock (producto_id, tipo, cantidad, notas) VALUES (?, ?, ?, ?)',
        stock.producto_id, 'ajuste', cantidadNum, 'Ajuste manual'
      );

      req.flash('success', 'Stock ajustado correctamente');
      res.redirect('/stock');
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/stock');
    }
  });

  return router;
};
