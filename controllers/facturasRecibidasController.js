// controllers/facturasRecibidasController.js

function obtenerFechaLocal() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const year = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');

  return {
    fecha: `${year}-${mes}-${dia}`,
    periodo: `${year}-${mes}`
  };
}

const TIPOS_COMPROBANTE = [
  { value: 'A', label: 'Factura A (RI con IVA discriminado)' },
  { value: 'B', label: 'Factura B (RI a CF)' },
  { value: 'C', label: 'Factura C (Monotributista)' },
  { value: 'Ticket', label: 'Ticket' },
  { value: 'NC', label: 'Nota de Crédito' },
  { value: 'ND', label: 'Nota de Débito' }
];

const CATEGORIAS = [
  'Insumos',
  'Servicios',
  'Equipos',
  'Mantenimiento',
  'Otros'
];

module.exports = (db) => {
  return {
    listar: async (req, res) => {
      try {
        const periodo = req.query.periodo || obtenerFechaLocal().periodo;
        const estado = req.query.estado || 'todos';

        let query = `
          SELECT f.*, p.nombre as proveedor_nombre, p.cuit as proveedor_cuit
          FROM facturas_recibidas f
          LEFT JOIN proveedores p ON f.proveedor_id = p.id
          WHERE f.activo = 1 AND f.periodo LIKE ?
        `;
        const params = [`${periodo}%`];

        if (estado !== 'todos') {
          query += ' AND f.estado = ?';
          params.push(estado);
        }

        query += ' ORDER BY f.fecha_emision DESC';

        const facturas = await db.all(query, params) || [];

        // Calcular totales del período
        const totalNeto = facturas.reduce((sum, f) => sum + (f.monto_neto || 0), 0);
        const totalIva = facturas.reduce((sum, f) => sum + (f.monto_iva || 0), 0);
        const totalFacturas = facturas.reduce((sum, f) => sum + (f.monto_total || 0), 0);
        const totalPagado = facturas.filter(f => f.estado === 'pagada').reduce((sum, f) => sum + (f.monto_total || 0), 0);
        const totalPendiente = facturas.filter(f => f.estado === 'pendiente').reduce((sum, f) => sum + (f.monto_total - (f.monto_pagado || 0)), 0);

        // Detectar facturas pendientes de hace más de 30 días
        const hoy30 = new Date();
        hoy30.setDate(hoy30.getDate() - 30);
        const fecha30 = hoy30.toISOString().slice(0, 10);

        const facturasVencidas = facturas.filter(f => f.estado === 'pendiente' && f.fecha_emision <= fecha30) || [];
        const totalVencidas = facturasVencidas.reduce((sum, f) => sum + (f.monto_total - (f.monto_pagado || 0)), 0);

        // Obtener listado de proveedores para autocomplete
        const proveedores = await db.all('SELECT id, nombre, cuit, alicuota_iva_default FROM proveedores ORDER BY nombre ASC') || [];

        res.render('finanzas/facturas-recibidas', {
          title: 'Facturas Recibidas',
          facturas,
          periodo,
          estado,
          proveedores,
          TIPOS_COMPROBANTE,
          CATEGORIAS,
          totalNeto,
          totalIva,
          totalFacturas,
          totalPagado,
          totalPendiente,
          facturasVencidas,
          totalVencidas,
          success: req.flash('success'),
          error: req.flash('error')
        });
      } catch (err) {
        console.error('Error al listar facturas:', err);
        req.flash('error', 'Error al cargar facturas');
        res.redirect('/');
      }
    },

    crear: async (req, res) => {
      try {
        const { tipo_comprobante, numero_comprobante, fecha_emision, proveedor_id, razon_social, concepto, monto_neto, alicuota_iva, monto_iva, estado, fecha_pago, tiene_documento, notas } = req.body;

        // Validaciones obligatorias simplificadas
        if (!tipo_comprobante || !numero_comprobante || !razon_social || !monto_neto) {
          req.flash('error', '❌ Completá los campos obligatorios: tipo, número, proveedor y monto neto.');
          return res.redirect('/finanzas/facturas-recibidas');
        }

        const montoNetoNum = parseFloat(monto_neto) || 0;
        const alicuotaNum = parseFloat(alicuota_iva) || 0;
        // Usar monto_iva del form si fue ingresado manualmente
        const montoIvaNum = parseFloat(monto_iva) || 0;
        const montoTotal = montoNetoNum + montoIvaNum;
        const periodo = fecha_emision ? fecha_emision.substring(0, 7) : obtenerFechaLocal().periodo;

        // Si ya está pagada: estado = 'pagada', monto_pagado = montoTotal
        const estadoFinal = estado === 'pagada' ? 'pagada' : 'pendiente';
        const montoPagadoFinal = estadoFinal === 'pagada' ? montoTotal : 0;
        const fechaPagoFinal = estadoFinal === 'pagada' ? (fecha_pago || obtenerFechaLocal().fecha) : null;
        const tieneDocNum = tiene_documento ? 1 : 0;

        await db.run(
          `INSERT INTO facturas_recibidas
           (tipo_comprobante, numero_comprobante, fecha_emision, proveedor_id, razon_social, descripcion, monto_neto, alicuota_iva, monto_iva, monto_total, monto_pagado, estado, fecha_pago, notas, periodo, tiene_documento)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [tipo_comprobante, numero_comprobante, fecha_emision || obtenerFechaLocal().fecha, proveedor_id || null, razon_social, concepto || '', montoNetoNum, alicuotaNum, montoIvaNum, montoTotal, montoPagadoFinal, estadoFinal, fechaPagoFinal || '', notas || '', periodo, tieneDocNum]
        );

        req.flash('success', `✅ Factura ${numero_comprobante} registrada correctamente — $${montoTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
        res.redirect(`/finanzas/facturas-recibidas?periodo=${periodo}`);
      } catch (err) {
        console.error('Error al crear factura:', err);
        req.flash('error', 'Error al registrar factura');
        res.redirect('/finanzas/facturas-recibidas');
      }
    },

    editar: async (req, res) => {
      try {
        const { id } = req.params;
        const { tipo_comprobante, numero_comprobante, fecha_emision, proveedor_id, razon_social, concepto, monto_neto, alicuota_iva, monto_iva, estado, fecha_pago, tiene_documento, notas } = req.body;

        if (!tipo_comprobante || !numero_comprobante || !razon_social || !monto_neto) {
          req.flash('error', '❌ Completá los campos obligatorios');
          return res.redirect('/finanzas/facturas-recibidas');
        }

        const montoNetoNum = parseFloat(monto_neto);
        const alicuotaNum = parseFloat(alicuota_iva) || 0;
        const montoIvaNum = parseFloat(monto_iva) || 0;
        const montoTotal = montoNetoNum + montoIvaNum;

        const estadoFinal = estado === 'pagada' ? 'pagada' : 'pendiente';
        const montoPagadoFinal = estadoFinal === 'pagada' ? montoTotal : 0;
        const fechaPagoFinal = estadoFinal === 'pagada' ? (fecha_pago || obtenerFechaLocal().fecha) : null;
        const tieneDocNum = tiene_documento ? 1 : 0;

        await db.run(
          `UPDATE facturas_recibidas
           SET tipo_comprobante = ?, numero_comprobante = ?, fecha_emision = ?, proveedor_id = ?, razon_social = ?, descripcion = ?, monto_neto = ?, alicuota_iva = ?, monto_iva = ?, monto_total = ?, monto_pagado = ?, estado = ?, fecha_pago = ?, notas = ?, tiene_documento = ?
           WHERE id = ?`,
          [tipo_comprobante, numero_comprobante, fecha_emision, proveedor_id || null, razon_social, concepto || '', montoNetoNum, alicuotaNum, montoIvaNum, montoTotal, montoPagadoFinal, estadoFinal, fechaPagoFinal || '', notas || '', tieneDocNum, id]
        );

        req.flash('success', '✅ Factura actualizada correctamente');
        res.redirect('/finanzas/facturas-recibidas');
      } catch (err) {
        console.error('Error al editar factura:', err);
        req.flash('error', 'Error al actualizar factura');
        res.redirect('/finanzas/facturas-recibidas');
      }
    },

    eliminar: async (req, res) => {
      try {
        const { id } = req.params;

        const factura = await db.get('SELECT numero_comprobante FROM facturas_recibidas WHERE id = ?', [id]);
        if (!factura) {
          req.flash('error', 'Factura no encontrada');
          return res.redirect('/finanzas/facturas-recibidas');
        }

        await db.run('UPDATE facturas_recibidas SET activo = 0 WHERE id = ?', [id]);

        req.flash('success', `✅ Factura ${factura.numero_comprobante} eliminada`);
        res.redirect('/finanzas/facturas-recibidas');
      } catch (err) {
        console.error('Error al eliminar factura:', err);
        req.flash('error', 'Error al eliminar factura');
        res.redirect('/finanzas/facturas-recibidas');
      }
    },

    cambiarEstado: async (req, res) => {
      try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!['pendiente', 'pagada', 'parcial'].includes(estado)) {
          return res.json({ success: false, error: 'Estado inválido' });
        }

        await db.run('UPDATE facturas_recibidas SET estado = ? WHERE id = ?', [estado, id]);

        res.json({ success: true, message: `Estado actualizado a: ${estado}` });
      } catch (err) {
        console.error('Error al cambiar estado:', err);
        res.json({ success: false, error: err.message });
      }
    },

    getDetalle: async (req, res) => {
      try {
        const { id } = req.params;
        const factura = await db.get('SELECT * FROM facturas_recibidas WHERE id = ?', [id]);

        if (!factura) {
          return res.json({ success: false, error: 'Factura no encontrada' });
        }

        // Obtener pagos registrados
        const pagos = await db.all('SELECT * FROM pagos_facturas WHERE factura_id = ? ORDER BY fecha_pago DESC', [id]) || [];
        const montoPagado = factura.monto_pagado || 0;
        const saldoPendiente = factura.monto_total - montoPagado;

        res.json({
          success: true,
          factura,
          pagos,
          montoPagado,
          saldoPendiente
        });
      } catch (err) {
        console.error('Error al obtener detalle:', err);
        res.json({ success: false, error: err.message });
      }
    },

    registrarPago: async (req, res) => {
      try {
        const { id } = req.params;
        const { monto_pagado, metodo_pago, notas, fecha_pago } = req.body;

        const factura = await db.get('SELECT * FROM facturas_recibidas WHERE id = ?', [id]);
        if (!factura) {
          return res.json({ success: false, error: 'Factura no encontrada' });
        }

        const montoPagadoNum = parseFloat(monto_pagado);
        const montoPagadoActual = factura.monto_pagado || 0;
        const nuevoMontoPagado = montoPagadoActual + montoPagadoNum;

        // Validar que no se pague más del total
        if (nuevoMontoPagado > factura.monto_total) {
          return res.json({ success: false, error: `No puedes pagar más del total. Saldo pendiente: $${(factura.monto_total - montoPagadoActual).toLocaleString('es-AR', {minimumFractionDigits: 2})}` });
        }

        const fechaPago = fecha_pago || obtenerFechaLocal().fecha;

        // Registrar pago en tabla pagos_facturas
        const result = await db.run(
          `INSERT INTO pagos_facturas (factura_id, monto_pagado, fecha_pago, metodo_pago, notas)
           VALUES (?, ?, ?, ?, ?)`,
          [id, montoPagadoNum, fechaPago, metodo_pago || '', notas || '']
        );

        // Actualizar monto_pagado en factura y estado
        let nuevoEstado = 'parcial';
        if (nuevoMontoPagado === factura.monto_total) {
          nuevoEstado = 'pagada';
        } else if (nuevoMontoPagado === 0) {
          nuevoEstado = 'pendiente';
        }

        await db.run(
          'UPDATE facturas_recibidas SET monto_pagado = ?, estado = ? WHERE id = ?',
          [nuevoMontoPagado, nuevoEstado, id]
        );

        // Registrar en Caja Diaria (movimientos_caja)
        await db.run(
          `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, fecha)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['egreso', `Pago Factura ${factura.numero_comprobante} - ${factura.razon_social}`, 'compras', montoPagadoNum, metodo_pago || 'otro', fechaPago]
        );

        res.json({
          success: true,
          message: `✅ Pago registrado: $${montoPagadoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})}`,
          nuevoEstado,
          montoPagado: nuevoMontoPagado,
          saldoPendiente: factura.monto_total - nuevoMontoPagado
        });
      } catch (err) {
        console.error('Error al registrar pago:', err);
        res.json({ success: false, error: err.message });
      }
    }
  };
};
