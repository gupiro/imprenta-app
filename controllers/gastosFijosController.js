// controllers/gastosFijosController.js

function obtenerFechaLocal() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const year = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  const horas = String(now.getHours()).padStart(2, '0');
  const minutos = String(now.getMinutes()).padStart(2, '0');
  const segundos = String(now.getSeconds()).padStart(2, '0');

  return {
    fecha: `${year}-${mes}-${dia}`,
    timestamp: `${year}-${mes}-${dia} ${horas}:${minutos}:${segundos}`
  };
}

const CATEGORIAS = [
  'Alquiler',
  'Servicios (Luz, Gas, Internet)',
  'Sueldos',
  'Seguros',
  'Proveedores',
  'Mantenimiento',
  'Impuestos',
  'Otros'
];

const FRECUENCIAS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'anual', label: 'Anual' }
];

module.exports = (db) => {
  return {
    listar: async (req, res) => {
      try {
        const gastosFijos = await db.all(`
          SELECT * FROM gastos_fijos
          WHERE activo = 1
          ORDER BY dia_vencimiento ASC
        `) || [];

        // Calcular estado de cada gasto y pagos del mes actual
        const hoy = new Date();
        const diaHoy = hoy.getDate();
        const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

        for (const gf of gastosFijos) {
          // Estado visual
          const diasHasta = gf.dia_vencimiento - diaHoy;
          if (diasHasta < 0) {
            gf.estado = 'vencido';
            gf.iconoEstado = '🔴';
          } else if (diasHasta <= 3) {
            gf.estado = 'proximo';
            gf.iconoEstado = '🟡';
          } else {
            gf.estado = 'ok';
            gf.iconoEstado = '🟢';
          }

          // Calcular pagos del mes actual
          const pagosDelMes = await db.all(`
            SELECT monto_pagado FROM pagos_gastos_fijos
            WHERE gasto_fijo_id = ? AND fecha_pago LIKE ?
          `, [gf.id, `${mesActual}%`]) || [];

          gf.pagado_mes = pagosDelMes.reduce((sum, p) => sum + p.monto_pagado, 0);
          gf.falta_pagar = Math.max(0, gf.monto - gf.pagado_mes);
          gf.porcentaje_pagado = gf.monto > 0 ? Math.round((gf.pagado_mes / gf.monto) * 100) : 0;
        }

        // Calcular totales
        const totalMensual = gastosFijos.reduce((sum, gf) => {
          switch (gf.frecuencia) {
            case 'semanal':
              return sum + (gf.monto * 4.33);
            case 'quincenal':
              return sum + (gf.monto * 2.17);
            case 'mensual':
              return sum + gf.monto;
            case 'anual':
              return sum + (gf.monto / 12);
            default:
              return sum;
          }
        }, 0);

        const proximoVencimiento = gastosFijos
          .filter(gf => gf.dia_vencimiento >= diaHoy)
          .sort((a, b) => a.dia_vencimiento - b.dia_vencimiento)[0] || null;

        res.render('finanzas/gastos-fijos', {
          title: 'Gastos Fijos',
          gastosFijos,
          totalMensual,
          cantidadActivos: gastosFijos.length,
          proximoVencimiento,
          CATEGORIAS,
          FRECUENCIAS,
          success: req.flash('success'),
          error: req.flash('error')
        });
      } catch (err) {
        console.error('Error al listar gastos fijos:', err);
        req.flash('error', 'Error al cargar gastos fijos');
        res.redirect('/');
      }
    },

    crear: async (req, res) => {
      try {
        const { nombre, categoria, frecuencia, monto, dia_vencimiento, notas } = req.body;

        if (!nombre || !categoria || !frecuencia || !monto || !dia_vencimiento) {
          req.flash('error', 'Faltan campos obligatorios');
          return res.redirect('/finanzas/gastos-fijos');
        }

        await db.run(
          `INSERT INTO gastos_fijos (nombre, categoria, frecuencia, monto, dia_vencimiento, notas)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [nombre, categoria, frecuencia, parseFloat(monto), parseInt(dia_vencimiento), notas || null]
        );

        req.flash('success', `✅ Gasto fijo "${nombre}" creado exitosamente`);
        res.redirect('/finanzas/gastos-fijos');
      } catch (err) {
        console.error('Error al crear gasto fijo:', err);
        req.flash('error', 'Error al crear gasto fijo');
        res.redirect('/finanzas/gastos-fijos');
      }
    },

    editar: async (req, res) => {
      try {
        const { id } = req.params;
        const { nombre, categoria, frecuencia, monto, dia_vencimiento, notas } = req.body;

        if (!nombre || !categoria || !frecuencia || !monto || !dia_vencimiento) {
          req.flash('error', 'Faltan campos obligatorios');
          return res.redirect('/finanzas/gastos-fijos');
        }

        await db.run(
          `UPDATE gastos_fijos
           SET nombre = ?, categoria = ?, frecuencia = ?, monto = ?, dia_vencimiento = ?, notas = ?
           WHERE id = ?`,
          [nombre, categoria, frecuencia, parseFloat(monto), parseInt(dia_vencimiento), notas || null, id]
        );

        req.flash('success', `✅ Gasto fijo actualizado`);
        res.redirect('/finanzas/gastos-fijos');
      } catch (err) {
        console.error('Error al editar gasto fijo:', err);
        req.flash('error', 'Error al editar gasto fijo');
        res.redirect('/finanzas/gastos-fijos');
      }
    },

    eliminar: async (req, res) => {
      try {
        const { id } = req.params;

        const gf = await db.get('SELECT nombre FROM gastos_fijos WHERE id = ?', [id]);
        if (!gf) {
          req.flash('error', 'Gasto fijo no encontrado');
          return res.redirect('/finanzas/gastos-fijos');
        }

        await db.run('UPDATE gastos_fijos SET activo = 0 WHERE id = ?', [id]);

        req.flash('success', `✅ Gasto fijo "${gf.nombre}" eliminado`);
        res.redirect('/finanzas/gastos-fijos');
      } catch (err) {
        console.error('Error al eliminar gasto fijo:', err);
        req.flash('error', 'Error al eliminar gasto fijo');
        res.redirect('/finanzas/gastos-fijos');
      }
    },

    marcarPagado: async (req, res) => {
      try {
        const { id } = req.params;
        const { timestamp, fecha } = obtenerFechaLocal();

        const gf = await db.get('SELECT * FROM gastos_fijos WHERE id = ?', [id]);
        if (!gf) {
          return res.json({ success: false, error: 'Gasto fijo no encontrado' });
        }

        // Registrar en caja diaria
        const cajaResult = await db.run(
          `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, fecha)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['egreso', `Gasto Fijo: ${gf.nombre}`, gf.categoria, gf.monto, 'manual', timestamp]
        );

        // Registrar pago en tabla de pagos
        await db.run(
          `INSERT INTO pagos_gastos_fijos (gasto_fijo_id, monto_pagado, fecha_pago, metodo_pago, caja_id)
           VALUES (?, ?, ?, ?, ?)`,
          [id, gf.monto, fecha, 'manual', cajaResult.lastID]
        );

        // Actualizar última pagada
        await db.run(
          'UPDATE gastos_fijos SET ultima_pagada = ? WHERE id = ?',
          [fecha, id]
        );

        res.json({ success: true, message: 'Gasto marcado como pagado' });
      } catch (err) {
        console.error('Error al marcar gasto como pagado:', err);
        res.json({ success: false, error: err.message });
      }
    },

    registrarPagoParcial: async (req, res) => {
      try {
        const { id } = req.params;
        const { monto, metodo_pago, notas } = req.body;

        if (!monto || monto <= 0) {
          return res.json({ success: false, error: 'El monto debe ser mayor a 0' });
        }

        const gf = await db.get('SELECT * FROM gastos_fijos WHERE id = ?', [id]);
        if (!gf) {
          return res.json({ success: false, error: 'Gasto fijo no encontrado' });
        }

        const { timestamp, fecha } = obtenerFechaLocal();

        // Registrar en caja diaria
        const cajaResult = await db.run(
          `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, fecha)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['egreso', `Pago Parcial - ${gf.nombre}`, gf.categoria, parseFloat(monto), metodo_pago || 'manual', timestamp]
        );

        // Registrar pago en tabla de pagos
        await db.run(
          `INSERT INTO pagos_gastos_fijos (gasto_fijo_id, monto_pagado, fecha_pago, metodo_pago, notas, caja_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, parseFloat(monto), fecha, metodo_pago || 'manual', notas || null, cajaResult.lastID]
        );

        res.json({ success: true, message: `Pago de $${parseFloat(monto).toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado` });
      } catch (err) {
        console.error('Error al registrar pago parcial:', err);
        res.json({ success: false, error: err.message });
      }
    }
  };
};
