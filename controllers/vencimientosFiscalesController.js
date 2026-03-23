module.exports = (db) => {
  return {
    listar: async (req, res) => {
      try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const vencimientos = await db.all("SELECT * FROM vencimientos_fiscales ORDER BY fecha_vencimiento ASC") || [];

        // Calcular urgencia de cada vencimiento
        vencimientos.forEach(v => {
          if (v.estado === 'pagado') {
            v.urgencia = 'pagado';
            return;
          }
          const fv = new Date(v.fecha_vencimiento);
          fv.setHours(0, 0, 0, 0);
          const dias = Math.ceil((fv - hoy) / 86400000);

          if (dias < 0) {
            v.urgencia = 'vencido';
            v.dias_transcurridos = Math.abs(dias);
          } else if (dias <= 7) {
            v.urgencia = 'urgente';
          } else if (dias <= 15) {
            v.urgencia = 'proximo15';
          } else if (dias <= 30) {
            v.urgencia = 'proximo';
          } else {
            v.urgencia = 'ok';
          }
          v.dias_restantes = dias;
        });

        // Calcular resumen
        const resumen = {
          vencidos: vencimientos.filter(v => v.urgencia === 'vencido').length,
          urgentes: vencimientos.filter(v => v.urgencia === 'urgente').length,
          proximos: vencimientos.filter(v => v.urgencia === 'proximo').length,
          pagados:  vencimientos.filter(v => v.urgencia === 'pagado').length,
          total_pendiente: vencimientos.filter(v => v.estado !== 'pagado').reduce((s, v) => s + (v.monto_estimado || 0), 0)
        };

        return res.render('finanzas/vencimientos-fiscales', {
          title: 'Vencimientos Fiscales',
          vencimientos,
          resumen,
          success: req.flash('success'),
          error: req.flash('error')
        });
      } catch (err) {
        console.error('Error al listar vencimientos:', err);
        req.flash('error', 'Error al cargar vencimientos: ' + err.message);
        return res.redirect('/finanzas');
      }
    },

    crear: async (req, res) => {
      try {
        const { descripcion, categoria, organismo, fecha_vencimiento, periodo, monto_estimado, notas, es_recurrente, periodicidad } = req.body;

        if (!descripcion || descripcion.trim().length === 0) {
          req.flash('error', 'Ingresá una descripción. Ej: "Monotributo mensual"');
          return res.redirect('/finanzas/vencimientos-fiscales');
        }
        if (!categoria) {
          req.flash('error', 'Seleccioná el tipo de obligación.');
          return res.redirect('/finanzas/vencimientos-fiscales');
        }
        if (!fecha_vencimiento) {
          req.flash('error', 'Ingresá la fecha de vencimiento. La podés ver en el calendario de AFIP o consultar con tu contador.');
          return res.redirect('/finanzas/vencimientos-fiscales');
        }

        await db.run(
          'INSERT INTO vencimientos_fiscales (descripcion, categoria, organismo, fecha_vencimiento, periodo, monto_estimado, notas, es_recurrente, periodicidad) VALUES (?,?,?,?,?,?,?,?,?)',
          [descripcion.trim(), categoria, organismo || null, fecha_vencimiento, periodo || '', parseFloat(monto_estimado) || 0, notas || '', es_recurrente ? 1 : 0, periodicidad || '']
        );

        req.flash('success', 'Vencimiento agregado correctamente');
        return res.redirect('/finanzas/vencimientos-fiscales');
      } catch (err) {
        console.error('Error al crear vencimiento:', err);
        req.flash('error', 'Error al crear vencimiento: ' + err.message);
        return res.redirect('/finanzas/vencimientos-fiscales');
      }
    },

    editar: async (req, res) => {
      try {
        const { id } = req.params;
        const { descripcion, categoria, organismo, fecha_vencimiento, periodo, monto_estimado, notas, es_recurrente, periodicidad } = req.body;

        if (!descripcion || descripcion.trim().length === 0) {
          req.flash('error', 'Ingresá una descripción. Ej: "Monotributo mensual"');
          return res.redirect('/finanzas/vencimientos-fiscales');
        }
        if (!categoria) {
          req.flash('error', 'Seleccioná el tipo de obligación.');
          return res.redirect('/finanzas/vencimientos-fiscales');
        }
        if (!fecha_vencimiento) {
          req.flash('error', 'Ingresá la fecha de vencimiento. La podés ver en el calendario de AFIP o consultar con tu contador.');
          return res.redirect('/finanzas/vencimientos-fiscales');
        }

        await db.run(
          'UPDATE vencimientos_fiscales SET descripcion=?, categoria=?, organismo=?, fecha_vencimiento=?, periodo=?, monto_estimado=?, notas=?, es_recurrente=?, periodicidad=? WHERE id=?',
          [descripcion.trim(), categoria, organismo || null, fecha_vencimiento, periodo || '', parseFloat(monto_estimado) || 0, notas || '', es_recurrente ? 1 : 0, periodicidad || '', id]
        );

        req.flash('success', 'Vencimiento actualizado correctamente');
        return res.redirect('/finanzas/vencimientos-fiscales');
      } catch (err) {
        console.error('Error al editar vencimiento:', err);
        req.flash('error', 'Error al editar vencimiento: ' + err.message);
        return res.redirect('/finanzas/vencimientos-fiscales');
      }
    },

    eliminar: async (req, res) => {
      try {
        const { id } = req.params;
        await db.run('DELETE FROM vencimientos_fiscales WHERE id = ?', [id]);
        req.flash('success', 'Vencimiento eliminado correctamente');
      } catch (err) {
        console.error('Error al eliminar vencimiento:', err);
        req.flash('error', 'Error al eliminar vencimiento: ' + err.message);
      }
      return res.redirect('/finanzas/vencimientos-fiscales');
    },

    marcarPagado: async (req, res) => {
      try {
        const { id } = req.params;
        const { monto_real_pagado, fecha_real_pago, metodo_pago } = req.body;
        const { obtenerFechaLocal, turnoByHora } = require('../utils/dateHelper');

        const montoReal = parseFloat(monto_real_pagado) || 0;
        const fechaReal = fecha_real_pago || new Date().toISOString().slice(0, 10);
        const ts = `${fechaReal} 12:00:00`;

        await db.run(
          "UPDATE vencimientos_fiscales SET estado = 'pagado', monto_real_pagado = ?, fecha_real_pago = ? WHERE id = ?",
          [montoReal, fechaReal, id]
        );

        // Registrar egreso en caja diaria
        await db.run(
          `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, fecha, turno)
           VALUES (?, ?, ?, ?, ?, ?, ?)` ,
          ['egreso', `Vencimiento fiscal pagado #${id}`, 'fiscal', montoReal, metodo_pago || 'manual', ts, turnoByHora(ts)]
        );

        req.flash('success', `✅ Vencimiento marcado como pagado — $${montoReal.toLocaleString('es-AR', {minimumFractionDigits: 2})} pagado el ${fechaReal}`);
      } catch (err) {
        console.error('Error al marcar como pagado:', err);
        req.flash('error', 'Error: ' + err.message);
      }
      return res.redirect('/finanzas/vencimientos-fiscales');
    }
  };
};
