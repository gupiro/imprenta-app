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

      // Gastos del mes (solo negocio)
      const gastosMes = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE tipo = 'negocio' AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')"
      ))?.total || 0;

      // Saldo neto
      const saldoNeto = ingresosMes - gastosMes;

      // Ingresos mes anterior
      const ingresosMesAnterior = (await db.get(`
        SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja
        WHERE tipo = 'ingreso'
        AND strftime('%Y-%m', fecha) = strftime('%Y-%m', date('now', '-1 month'))
      `))?.total || 0;

      // Gastos mes anterior (solo negocio)
      const gastosMesAnterior = (await db.get(`
        SELECT COALESCE(SUM(monto), 0) AS total FROM gastos
        WHERE tipo = 'negocio' AND strftime('%Y-%m', fecha) = strftime('%Y-%m', date('now', '-1 month'))
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

      // Gastos por categoría (mes actual, solo negocio)
      const gastosPorCategoria = await db.all(`
        SELECT categoria, SUM(monto) as total
        FROM gastos WHERE tipo = 'negocio' AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')
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
          "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE tipo = 'negocio' AND strftime('%Y-%m', fecha) = ?",
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

      // Total de artículos en stock
      const totalStock = (await db.get("SELECT COUNT(*) AS c FROM stock"))?.c || 0;

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

      // ════════════════════════════════════════════════════════════════
      // NUEVAS VARIABLES PARA DASHBOARD MEJORADO
      // ════════════════════════════════════════════════════════════════

      // Piso de Supervivencia (gastos fijos)
      const FACTOR_MENSUAL = { semanal: 4.33, quincenal: 2.17, mensual: 1, bimestral: 0.5, trimestral: 1/3, semestral: 1/6, anual: 1/12 };
      const gastosFijosActivos = await db.all("SELECT frecuencia, monto FROM gastos_fijos WHERE activo = 1") || [];
      const pisoSupervivencia = gastosFijosActivos.reduce((sum, gf) => {
          const factor = FACTOR_MENSUAL[gf.frecuencia] ?? 1;
          return sum + (gf.monto * factor);
      }, 0);

      // Total deuda en tarjetas
      const totalDeudaTarjetas = (await db.get("SELECT COALESCE(SUM(saldo_adeudado), 0) AS total FROM deudas_tarjetas WHERE estado = 'activa'"))?.total || 0;

      // Próximos 7 días — calcular fechas
      const hoyDate = new Date();
      const hoyDateStr = hoyDate.toISOString().slice(0, 10);
      const en7DiasDate = new Date(hoyDate);
      en7DiasDate.setDate(en7DiasDate.getDate() + 7);
      const en7DiasDateStr = en7DiasDate.toISOString().slice(0, 10);

      // Gastos pendientes en los próximos 7 días
      const gastosPendientes7Dias = await db.all(`
          SELECT 'gasto' AS tipo, descripcion AS concepto, fecha AS fecha_str, monto, id
          FROM gastos
          WHERE estado_pago = 'pendiente'
            AND tipo = 'negocio'
            AND fecha >= ?
            AND fecha <= ?
          ORDER BY fecha ASC
      `, [hoyDateStr, en7DiasDateStr]) || [];

      // Vencimientos fiscales en los próximos 7 días
      const vencimientosFiscales7Dias = await db.all(`
          SELECT descripcion AS concepto, fecha_vencimiento AS fecha_str, monto_estimado AS monto, id
          FROM vencimientos_fiscales
          WHERE estado != 'pagado'
            AND fecha_vencimiento >= ?
            AND fecha_vencimiento <= ?
          ORDER BY fecha_vencimiento ASC
      `, [hoyDateStr, en7DiasDateStr]) || [];

      // Tarjetas próximas a vencer (en 7 días)
      const tarjetasActivas = await db.all("SELECT nombre_tarjeta, fecha_vencimiento, saldo_adeudado, id FROM deudas_tarjetas WHERE estado = 'activa' AND fecha_vencimiento IS NOT NULL") || [];
      const diaHoy = hoyDate.getDate();
      const tarjetas7Dias = tarjetasActivas.filter(t => {
          const diasHasta = t.fecha_vencimiento >= diaHoy
              ? t.fecha_vencimiento - diaHoy
              : new Date(hoyDate.getFullYear(), hoyDate.getMonth() + 1, 0).getDate() - diaHoy + t.fecha_vencimiento;
          t.diasHasta = diasHasta;
          t.fechaDisplay = `Día ${t.fecha_vencimiento}`;
          return diasHasta <= 7;
      }).map(t => ({
          tipo: 'tarjeta',
          concepto: `Tarjeta: ${t.nombre_tarjeta}`,
          fecha_str: t.fechaDisplay,
          diasHasta: t.diasHasta,
          monto: t.saldo_adeudado,
          id: t.id
      }));

      // Combinar y ordenar próximos 7 días
      const proximos7Dias = [
          ...tarjetas7Dias,
          ...gastosPendientes7Dias.map(g => ({
              ...g,
              diasHasta: Math.round((new Date(g.fecha_str) - hoyDate) / 86400000)
          })),
          ...vencimientosFiscales7Dias.map(v => ({
              ...v,
              diasHasta: Math.round((new Date(v.fecha_str) - hoyDate) / 86400000)
          }))
      ].sort((a, b) => (a.diasHasta || 0) - (b.diasHasta || 0));

      const totalProximos7Dias = proximos7Dias.reduce((s, v) => s + (v.monto || 0), 0);

      // Semáforo financiero
      const semaforo = (() => {
          if (ingresosMes === 0 && gastosMes === 0) {
              return { color: 'secondary', estado: 'Sin datos aún', clase: 'bg-secondary text-dark' };
          }
          const margen = ingresosMes > 0 ? ((ingresosMes - gastosMes) / ingresosMes) * 100 : -100;
          if (gastosMes > ingresosMes) {
              return { color: 'danger', clase: 'bg-danger text-white', estado: 'Atención: estás gastando más de lo que ingresa ❌' };
          }
          if (margen < 10) {
              return { color: 'warning', clase: 'bg-warning text-dark', estado: 'Estás en equilibrio, cuidá los gastos ⚠️' };
          }
          return { color: 'success', clase: 'bg-success text-white', estado: 'El negocio va bien este mes ✅' };
      })();

      // Acciones para "¿Qué hago ahora?"
      const accionesAhora = [];
      const tarjetasUrgentes = tarjetas7Dias.filter(t => t.diasHasta <= 5);
      if (tarjetasUrgentes.length > 0) {
          accionesAhora.push({
              icono: '💳',
              texto: `La tarjeta ${tarjetasUrgentes[0].concepto.replace('Tarjeta: ','')} vence en ${tarjetasUrgentes[0].diasHasta} días. ¿Ya tenés el dinero?`,
              urgencia: 'danger'
          });
      }
      const gastosPendientesMes = await db.get("SELECT COUNT(*) AS c, COALESCE(SUM(monto),0) AS total FROM gastos WHERE estado_pago='pendiente' AND tipo='negocio'");
      if (gastosPendientesMes?.c > 0) {
          accionesAhora.push({
              icono: '💸',
              texto: `Tenés ${gastosPendientesMes.c} gastos pendientes por $${gastosPendientesMes.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
              urgencia: 'warning'
          });
      }
      const deudoresViejos = deudores.filter(d => d.dias_deuda > 10);
      if (deudoresViejos.length > 0) {
          accionesAhora.push({
              icono: '👥',
              texto: `Hay ${deudoresViejos.length} cliente(s) que te deben hace más de 10 días`,
              urgencia: 'info'
          });
      }

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
        totalStock,
        ultimosPedidos,
        graficoLabels: JSON.stringify(graficoLabels),
        graficoDatos: JSON.stringify(graficoDatos),
        estadoLabels: JSON.stringify(estadoLabels),
        estadoDatos: JSON.stringify(estadoDatos),
        pisoSupervivencia,
        proximos7Dias,
        totalProximos7Dias,
        totalDeudaTarjetas,
        semaforo,
        accionesAhora,
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
