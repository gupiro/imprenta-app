const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

module.exports = (db) => {
  const router = express.Router();

  // GET /reportes - Página principal de reportes
  router.get('/', async (req, res) => {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const fechaInicio = inicioMes.toISOString().slice(0, 10);

      // Estadísticas generales
      const totalPedidos = (await db.get("SELECT COUNT(*) AS c FROM pedidos"))?.c || 0;
      const totalPresupuestos = (await db.get("SELECT COUNT(*) AS c FROM presupuestos"))?.c || 0;
      const totalClientes = (await db.get("SELECT COUNT(*) AS c FROM clients"))?.c || 0;

      const ingresosMes = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) >= ?",
        fechaInicio
      ))?.total || 0;

      const egresosMes = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso' AND DATE(fecha) >= ?",
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
      const mes = req.query.mes || new Date().toISOString().slice(0, 7);
      const [anno, mesNum] = mes.split('-');
      const fechaInicio = `${anno}-${mesNum}-01`;
      const lastDay = new Date(anno, mesNum, 0).getDate();
      const fechaFin = `${anno}-${mesNum}-${lastDay}`;

      // Ingresos y egresos
      const ingresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) BETWEEN ? AND ?",
        fechaInicio, fechaFin
      ))?.total || 0;

      const egresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso' AND DATE(fecha) BETWEEN ? AND ?",
        fechaInicio, fechaFin
      ))?.total || 0;

      // Detalles por categoría
      const movimientos = await db.all(`
        SELECT categoria, tipo, COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS total
        FROM movimientos_caja
        WHERE DATE(fecha) BETWEEN ? AND ?
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
      const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
      const fechaFormato = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Ingresos y egresos del día
      const ingresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) = ?",
        fecha
      ))?.total || 0;

      const egresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso' AND DATE(fecha) = ?",
        fecha
      ))?.total || 0;

      // Movimientos detallados
      const movimientos = await db.all(`
        SELECT tipo, concepto, categoria, monto, metodo_pago, fecha
        FROM movimientos_caja
        WHERE DATE(fecha) = ?
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
        WHERE tipo = 'ingreso' AND DATE(fecha) = ?
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
        SELECT p.id, p.precio, p.monto_entregado, p.monto_restante, p.fecha_pago,
               c.id AS cliente_id, c.name AS cliente_nombre, c.phone, c.email,
               ROUND((p.monto_restante / p.precio) * 100) AS porcentaje_deuda
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
      const fecha = req.params.fecha || new Date().toISOString().slice(0, 10);
      const fechaFormato = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Ingresos y egresos
      const ingresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) = ?",
        fecha
      ))?.total || 0;

      const egresos = (await db.get(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso' AND DATE(fecha) = ?",
        fecha
      ))?.total || 0;

      const saldo = ingresos - egresos;

      // Desglose por método de pago
      const metodos = await db.all(`
        SELECT metodo_pago, SUM(monto) AS total
        FROM movimientos_caja
        WHERE tipo = 'ingreso' AND DATE(fecha) = ?
        GROUP BY metodo_pago
        ORDER BY metodo_pago
      `, fecha) || [];

      // Movimientos detallados
      const movimientos = await db.all(`
        SELECT tipo, concepto, categoria, metodo_pago, monto,
               strftime('%H:%M:%S', fecha) AS hora
        FROM movimientos_caja
        WHERE DATE(fecha) = ?
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

  return router;
};
