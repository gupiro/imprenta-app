const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const { calcularBalanceMes } = require('../utils/financiero');

module.exports = (db) => {
  const router = express.Router();

  // GET /reportes - Página principal de reportes
  router.get('/', async (req, res) => {
    try {
      const _now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      const hoy = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
      const inicioMes = new Date(_now);
      inicioMes.setDate(1);
      const fechaInicio = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth()+1).padStart(2,'0')}-${String(inicioMes.getDate()).padStart(2,'0')}`;

      // Estadísticas generales
      const totalPedidos = (await db.get("SELECT COUNT(*) AS c FROM pedidos"))?.c || 0;
      const totalPresupuestos = (await db.get("SELECT COUNT(*) AS c FROM presupuestos"))?.c || 0;
      const totalClientes = (await db.get("SELECT COUNT(*) AS c FROM clients"))?.c || 0;

      const ingresosMes = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND SUBSTR(fecha, 1, 10) >= ?",
        fechaInicio
      ))?.total || 0;

      // ✅ CORREGIDO: Usar SOLO movimientos_caja para evitar doble conteo
      // Cuando se pagan gastos/cuotas/facturas, ya se registran en movimientos_caja
      const egresosMes = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso' AND SUBSTR(fecha, 1, 10) >= ?",
        fechaInicio
      ))?.total || 0;

      const deudaTotal = (await db.get(
        "SELECT COALESCE(SUM(monto_restante), 0) AS total FROM pedidos WHERE monto_restante > 0"
      ))?.total || 0;

      res.render('reportes/inicio', {
        title: 'Reportes y Análisis',
        stats: { totalPedidos, totalPresupuestos, totalClientes, ingresosMes, egresosMes, deudaTotal },
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/');
    }
  });

  // GET /reportes/mensual - Reporte mensual
  router.get('/mensual', async (req, res) => {
    try {
      const _now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      const mes = req.query.mes || `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}`;
      const [anno, mesNum] = mes.split('-');
      const fechaInicio = `${anno}-${mesNum}-01`;
      const lastDay = new Date(anno, mesNum, 0).getDate();
      const fechaFin = `${anno}-${mesNum}-${lastDay}`;

      // Ingresos y egresos
      const ingresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND SUBSTR(fecha, 1, 10) BETWEEN ? AND ?",
        fechaInicio, fechaFin
      ))?.total || 0;

      // ✅ CORREGIDO: Usar SOLO movimientos_caja para evitar doble conteo
      const egresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso' AND SUBSTR(fecha, 1, 10) BETWEEN ? AND ?",
        [fechaInicio, fechaFin]
      ))?.total || 0;

      // Detalles por categoría
      const movimientos = await db.all(`
        SELECT categoria, tipo, COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS total
        FROM movimientos_caja
        WHERE SUBSTR(fecha, 1, 10) BETWEEN ? AND ?
        GROUP BY categoria, tipo
        ORDER BY total DESC
      `, fechaInicio, fechaFin) || [];

      // Pedidos del mes
      const pedidos = await db.all(`
        SELECT p.id, p.precio, p.estado, c.name AS cliente_nombre, p.fecha
        FROM pedidos p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE DATE(p.fecha) BETWEEN ? AND ?
        ORDER BY p.fecha DESC
      `, fechaInicio, fechaFin) || [];

      res.render('reportes/mensual', {
        title: `Reporte Mensual - ${mes}`,
        mes,
        ingresos,
        egresos,
        ganancia: ingresos - egresos,
        movimientos,
        pedidos,
        totalPedidos: pedidos.length
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/reportes');
    }
  });

  // GET /reportes/diario - Reporte diario
  router.get('/diario', async (req, res) => {
    try {
      const _now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      const fecha = req.query.fecha || `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
      const fechaFormato = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Ingresos y egresos del día
      const ingresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND SUBSTR(fecha, 1, 10) = ?",
        fecha
      ))?.total || 0;

      // ✅ CORREGIDO: Usar SOLO movimientos_caja para evitar doble conteo
      const egresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso' AND SUBSTR(fecha, 1, 10) = ?",
        [fecha]
      ))?.total || 0;

      // Movimientos detallados
      const movimientos = await db.all(`
        SELECT tipo, concepto, categoria, monto, metodo_pago, fecha
        FROM movimientos_caja
        WHERE SUBSTR(fecha, 1, 10) = ?
        ORDER BY fecha ASC
      `, fecha) || [];

      // Pedidos del día
      const pedidosDelDia = await db.all(`
        SELECT p.id, p.precio, p.estado, p.monto_entregado, p.monto_restante, c.name AS cliente_nombre, p.fecha
        FROM pedidos p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE DATE(p.fecha) = ?
        ORDER BY p.fecha DESC
      `, fecha) || [];

      // Desglose por método de pago
      const metodos = await db.all(`
        SELECT metodo_pago, SUM(monto) AS total
        FROM movimientos_caja
        WHERE tipo = 'ingreso' AND SUBSTR(fecha, 1, 10) = ?
        GROUP BY metodo_pago
      `, fecha) || [];

      res.render('reportes/diario', {
        title: `Reporte Diario - ${fecha}`,
        fecha,
        fechaFormato,
        ingresos,
        egresos,
        ganancia: ingresos - egresos,
        movimientos,
        pedidosDelDia,
        metodos,
        totalPedidos: pedidosDelDia.length
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/reportes');
    }
  });

  // GET /reportes/clientes - Reporte de clientes
  router.get('/clientes', async (req, res) => {
    try {
      const clientes = await db.all(`
        SELECT c.id, c.name, c.phone, c.email, 
               COUNT(p.id) AS total_pedidos,
               COALESCE(SUM(p.precio), 0) AS total_gastado,
               COALESCE(SUM(p.monto_restante), 0) AS deuda
        FROM clients c
        LEFT JOIN pedidos p ON c.id = p.client_id
        GROUP BY c.id
        ORDER BY total_gastado DESC
      `) || [];

      res.render('reportes/clientes', {
        title: 'Reporte de Clientes',
        clientes
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/reportes');
    }
  });

  // GET /reportes/deudores - Deudores
  router.get('/deudores', async (req, res) => {
    try {
      const deudores = await db.all(`
        SELECT p.id, p.precio, p.monto_entregado, p.monto_restante, p.fecha_pago, p.fecha,
               c.id AS cliente_id, c.name AS cliente_nombre, c.phone, c.email,
               ROUND((p.monto_restante / p.precio) * 100) AS porcentaje_deuda,
               CAST((julianday('now') - julianday(p.fecha)) AS INTEGER) AS dias_pendientes
        FROM pedidos p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.monto_restante > 0
        ORDER BY p.monto_restante DESC
      `) || [];

      const totalDeuda = deudores.reduce((sum, d) => sum + (d.monto_restante || 0), 0);

      res.render('reportes/deudores', {
        title: 'Reporte de Deudores',
        deudores,
        totalDeuda
      });
    } catch (err) {
      console.error('Error:', err);
      req.flash('error', 'Error: ' + err.message);
      res.redirect('/reportes');
    }
  });

  // POST /reportes/cancelar-deuda - Cancelar deuda de un pedido
  router.post('/cancelar-deuda', async (req, res) => {
    try {
      const { pedidoId, monto, registrarPago } = req.body;

      if (!pedidoId || monto <= 0) {
        return res.json({ success: false, error: 'Datos inválidos' });
      }

      // Actualizar pedido
      await db.run(
        'UPDATE pedidos SET monto_restante = 0, monto_entregado = precio WHERE id = ?',
        [pedidoId]
      );

      // Si se desea registrar el pago, agregar a caja diaria
      if (registrarPago) {
        const _now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
        const timestamp = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')} ${String(_now.getHours()).padStart(2,'0')}:${String(_now.getMinutes()).padStart(2,'0')}:${String(_now.getSeconds()).padStart(2,'0')}`;

        await db.run(
          'INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, fecha) VALUES (?, ?, ?, ?, ?, ?)',
          ['ingreso', `Deuda cancelada - Pedido #${pedidoId}`, 'deuda_cancelada', monto, 'manual', timestamp]
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Error al cancelar deuda:', err);
      res.json({ success: false, error: err.message });
    }
  });

  // GET /reportes/pdf/pedido/:id - Generar PDF de pedido
  router.get('/pdf/pedido/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const pedido = await db.get(`
        SELECT p.*, c.name AS cliente_nombre, c.address, c.phone, c.email
        FROM pedidos p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = ?
      `, id);

      if (!pedido) {
        return res.status(404).send('Pedido no encontrado');
      }

      const productos = await db.all(
        'SELECT * FROM productos WHERE pedido_id = ?',
        id
      ) || [];

      // Generar HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-section { padding: 10px; background: #f5f5f5; }
            .info-section h3 { margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            table thead { background: #333; color: white; }
            table th, table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .total-section { text-align: right; font-size: 18px; font-weight: bold; }
            .footer { text-align: center; font-size: 12px; color: #999; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PEDIDO #${pedido.id}</h1>
            <p>Fecha: ${new Date(pedido.fecha).toLocaleDateString('es-AR')}</p>
          </div>

          <div class="info-grid">
            <div class="info-section">
              <h3>Cliente</h3>
              <p><strong>${pedido.cliente_nombre || 'Sin nombre'}</strong></p>
              <p>${pedido.address || '-'}</p>
              <p>Tel: ${pedido.phone || '-'}</p>
              <p>Email: ${pedido.email || '-'}</p>
            </div>
            <div class="info-section">
              <h3>Datos del Pedido</h3>
              <p>Estado: <strong>${pedido.estado}</strong></p>
              <p>Pago: ${pedido.estado_pago}</p>
              <p>${pedido.fecha_entrega ? `Entrega: ${new Date(pedido.fecha_entrega).toLocaleDateString('es-AR')}` : ''}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productos.map(p => `
                <tr>
                  <td>${p.descripcion}</td>
                  <td>${p.cantidad}</td>
                  <td>$${(p.precio_unitario || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                  <td>$${(p.precio || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <p>Total: $${pedido.precio.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
            <p>Pagado: $${pedido.monto_entregado.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
            <p style="color: ${pedido.monto_restante > 0 ? 'red' : 'green'};">
              ${pedido.monto_restante > 0 ? 'Deuda' : 'Pagado'}: $${pedido.monto_restante.toLocaleString('es-AR', {minimumFractionDigits: 2})}
            </p>
          </div>

          <div class="footer">
            <p>Generado: ${new Date().toLocaleString('es-AR')}</p>
          </div>
        </body>
        </html>
      `;

      // Generar PDF con Puppeteer
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({ format: 'A4', margin: { top: 20, right: 20, bottom: 20, left: 20 } });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="pedido_${id}.pdf"`);
      res.send(pdf);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error al generar PDF: ' + err.message);
    }
  });

  // GET /reportes/caja/pdf/:fecha - Generar PDF de caja diaria
  router.get('/caja/pdf/:fecha', async (req, res) => {
    try {
      const _now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      const fecha = req.params.fecha || `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
      const fechaFormato = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Ingresos y egresos
      const ingresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND SUBSTR(fecha, 1, 10) = ?",
        fecha
      ))?.total || 0;

      // ✅ CORREGIDO: Usar SOLO movimientos_caja para evitar doble conteo
      const egresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso' AND SUBSTR(fecha, 1, 10) = ?",
        [fecha]
      ))?.total || 0;

      const saldo = ingresos - egresos;

      // Desglose por método de pago
      const metodos = await db.all(`
        SELECT metodo_pago, SUM(monto) AS total
        FROM movimientos_caja
        WHERE tipo = 'ingreso' AND SUBSTR(fecha, 1, 10) = ?
        GROUP BY metodo_pago
        ORDER BY metodo_pago
      `, fecha) || [];

      // Movimientos detallados
      const movimientos = await db.all(`
        SELECT tipo, concepto, categoria, metodo_pago, monto,
               strftime('%H:%M:%S', fecha) AS hora
        FROM movimientos_caja
        WHERE SUBSTR(fecha, 1, 10) = ?
        ORDER BY fecha ASC
      `, fecha) || [];

      // Generar HTML
      const metodosHTML = metodos.map(m => `
        <tr>
          <td>${m.metodo_pago}</td>
          <td style="text-align: right;">$${m.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        </tr>
      `).join('');

      const movimientosHTML = movimientos.map(m => `
        <tr>
          <td>${m.hora}</td>
          <td>${m.tipo === 'ingreso' ? '➕ Ingreso' : '➖ Egreso'}</td>
          <td>${m.concepto}</td>
          <td>${m.categoria || '-'}</td>
          <td>${m.metodo_pago}</td>
          <td style="text-align: right; color: ${m.tipo === 'ingreso' ? 'green' : 'red'};">$${m.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .empresa { font-weight: bold; font-size: 14px; }
            .resumen { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
            .card h3 { margin: 0 0 10px 0; font-size: 12px; color: #666; }
            .card .amount { font-size: 24px; font-weight: bold; color: #333; }
            .card.positive .amount { color: green; }
            .card.negative .amount { color: red; }
            .card.neutral .amount { color: #0066cc; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            table thead { background: #333; color: white; }
            table th { padding: 12px; text-align: left; font-size: 12px; font-weight: bold; }
            table td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
            table tbody tr:nth-child(even) { background: #f9f9f9; }
            .section-title { font-weight: bold; margin-top: 25px; margin-bottom: 10px; font-size: 12px; color: #333; border-left: 4px solid #0066cc; padding-left: 10px; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #999; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="empresa">📊 IMPRENTA EL GRÁFICO</div>
            <h1>CAJA DIARIA</h1>
            <p>${fechaFormato}</p>
          </div>

          <div class="resumen">
            <div class="card positive">
              <h3>💵 INGRESOS</h3>
              <div class="amount">$${ingresos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
            </div>
            <div class="card negative">
              <h3>➖ EGRESOS</h3>
              <div class="amount">$${egresos.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
            </div>
            <div class="card neutral">
              <h3>✅ SALDO</h3>
              <div class="amount">$${saldo.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
            </div>
          </div>

          <div class="section-title">💳 Desglose por Método de Pago</div>
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${metodosHTML}
            </tbody>
          </table>

          <div class="section-title">📝 Movimientos del Día</div>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Método</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${movimientosHTML}
            </tbody>
          </table>

          <div class="footer">
            <p>Generado: ${new Date().toLocaleString('es-AR')}</p>
            <p>📞 3878 22-4908 | El Gráfico de Orán - Salta</p>
          </div>
        </body>
        </html>
      `;

      // Generar PDF con Puppeteer
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', margin: { top: 20, right: 20, bottom: 20, left: 20 } });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Caja-Diaria-${fecha}.pdf"`);
      res.send(pdf);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Error al generar PDF: ' + err.message);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ANÁLISIS ABC DE PRODUCTOS
  // ═══════════════════════════════════════════════════════════════════════
  router.get('/productos', async (req, res) => {
    try {
      const periodo = req.query.periodo || 'mes';
      let fechaInicio = new Date();

      // Calcular fecha de inicio según período
      switch (periodo) {
        case 'trimestre':
          fechaInicio.setMonth(fechaInicio.getMonth() - 3);
          break;
        case 'semestre':
          fechaInicio.setMonth(fechaInicio.getMonth() - 6);
          break;
        case 'año':
          fechaInicio.setFullYear(fechaInicio.getFullYear(), 0, 1);
          break;
        case 'todo':
          fechaInicio = new Date('2000-01-01');
          break;
        case 'mes':
        default:
          fechaInicio.setDate(1);
      }

      const fechaInicio_str = fechaInicio.toISOString().slice(0, 10);

      // Query: Obtener productos vendidos agrupados
      const productosVentas = await db.all(`
        SELECT
          pr.material AS producto,
          SUM(pr.cantidad) AS unidades_vendidas,
          SUM(pr.precio) AS ventas_totales,
          COUNT(DISTINCT pr.pedido_id) AS pedidos_count
        FROM productos pr
        INNER JOIN pedidos p ON p.id = pr.pedido_id
        WHERE p.estado != 'CANCELADO'
          AND pr.material IS NOT NULL
          AND pr.material != ''
          AND DATE(p.fecha) >= ?
        GROUP BY pr.material
        ORDER BY ventas_totales DESC
      `, fechaInicio_str) || [];

      // Calcular análisis ABC
      let totalVentas = 0;
      productosVentas.forEach(p => {
        totalVentas += p.ventas_totales || 0;
      });

      let acumulado = 0;
      let conteoA = 0, conteoB = 0, conteoC = 0;

      productosVentas.forEach((p, i) => {
        p.porcentaje = totalVentas > 0 ? ((p.ventas_totales || 0) / totalVentas) * 100 : 0;
        acumulado += p.porcentaje;
        p.porcentaje_acumulado = acumulado;
        p.rank = i + 1;

        if (acumulado <= 80) {
          p.clase = 'A';
          conteoA++;
        } else if (acumulado <= 95) {
          p.clase = 'B';
          conteoB++;
        } else {
          p.clase = 'C';
          conteoC++;
        }
      });

      // Datos para gráficos
      const top10 = productosVentas.slice(0, 10);
      const top10Labels = top10.map(p => p.producto);
      const top10Datos = top10.map(p => p.ventas_totales);

      // Ingresos por clase ABC
      const ingresosPorClase = {
        A: productosVentas.filter(p => p.clase === 'A').reduce((s, p) => s + (p.ventas_totales || 0), 0),
        B: productosVentas.filter(p => p.clase === 'B').reduce((s, p) => s + (p.ventas_totales || 0), 0),
        C: productosVentas.filter(p => p.clase === 'C').reduce((s, p) => s + (p.ventas_totales || 0), 0)
      };

      res.render('reportes/productos', {
        title: 'Análisis ABC de Productos',
        periodo,
        productosVentas,
        totalVentas,
        conteoA,
        conteoB,
        conteoC,
        top10Labels: JSON.stringify(top10Labels),
        top10Datos: JSON.stringify(top10Datos),
        ingresosPorClase: JSON.stringify([
          { label: 'Clase A', value: ingresosPorClase.A, color: '#198754' },
          { label: 'Clase B', value: ingresosPorClase.B, color: '#ffc107' },
          { label: 'Clase C', value: ingresosPorClase.C, color: '#dc3545' }
        ])
      });
    } catch (err) {
      console.error('Error en análisis ABC:', err);
      res.status(500).render('error', {
        title: 'Error',
        mensaje: 'Error al cargar análisis ABC',
        error: err.message
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ESTADO FINANCIERO SIMPLIFICADO
  // ════════════════════════════════════════════════════════════════════════════

  // Helper para obtener datos del Estado Financiero
  async function obtenerDatosFinancieros(mes) {
    const [year, month] = mes.split('-');
    const fechaInicio = `${year}-${month}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const fechaFin = `${year}-${month}-${lastDay}`;

    // Balance consolidado desde la fuente única de verdad
    const balance = await calcularBalanceMes(db, mes);
    const ingresosTotales     = balance.ingresosCaja;
    const totalGastosNegocio  = balance.gastosNegocio;
    const totalGastosPersonales = balance.gastosPersonales;
    const gastosTotales       = balance.gastosTotales;
    const resultadoNeto       = balance.resultadoNeto;

    // Desglose por categoría (solo para la tabla del reporte, no afecta los totales)
    const gastosPorCategoria = await db.all(
      "SELECT categoria, COALESCE(SUM(monto),0) AS total, COUNT(*) AS cant FROM gastos WHERE tipo = 'negocio' AND SUBSTR(fecha,1,10) BETWEEN ? AND ? GROUP BY categoria ORDER BY total DESC",
      [fechaInicio, fechaFin]
    ) || [];

    const pedidosRow = await db.get(
      "SELECT COUNT(*) AS cant, COALESCE(SUM(precio),0) AS facturado FROM pedidos WHERE estado='ENTREGADO' AND DATE(fecha) BETWEEN ? AND ?",
      [fechaInicio, fechaFin]
    );

    const cuentasPorCobrar = await db.get(
      "SELECT COUNT(*) AS cant, COALESCE(SUM(monto_restante),0) AS total FROM pedidos WHERE monto_restante > 0"
    );

    const deudaTarjetas = (await db.get(
      "SELECT COALESCE(SUM(saldo_adeudado),0) AS t FROM deudas_tarjetas WHERE estado='activa'"
    ))?.t || 0;

    let conclusion, por100;
    if (ingresosTotales > 0 && resultadoNeto >= 0) {
      por100 = Math.round((resultadoNeto / ingresosTotales) * 100);
      conclusion = `Este mes tu negocio ganó $${Math.round(resultadoNeto).toLocaleString('es-AR')}. Por cada $100 que ingresó, $${por100} fueron ganancia. Tu negocio está funcionando bien.`;
    } else if (resultadoNeto < 0) {
      por100 = null;
      conclusion = `Este mes tu negocio gastó $${Math.round(Math.abs(resultadoNeto)).toLocaleString('es-AR')} más de lo que ingresó. Revisá qué gastos podés reducir o cómo aumentar las ventas el próximo mes.`;
    } else {
      por100 = 0;
      conclusion = 'No hay ingresos registrados para este mes todavía.';
    }

    return {
      ingresosTotales,
      gastosPorCategoria,
      totalGastosNegocio,
      totalGastosPersonales,
      gastosTotales,
      resultadoNeto,
      pedidosEntregados: pedidosRow,
      cuentasPorCobrar,
      deudaTarjetas,
      conclusion,
      por100,
      mes,
      fechaInicio,
      fechaFin
    };
  }

  // GET /reportes/financiero - Estado Financiero Simplificado
  router.get('/financiero', async (req, res) => {
    try {
      const now = new Date();
      const mes = req.query.mes || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const datos = await obtenerDatosFinancieros(mes);
      res.render('reportes/financiero', {
        title: `Estado Financiero - ${mes}`,
        ...datos,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch(err) {
      console.error('Error reporte financiero:', err);
      req.flash('error', 'Error al generar el reporte: ' + err.message);
      res.redirect('/reportes');
    }
  });

  // GET /reportes/financiero/pdf - Exportar PDF
  router.get('/financiero/pdf', async (req, res) => {
    try {
      const now = new Date();
      const mes = req.query.mes || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const datos = await obtenerDatosFinancieros(mes);

      // Generar tabla de gastos por categoría
      const tablGastos = datos.gastosPorCategoria.map(g => {
        const pct = datos.gastosTotales > 0 ? ((g.total / datos.gastosTotales) * 100).toFixed(1) : 0;
        return `<tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${g.categoria}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">$${Math.round(g.total).toLocaleString('es-AR')}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${pct}%</td>
        </tr>`;
      }).join('');

      const bgSemaforo = datos.resultadoNeto >= 0 ? '#d4edda' : '#f8d7da';
      const colorTexto = datos.resultadoNeto >= 0 ? '#155724' : '#721c24';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
            .fecha { text-align: center; color: #666; margin-bottom: 30px; }
            .semaforo { background: ${bgSemaforo}; color: ${colorTexto}; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
            .resultado { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .conclusion { font-size: 14px; line-height: 1.5; }
            .kpis { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 30px; }
            .kpi-card { border: 1px solid #ddd; padding: 10px; border-radius: 5px; text-align: center; }
            .kpi-label { font-size: 12px; color: #666; }
            .kpi-valor { font-size: 16px; font-weight: bold; }
            .section-title { background: #f5f5f5; padding: 10px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f5f5f5; border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: bold; }
            td { border: 1px solid #ddd; padding: 8px; }
            .text-right { text-align: right; }
            footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <h1>📊 Estado Financiero</h1>
          <div class="fecha">${mes}</div>

          <div class="semaforo">
            <div class="resultado">$${Math.round(datos.resultadoNeto).toLocaleString('es-AR')}</div>
            <div class="conclusion">${datos.conclusion}</div>
          </div>

          <div class="section-title">Resumen del Mes</div>
          <div class="kpis">
            <div class="kpi-card">
              <div class="kpi-label">Ingresos Totales</div>
              <div class="kpi-valor">$${Math.round(datos.ingresosTotales).toLocaleString('es-AR')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Gastos Negocio</div>
              <div class="kpi-valor">$${Math.round(datos.totalGastosNegocio).toLocaleString('es-AR')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Gastos Personales</div>
              <div class="kpi-valor">$${Math.round(datos.totalGastosPersonales).toLocaleString('es-AR')}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Pedidos Entregados</div>
              <div class="kpi-valor">${datos.pedidosEntregados?.cant || 0}</div>
            </div>
          </div>

          <div class="section-title">Gastos de Negocio por Categoría</div>
          <table>
            <tr>
              <th>Categoría</th>
              <th class="text-right">Monto</th>
              <th class="text-right">%</th>
            </tr>
            ${tablGastos || '<tr><td colspan="3" style="text-align: center; color: #999;">Sin gastos registrados</td></tr>'}
          </table>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
              <div style="font-weight: bold; margin-bottom: 10px;">💰 Cuentas por Cobrar</div>
              <div style="font-size: 18px; color: #0066cc;">$${Math.round(datos.cuentasPorCobrar?.total || 0).toLocaleString('es-AR')}</div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">${datos.cuentasPorCobrar?.cant || 0} clientes</div>
            </div>
            <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
              <div style="font-weight: bold; margin-bottom: 10px;">💳 Deuda Tarjetas Activas</div>
              <div style="font-size: 18px; color: #dc3545;">$${Math.round(datos.deudaTarjetas).toLocaleString('es-AR')}</div>
            </div>
          </div>

          <footer>
            <p>Generado por Sistema de Gestión Imprenta El Gráfico</p>
            <p style="margin-top: 10px;">Este reporte es confidencial y está destinado únicamente para el propietario del negocio.</p>
          </footer>
        </body>
        </html>
      `;

      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', margin: { top: 15, right: 15, bottom: 15, left: 15 } });
      await browser.close();

      const filename = `estado-financiero-${mes}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdf);
    } catch(err) {
      console.error('Error generando PDF:', err);
      req.flash('error', 'Error al generar PDF: ' + err.message);
      res.redirect('/reportes/financiero?mes=' + (req.query.mes || ''));
    }
  });

  return router;
};
