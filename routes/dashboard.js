const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // GET /dashboard - Dashboard completo con análisis financiero
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

      // Gastos del mes
      const gastosMes = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')"
      ))?.total || 0;

      // Saldo neto
      const saldoNeto = ingresosMes - gastosMes;

      // Ingresos mes anterior
      const ingresosMesAnterior = (await db.get(`
        SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja
        WHERE tipo = 'ingreso'
        AND strftime('%Y-%m', fecha) = strftime('%Y-%m', date('now', '-1 month'))
      `))?.total || 0;

      // Gastos mes anterior
      const gastosMesAnterior = (await db.get(`
        SELECT COALESCE(SUM(monto), 0) AS total FROM gastos
        WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', date('now', '-1 month'))
      `))?.total || 0;

      // Pedidos completados este mes
      const pedidosCompletadosMes = (await db.get(
        "SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'ENTREGADO' AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')"
      ))?.c || 0;

      // Pedidos completados mes anterior
      const pedidosCompletadosMesAnterior = (await db.get(
        "SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'ENTREGADO' AND strftime('%Y-%m', fecha) = strftime('%Y-%m', date('now', '-1 month'))"
      ))?.c || 0;

      // Pedidos activos
      const pedidosActivos = (await db.get(
        "SELECT COUNT(*) AS c FROM pedidos WHERE estado IN ('PENDIENTE','EN_PRODUCCION','LISTO')"
      ))?.c || 0;

      // Gastos por categoría (mes actual)
      const gastosPorCategoria = await db.all(`
        SELECT categoria, SUM(monto) as total
        FROM gastos WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')
        GROUP BY categoria ORDER BY total DESC
      `) || [];

      // Ingresos por método de pago (mes actual)
      const ingresosPorMetodo = await db.all(`
        SELECT metodo_pago, SUM(monto) as total
        FROM movimientos_caja WHERE tipo='ingreso'
        AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')
        GROUP BY metodo_pago
      `) || [];

      // Últimos 6 meses - Ingresos vs Egresos
      const ingresos6Meses = [];
      const egresos6Meses = [];
      const meses6Labels = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mes = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString('es-AR', { year: '2-digit', month: 'short' });

        const ingresos = (await db.get(
          "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND strftime('%Y-%m', fecha) = ?",
          mes
        ))?.total || 0;

        const egresos = (await db.get(
          "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE strftime('%Y-%m', fecha) = ?",
          mes
        ))?.total || 0;

        meses6Labels.push(label);
        ingresos6Meses.push(ingresos);
        egresos6Meses.push(egresos);
      }

      // Deudores (últimos 5 con días de deuda)
      const deudores = await db.all(`
        SELECT p.id, p.precio, p.monto_restante, p.estado, p.fecha,
               c.name AS cliente_nombre, c.phone,
               CAST((julianday('now') - julianday(p.fecha)) AS INTEGER) as dias_deuda
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

      // Presupuestos pendientes sin respuesta hace más de 3 días
      const presupuestosPendientes = await db.all(`
        SELECT p.id, p.precio_estimado, p.fecha_creacion, c.name AS cliente
        FROM presupuestos p
        LEFT JOIN clients c ON p.cliente_id = c.id
        WHERE p.estado = 'PENDIENTE'
        AND julianday('now') - julianday(p.fecha_creacion) > 3
        ORDER BY p.fecha_creacion ASC LIMIT 5
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

      // Calcular % cambios
      const cambioIngresos = ingresosMesAnterior > 0 ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 : 0;
      const cambioGastos = gastosMesAnterior > 0 ? ((gastosMes - gastosMesAnterior) / gastosMesAnterior) * 100 : 0;
      const cambioPedidos = pedidosCompletadosMesAnterior > 0 ? ((pedidosCompletadosMes - pedidosCompletadosMesAnterior) / pedidosCompletadosMesAnterior) * 100 : 0;

      // Deuda total
      const deudaTotal = deudores.reduce((sum, d) => sum + d.monto_restante, 0);

      res.render('dashboard', {
        title: 'Dashboard Ejecutivo',
        stats,
        ingresosHoy,
        ingresosMes,
        gastosMes,
        saldoNeto,
        deudaTotal,
        pedidosActivos,
        cambioIngresos,
        cambioGastos,
        cambioPedidos,
        gastosPorCategoria: JSON.stringify(gastosPorCategoria.map(g => ({ label: g.categoria, value: g.total }))),
        ingresosPorMetodo: JSON.stringify(ingresosPorMetodo.map(m => ({ label: m.metodo_pago || 'Sin especificar', value: m.total }))),
        meses6Labels: JSON.stringify(meses6Labels),
        ingresos6Meses: JSON.stringify(ingresos6Meses),
        egresos6Meses: JSON.stringify(egresos6Meses),
        deudores,
        presupuestosPendientes,
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
