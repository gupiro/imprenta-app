// routes/finanzas.js

const express = require('express');
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {
  const router = express.Router();
  const gastosFijosController = require('../controllers/gastosFijosController')(db);
  const comprasCuotasController = require('../controllers/comprasCuotasController')(db);
  const facturasRecibidasController = require('../controllers/facturasRecibidasController')(db);
  const vencimientosFiscalesController = require('../controllers/vencimientosFiscalesController')(db);

  // ========== GASTOS FIJOS ==========

  router.get('/gastos-fijos', checkPermission, async (req, res) => {
    return gastosFijosController.listar(req, res);
  });

  router.post('/gastos-fijos/crear', checkPermission, async (req, res) => {
    return gastosFijosController.crear(req, res);
  });

  router.post('/gastos-fijos/:id/editar', checkPermission, async (req, res) => {
    return gastosFijosController.editar(req, res);
  });

  router.post('/gastos-fijos/:id/eliminar', checkPermission, async (req, res) => {
    return gastosFijosController.eliminar(req, res);
  });

  router.post('/gastos-fijos/:id/marcar-pagado', checkPermission, async (req, res) => {
    return gastosFijosController.marcarPagado(req, res);
  });

  router.post('/gastos-fijos/:id/pago-parcial', checkPermission, async (req, res) => {
    return gastosFijosController.registrarPagoParcial(req, res);
  });

  // ========== COMPRAS EN CUOTAS ==========

  router.get('/compras-cuotas', checkPermission, async (req, res) => {
    return comprasCuotasController.listar(req, res);
  });

  router.post('/compras-cuotas/crear', checkPermission, async (req, res) => {
    return comprasCuotasController.crear(req, res);
  });

  router.post('/compras-cuotas/:id/editar', checkPermission, async (req, res) => {
    return comprasCuotasController.editar(req, res);
  });

  router.post('/compras-cuotas/:id/eliminar', checkPermission, async (req, res) => {
    return comprasCuotasController.eliminar(req, res);
  });

  router.post('/compras-cuotas/:id/registrar-cuota', checkPermission, async (req, res) => {
    return comprasCuotasController.registrarCuota(req, res);
  });

  // ========== FACTURAS RECIBIDAS ==========

  router.get('/facturas-recibidas', checkPermission, async (req, res) => {
    return facturasRecibidasController.listar(req, res);
  });

  router.post('/facturas-recibidas/crear', checkPermission, async (req, res) => {
    return facturasRecibidasController.crear(req, res);
  });

  router.post('/facturas-recibidas/:id/editar', checkPermission, async (req, res) => {
    return facturasRecibidasController.editar(req, res);
  });

  router.post('/facturas-recibidas/:id/eliminar', checkPermission, async (req, res) => {
    return facturasRecibidasController.eliminar(req, res);
  });

  router.post('/facturas-recibidas/:id/cambiar-estado', checkPermission, async (req, res) => {
    return facturasRecibidasController.cambiarEstado(req, res);
  });

  router.get('/facturas-recibidas/:id/detalle', checkPermission, async (req, res) => {
    return facturasRecibidasController.getDetalle(req, res);
  });

  router.post('/facturas-recibidas/:id/registrar-pago', checkPermission, async (req, res) => {
    return facturasRecibidasController.registrarPago(req, res);
  });

  // ========== PDF EXPORT FACTURAS ==========
  router.get('/facturas-recibidas/pdf', checkPermission, async (req, res) => {
    try {
      const periodo = req.query.periodo || new Date().toISOString().slice(0, 7);

      const facturas = await db.all(
        `SELECT f.*, p.nombre as proveedor_nombre
         FROM facturas_recibidas f
         LEFT JOIN proveedores p ON f.proveedor_id = p.id
         WHERE f.activo = 1 AND f.periodo LIKE ?
         ORDER BY f.fecha_emision ASC`,
        [`${periodo}%`]
      ) || [];

      const totalNeto = facturas.reduce((s, f) => s + (f.monto_neto || 0), 0);
      const totalIva = facturas.reduce((s, f) => s + (f.monto_iva || 0), 0);
      const totalGeneral = facturas.reduce((s, f) => s + (f.monto_total || 0), 0);
      const totalPagado = facturas.filter(f => f.estado === 'pagada').reduce((s, f) => s + (f.monto_total || 0), 0);
      const totalPendiente = totalGeneral - totalPagado;

      const fmt = (n) => n.toLocaleString('es-AR', { minimumFractionDigits: 2 });
      const [anio, mes] = periodo.split('-');
      const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const periodoLabel = `${MESES[parseInt(mes)]} ${anio}`;

      const tiposColorClass = (tipo) => {
        if (tipo === 'A') return '#1e3a8a';
        if (tipo === 'B') return '#b45309';
        if (tipo === 'C') return '#15803d';
        if (tipo === 'Ticket') return '#991b1b';
        return '#6b7280';
      };

      const filas = facturas.map(f => `
        <tr>
          <td style="color:${tiposColorClass(f.tipo_comprobante)}; font-weight:bold;">${f.tipo_comprobante}</td>
          <td>${f.numero_comprobante}</td>
          <td>${f.proveedor_nombre || f.razon_social}</td>
          <td>${new Date(f.fecha_emision).toLocaleDateString('es-AR')}</td>
          <td style="text-align:right;">$${fmt(f.monto_neto || 0)}</td>
          <td style="text-align:right;">$${fmt(f.monto_iva || 0)}</td>
          <td style="text-align:right;"><strong>$${fmt(f.monto_total || 0)}</strong></td>
          <td style="color:${f.estado === 'pagada' ? 'green' : 'orange'}">${f.estado}</td>
        </tr>
      `).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 25px; }
        h1 { color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 5px; }
        h2 { color: #374151; font-size: 14px; margin: 10px 0 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #1e3a8a; color: white; padding: 7px; text-align: left; font-size: 10px; }
        td { padding: 6px 7px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
        tr:nth-child(even) { background: #f9fafb; }
        .totales { background: #f0f4ff; border: 2px solid #1e3a8a; padding: 15px; margin: 20px 0; }
        .totales table { margin: 0; }
        .totales td { border: none; padding: 4px 12px; }
        .grand-total { font-size: 14px; font-weight: bold; color: #1e3a8a; }
        .footer { margin-top: 30px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        .section-title { font-weight: bold; color: #1e3a8a; margin-top: 10px; }
      </style>
      </head><body>
      <h1>📄 Imprenta El Gráfico — Facturas Recibidas</h1>
      <h2>${periodoLabel}</h2>
      <p><strong>${facturas.length} factura(s) registrada(s)</strong></p>
      <table>
        <thead><tr><th>Tipo</th><th>Número</th><th>Proveedor</th><th>Fecha</th><th style="text-align:right;">Neto</th><th style="text-align:right;">IVA</th><th style="text-align:right;">Total</th><th>Estado</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="8" style="text-align:center; color:#6b7280;">Sin facturas en este período</td></tr>'}</tbody>
      </table>
      <div class="totales">
        <h3 style="margin:0 0 10px 0; color: #1e3a8a;">Totales del período</h3>
        <table>
          <tr><td>Total Neto (sin IVA):</td><td style="text-align:right;"><strong>$${fmt(totalNeto)}</strong></td></tr>
          <tr><td class="section-title">💡 IVA Crédito Fiscal (descuentas del IVA que cobraste):</td><td style="text-align:right;"><strong style="color:#1e3a8a;">$${fmt(totalIva)}</strong></td></tr>
          <tr><td class="section-title">Total General:</td><td style="text-align:right;" class="grand-total">$${fmt(totalGeneral)}</td></tr>
          <tr><td>✅ Total Pagado:</td><td style="text-align:right; color:green;"><strong>$${fmt(totalPagado)}</strong></td></tr>
          <tr><td>⏳ Total Pendiente:</td><td style="text-align:right; color:orange;"><strong>$${fmt(totalPendiente)}</strong></td></tr>
        </table>
      </div>
      <div class="footer">
        Documento generado para uso del contador — Imprenta El Gráfico<br>
        ${new Date().toLocaleDateString('es-AR', {day:'2-digit',month:'long',year:'numeric'})}
      </div>
      </body></html>`;

      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', margin: { top: 20, right: 20, bottom: 20, left: 20 } });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="facturas-${periodo}.pdf"`);
      res.send(pdf);
    } catch (err) {
      console.error('Error generando PDF:', err);
      req.flash('error', 'Error al generar PDF: ' + err.message);
      res.redirect('/finanzas/facturas-recibidas');
    }
  });

  // ========== VENCIMIENTOS FISCALES ==========

  router.get('/vencimientos-fiscales', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.listar(req, res);
  });

  router.post('/vencimientos-fiscales/crear', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.crear(req, res);
  });

  router.post('/vencimientos-fiscales/:id/editar', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.editar(req, res);
  });

  router.post('/vencimientos-fiscales/:id/eliminar', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.eliminar(req, res);
  });

  router.post('/vencimientos-fiscales/:id/pagar', checkPermission, async (req, res) => {
    return vencimientosFiscalesController.marcarPagado(req, res);
  });

  // ========== TESORERÍA INTELIGENTE ==========

  router.get('/tesoreria', checkPermission, async (req, res) => {
    try {
      const { calcularPrioridad } = require('../utils/pagosHelper');
      const pagosHelper = require('../utils/pagosHelper');

      // 1. SALDO REAL desde movimientos_caja
      const balanceResult = await db.all(`
        SELECT
          SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS total_ingresos,
          SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) AS total_egresos,
          metodo_pago,
          SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS ingresos_por_metodo,
          SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) AS egresos_por_metodo
        FROM movimientos_caja
        GROUP BY metodo_pago
      `, []);

      let saldoReal = 0;
      let desglosePorMetodo = { efectivo: 0, transferencia: 0, tarjeta: 0, qr: 0, cheque: 0 };

      if (balanceResult && balanceResult.length > 0) {
        balanceResult.forEach(row => {
          const ingresos = row.ingresos_por_metodo || 0;
          const egresos = row.egresos_por_metodo || 0;
          desglosePorMetodo[row.metodo_pago || 'efectivo'] = ingresos - egresos;
          saldoReal += ingresos - egresos;
        });
      }

      // 2. OBLIGACIONES DE 5 FUENTES
      let obligaciones = [];

      // Fuente 1: facturas_recibidas
      const facturas = await db.all(`
        SELECT id, numero_comprobante, razon_social, monto_total, monto_pagado,
               fecha_vencimiento_pago, estado
        FROM facturas_recibidas
        WHERE estado != 'pagada' AND activo = 1
        ORDER BY fecha_vencimiento_pago ASC
      `, []);

      if (facturas && facturas.length > 0) {
        facturas.forEach(f => {
          const pendiente = (f.monto_total || 0) - (f.monto_pagado || 0);
          if (pendiente > 0) {
            const daysLeft = f.fecha_vencimiento_pago ?
              Math.ceil((new Date(f.fecha_vencimiento_pago) - new Date()) / (1000 * 60 * 60 * 24)) :
              999;
            obligaciones.push({
              id: f.id,
              tipo: 'factura',
              descripcion: `${f.razon_social} - ${f.numero_comprobante}`,
              monto: pendiente,
              fecha_vencimiento: f.fecha_vencimiento_pago || '',
              dias_restantes: daysLeft,
              prioridad: calcularPrioridad(daysLeft),
              ruta_pago: `/finanzas/facturas-recibidas/${f.id}/detalle`
            });
          }
        });
      }

      // Fuente 2: gastos_fijos pendientes
      const FACTOR_MENSUAL = { semanal: 4.33, quincenal: 2.17, mensual: 1, bimestral: 0.5, trimestral: 1/3, semestral: 1/6, anual: 1/12 };
      const gastosFijos = await db.all(`
        SELECT id, nombre, monto, dia_vencimiento, frecuencia, activo
        FROM gastos_fijos
        WHERE activo = 1
      `, []);

      if (gastosFijos && gastosFijos.length > 0) {
        const hoy = new Date();
        const diaHoy = hoy.getDate();

        gastosFijos.forEach(gf => {
          const diaVencimiento = gf.dia_vencimiento || 1;
          let proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), diaVencimiento);

          if (diaHoy > diaVencimiento) {
            proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaVencimiento);
          }

          const daysLeft = Math.ceil((proximoVencimiento - hoy) / (1000 * 60 * 60 * 24));
          const monto = (gf.monto || 0) * (FACTOR_MENSUAL[gf.frecuencia] || 1);

          obligaciones.push({
            id: gf.id,
            tipo: 'gasto_fijo',
            descripcion: gf.nombre,
            monto: monto,
            fecha_vencimiento: proximoVencimiento.toISOString().split('T')[0],
            dias_restantes: daysLeft,
            prioridad: calcularPrioridad(daysLeft),
            ruta_pago: `/finanzas/gastos-fijos/${gf.id}/marcar-pagado`
          });
        });
      }

      // Fuente 3: vencimientos_fiscales
      const vencimientos = await db.all(`
        SELECT id, descripcion, monto_estimado, fecha_vencimiento, estado
        FROM vencimientos_fiscales
        WHERE estado != 'pagado'
        ORDER BY fecha_vencimiento ASC
      `, []);

      if (vencimientos && vencimientos.length > 0) {
        vencimientos.forEach(v => {
          const daysLeft = Math.ceil((new Date(v.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
          obligaciones.push({
            id: v.id,
            tipo: 'impuesto',
            descripcion: v.descripcion,
            monto: v.monto_estimado || 0,
            fecha_vencimiento: v.fecha_vencimiento,
            dias_restantes: daysLeft,
            prioridad: calcularPrioridad(daysLeft),
            ruta_pago: `/finanzas/vencimientos-fiscales/${v.id}/pagar`
          });
        });
      }

      // Fuente 4: compras_cuotas pendientes
      const cuotas = await db.all(`
        SELECT id, descripcion, monto_cuota, fecha_primera_cuota, cuotas_pagadas, cant_cuotas, activo
        FROM compras_cuotas
        WHERE activo = 1
      `, []);

      if (cuotas && cuotas.length > 0) {
        cuotas.forEach(c => {
          const cuotasPagadas = c.cuotas_pagadas || 0;
          const cantCuotas = c.cant_cuotas || 1;

          if (cuotasPagadas < cantCuotas) {
            const daysADesdeInicio = Math.floor((new Date() - new Date(c.fecha_primera_cuota)) / (1000 * 60 * 60 * 24));
            const daysPerCuota = 30; // asume cuotas mensuales
            const proximaCuota = cuotasPagadas + 1;
            const fechaProxima = new Date(c.fecha_primera_cuota);
            fechaProxima.setDate(fechaProxima.getDate() + (daysPerCuota * (proximaCuota - 1)));

            const daysLeft = Math.ceil((fechaProxima - new Date()) / (1000 * 60 * 60 * 24));

            obligaciones.push({
              id: c.id,
              tipo: 'cuota',
              descripcion: `${c.descripcion} (cuota ${proximaCuota}/${cantCuotas})`,
              monto: c.monto_cuota || 0,
              fecha_vencimiento: fechaProxima.toISOString().split('T')[0],
              dias_restantes: daysLeft,
              prioridad: calcularPrioridad(daysLeft),
              ruta_pago: `/finanzas/compras-cuotas/${c.id}/registrar-cuota`
            });
          }
        });
      }

      // Fuente 5: deudas_tarjetas
      const tarjetas = await db.all(`
        SELECT id, nombre_tarjeta, saldo_adeudado, monto_minimo, fecha_vencimiento, estado
        FROM deudas_tarjetas
        WHERE estado = 'activa'
      `, []);

      if (tarjetas && tarjetas.length > 0) {
        tarjetas.forEach(t => {
          const hoy = new Date();
          const diaVencimiento = t.fecha_vencimiento || 1;
          let proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), diaVencimiento);

          if (hoy.getDate() > diaVencimiento) {
            proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaVencimiento);
          }

          const daysLeft = Math.ceil((proximoVencimiento - hoy) / (1000 * 60 * 60 * 24));

          obligaciones.push({
            id: t.id,
            tipo: 'tarjeta',
            descripcion: t.nombre_tarjeta,
            monto: t.monto_minimo || t.saldo_adeudado || 0,
            fecha_vencimiento: proximoVencimiento.toISOString().split('T')[0],
            dias_restantes: daysLeft,
            prioridad: calcularPrioridad(daysLeft),
            ruta_pago: `/deudas/tarjetas/${t.id}/pagar`
          });
        });
      }

      // 3. Ordenar por urgencia y calcular proyecciones
      obligaciones.sort((a, b) => a.dias_restantes - b.dias_restantes);

      let totalProximos7 = 0, totalProximos30 = 0, totalMensual = 0;
      obligaciones.forEach(o => {
        if (o.dias_restantes <= 7) totalProximos7 += o.monto;
        if (o.dias_restantes <= 30) totalProximos30 += o.monto;
        if (o.dias_restantes <= 999) totalMensual += o.monto;

        // Añadir "alcanza" flag
        o.alcanza = saldoReal >= o.monto;
        o.deficit = Math.max(0, o.monto - saldoReal);
      });

      const alcanceEnDias = totalMensual > 0 ? Math.round((saldoReal / totalMensual) * 30) : 999;
      const mayorUrgencia = obligaciones.length > 0 ? obligaciones[0] : null;

      res.render('finanzas/tesoreria', {
        title: 'Tesorería Inteligente',
        saldoReal,
        desglosePorMetodo,
        obligaciones,
        totalProximos7,
        totalProximos30,
        totalMensual,
        alcanceEnDias,
        mayorUrgencia,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error en tesorería:', err);
      req.flash('error', 'Error al cargar tesorería: ' + err.message);
      res.redirect('/dashboard');
    }
  });

  return router;
};
