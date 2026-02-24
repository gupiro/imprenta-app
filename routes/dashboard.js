const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // GET /dashboard - Dashboard completo
  router.get('/', async (req, res) => {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const fechaInicio = inicioMes.toISOString().slice(0, 10);

      // Contadores principales
      const stats = {
        pedidosPendientes: (await db.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'PENDIENTE'"))?.c || 0,
        pedidosEnProduccion: (await db.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'EN_PRODUCCION'"))?.c || 0,
        pedidosListos: (await db.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'LISTO'"))?.c || 0,
        pedidosEntregados: (await db.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'ENTREGADO'"))?.c || 0,
        presupuestosAbiertos: (await db.get("SELECT COUNT(*) AS c FROM presupuestos WHERE estado = 'PENDIENTE'"))?.c || 0,
        clientesActivos: (await db.get("SELECT COUNT(*) AS c FROM clients"))?.c || 0
      };

      // Ingresos
      const ingresosHoy = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) = ?",
        hoy
      ))?.total || 0;

      const ingresosMes = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) >= ?",
        fechaInicio
      ))?.total || 0;

      // Deudores (últimos 5)
      const deudores = await db.all(`
        SELECT p.id, p.precio, p.monto_restante, p.estado,
               c.name AS cliente_nombre, c.phone
        FROM pedidos p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.monto_restante > 0
        ORDER BY p.monto_restante DESC LIMIT 5
      `) || [];

      // Stock bajo (últimos 5)
      const stockBajo = await db.all(`
        SELECT id, nombre, cantidad, stock_minimo, unidad
        FROM stock WHERE cantidad <= stock_minimo
        ORDER BY cantidad ASC LIMIT 5
      `) || [];

      // Últimos pedidos
      const ultimosPedidos = await db.all(`
        SELECT p.id, p.precio, p.estado, p.fecha,
               c.name AS cliente_nombre
        FROM pedidos p
        LEFT JOIN clients c ON p.client_id = c.id
        ORDER BY p.fecha DESC LIMIT 10
      `) || [];

      // Gráfico: Últimos 7 días
      const graficoLabels = [];
      const graficoDatos = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const fecha = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
        const row = await db.get(
          "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) = ?",
          fecha
        );
        graficoLabels.push(label);
        graficoDatos.push(row?.total || 0);
      }

      // Gráfico: Estado de pedidos
      const estadoPedidos = await db.all(`
        SELECT estado, COUNT(*) AS cantidad FROM pedidos GROUP BY estado
      `) || [];

      const estadoLabels = [];
      const estadoDatos = [];
      estadoPedidos.forEach(row => {
        estadoLabels.push(row.estado);
        estadoDatos.push(row.cantidad);
      });

      res.render('dashboard', {
        title: 'Dashboard Ejecutivo',
        stats,
        ingresosHoy,
        ingresosMes,
        deudores,
        stockBajo,
        ultimosPedidos,
        graficoLabels: JSON.stringify(graficoLabels),
        graficoDatos: JSON.stringify(graficoDatos),
        estadoLabels: JSON.stringify(estadoLabels),
        estadoDatos: JSON.stringify(estadoDatos),
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error en dashboard:', err);
      res.status(500).render('error', { 
        title: 'Error',
        mensaje: 'Error al cargar el dashboard',
        error: err.message 
      });
    }
  });

  return router;
};
