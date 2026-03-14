// controllers/comprasCuotasController.js

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
  'Maquinaria',
  'Insumos/Materiales',
  'Equipos tecnológicos',
  'Vehículo',
  'Otro'
];

module.exports = (db) => {
  return {
    listar: async (req, res) => {
      try {
        const compras = await db.all(`
          SELECT * FROM compras_cuotas
          WHERE activo = 1
          ORDER BY fecha_primera_cuota ASC
        `) || [];

        // Calcular estado de cada compra
        const hoy = new Date();
        const hoyStr = obtenerFechaLocal().fecha;

        for (const compra of compras) {
          // Cuota actual = próxima cuota a pagar (1-based)
          compra.cuota_actual = compra.cuotas_pagadas + 1;

          // Estado
          if (compra.cuota_actual > compra.cant_cuotas) {
            compra.estado = 'completada';
            compra.iconoEstado = '✅';
          } else {
            compra.estado = 'pendiente';
            compra.iconoEstado = '⏳';
          }

          // Saldo pendiente
          compra.cuotas_pendientes = compra.cant_cuotas - compra.cuotas_pagadas;
          compra.saldo_pendiente = compra.cuotas_pendientes * compra.monto_cuota;
          compra.porcentaje_pagado = Math.round((compra.cuotas_pagadas / compra.cant_cuotas) * 100);

          // Próxima cuota = fecha primera + cuotas_pagadas meses
          const proxFecha = new Date(compra.fecha_primera_cuota);
          proxFecha.setMonth(proxFecha.getMonth() + compra.cuotas_pagadas);
          compra.proxima_cuota_fecha = proxFecha.toLocaleDateString('es-AR');
        }

        // ────────────────────────────────────────
        // Resumen: Total cuotas este mes
        // ────────────────────────────────────────
        const hoyCtrl = new Date();
        const mesActual = hoyCtrl.getMonth();
        const anioActual = hoyCtrl.getFullYear();

        let totalEsteMes = 0;
        const desglosePago = {};

        for (const compra of compras) {
          if (compra.cuotas_pendientes <= 0) continue;

          const fechaPrimera = new Date(compra.fecha_primera_cuota);
          const mesOffset = (anioActual - fechaPrimera.getFullYear()) * 12 + (mesActual - fechaPrimera.getMonth());
          const numeroCuotaEsteMes = mesOffset + 1;

          if (numeroCuotaEsteMes >= 1 && numeroCuotaEsteMes <= compra.cant_cuotas && numeroCuotaEsteMes > compra.cuotas_pagadas) {
            totalEsteMes += compra.monto_cuota;
            const medio = compra.medio_pago || 'otro';
            desglosePago[medio] = (desglosePago[medio] || 0) + compra.monto_cuota;
          }
        }

        // ────────────────────────────────────────
        // Timeline: Próximos 6 meses
        // ────────────────────────────────────────
        const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const timeline = [];

        for (let i = 0; i < 6; i++) {
          const mesObj = new Date(anioActual, mesActual + i, 1);
          const m = mesObj.getMonth();
          const a = mesObj.getFullYear();
          let totalMes = 0;
          const comprasMes = [];

          for (const compra of compras) {
            const fechaPrimera = new Date(compra.fecha_primera_cuota);
            const mesOffset = (a - fechaPrimera.getFullYear()) * 12 + (m - fechaPrimera.getMonth());
            const numeroCuota = mesOffset + 1;

            if (numeroCuota >= 1 && numeroCuota <= compra.cant_cuotas) {
              totalMes += compra.monto_cuota;
              comprasMes.push({ desc: compra.descripcion, monto: compra.monto_cuota });
            }
          }

          timeline.push({
            label: `${MESES_ES[m]} ${a}`,
            total: totalMes,
            compras: comprasMes,
            esActual: i === 0
          });
        }

        res.render('finanzas/compras-cuotas', {
          title: 'Compras en Cuotas',
          compras,
          CATEGORIAS,
          totalEsteMes,
          desglosePago,
          timeline,
          success: req.flash('success'),
          error: req.flash('error')
        });
      } catch (err) {
        console.error('Error al listar compras en cuotas:', err);
        req.flash('error', 'Error al cargar compras');
        res.redirect('/');
      }
    },

    crear: async (req, res) => {
      try {
        const { descripcion, proveedor, fecha_compra, monto_total, cant_cuotas, fecha_primera_cuota, medio_pago, categoria, notas, monto_cuota } = req.body;

        if (!descripcion || !monto_total || !cant_cuotas || !fecha_primera_cuota) {
          req.flash('error', 'Faltan campos obligatorios');
          return res.redirect('/finanzas/compras-cuotas');
        }

        // Si el usuario ingresó monto_cuota manualmente, usarlo; sino calcular
        const montoCuota = monto_cuota
          ? parseFloat(monto_cuota)
          : parseFloat(monto_total) / parseInt(cant_cuotas);

        await db.run(
          `INSERT INTO compras_cuotas (descripcion, proveedor, fecha_compra, monto_total, cant_cuotas, monto_cuota, fecha_primera_cuota, medio_pago, categoria, notas)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [descripcion, proveedor || '', fecha_compra || obtenerFechaLocal().fecha, parseFloat(monto_total), parseInt(cant_cuotas), montoCuota, fecha_primera_cuota, medio_pago || '', categoria || '', notas || null]
        );

        req.flash('success', `✅ Compra en cuotas "${descripcion}" registrada (${cant_cuotas} cuotas de $${montoCuota.toLocaleString('es-AR', {minimumFractionDigits: 2})})`);
        res.redirect('/finanzas/compras-cuotas');
      } catch (err) {
        console.error('Error al crear compra en cuotas:', err);
        req.flash('error', 'Error al registrar compra');
        res.redirect('/finanzas/compras-cuotas');
      }
    },

    editar: async (req, res) => {
      try {
        const { id } = req.params;
        const { descripcion, proveedor, fecha_compra, monto_total, cant_cuotas, fecha_primera_cuota, medio_pago, categoria, notas, monto_cuota } = req.body;

        if (!descripcion || !monto_total || !cant_cuotas) {
          req.flash('error', 'Faltan campos obligatorios');
          return res.redirect('/finanzas/compras-cuotas');
        }

        // Si el usuario ingresó monto_cuota manualmente, usarlo; sino calcular
        const montoCuota = monto_cuota
          ? parseFloat(monto_cuota)
          : parseFloat(monto_total) / parseInt(cant_cuotas);

        await db.run(
          `UPDATE compras_cuotas
           SET descripcion = ?, proveedor = ?, fecha_compra = ?, monto_total = ?, cant_cuotas = ?, monto_cuota = ?, fecha_primera_cuota = ?, medio_pago = ?, categoria = ?, notas = ?
           WHERE id = ?`,
          [descripcion, proveedor || '', fecha_compra, parseFloat(monto_total), parseInt(cant_cuotas), montoCuota, fecha_primera_cuota, medio_pago || '', categoria || '', notas || null, id]
        );

        req.flash('success', '✅ Compra en cuotas actualizada');
        res.redirect('/finanzas/compras-cuotas');
      } catch (err) {
        console.error('Error al editar compra:', err);
        req.flash('error', 'Error al actualizar compra');
        res.redirect('/finanzas/compras-cuotas');
      }
    },

    eliminar: async (req, res) => {
      try {
        const { id } = req.params;

        const compra = await db.get('SELECT descripcion FROM compras_cuotas WHERE id = ?', [id]);
        if (!compra) {
          req.flash('error', 'Compra no encontrada');
          return res.redirect('/finanzas/compras-cuotas');
        }

        await db.run('UPDATE compras_cuotas SET activo = 0 WHERE id = ?', [id]);

        req.flash('success', `✅ Compra "${compra.descripcion}" eliminada`);
        res.redirect('/finanzas/compras-cuotas');
      } catch (err) {
        console.error('Error al eliminar compra:', err);
        req.flash('error', 'Error al eliminar compra');
        res.redirect('/finanzas/compras-cuotas');
      }
    },

    registrarCuota: async (req, res) => {
      try {
        const { id } = req.params;

        const compra = await db.get('SELECT * FROM compras_cuotas WHERE id = ?', [id]);
        if (!compra) {
          return res.json({ success: false, error: 'Compra no encontrada' });
        }

        if (compra.cuotas_pagadas >= compra.cant_cuotas) {
          return res.json({ success: false, error: 'Todas las cuotas ya están pagadas' });
        }

        const { timestamp, fecha } = obtenerFechaLocal();

        // Registrar en caja diaria
        await db.run(
          `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, fecha)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['egreso', `Cuota ${compra.cuotas_pagadas + 1}/${compra.cant_cuotas} - ${compra.descripcion}`, compra.categoria, compra.monto_cuota, compra.medio_pago || 'manual', timestamp]
        );

        // Actualizar cuotas pagadas
        await db.run(
          'UPDATE compras_cuotas SET cuotas_pagadas = cuotas_pagadas + 1 WHERE id = ?',
          [id]
        );

        res.json({ success: true, message: `Cuota ${compra.cuotas_pagadas + 1}/${compra.cant_cuotas} registrada` });
      } catch (err) {
        console.error('Error al registrar cuota:', err);
        res.json({ success: false, error: err.message });
      }
    }
  };
};
