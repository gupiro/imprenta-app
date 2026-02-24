// controllers/cajaController.js - ACTUALIZADO CON GASTOS

// Función auxiliar para obtener fecha y hora en zona horaria local (no UTC)
function obtenerFechaLocal() {
  const now = new Date();
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

module.exports = (db) => {
  return {
    mostrarCajaDiaria: async (req, res) => {
      try {
        const hoy = obtenerFechaLocal().fecha;
        
        const movimientos = await db.all(
          'SELECT * FROM movimientos_caja WHERE DATE(fecha) = ? ORDER BY fecha DESC',
          hoy
        ) || [];

        const totales = {
          ingresos: 0,
          egresos: 0,
          efectivo: 0,
          transferencia: 0,
          tarjeta: 0,
          qr: 0
        };

        movimientos.forEach(m => {
          if (m.tipo === 'ingreso') {
            totales.ingresos += m.monto;
          } else {
            totales.egresos += m.monto;
          }
          
          // Desglosar por método
          if (m.metodo_pago === 'Efectivo') totales.efectivo += m.monto;
          else if (m.metodo_pago === 'Transferencia') totales.transferencia += m.monto;
          else if (m.metodo_pago === 'Tarjeta') totales.tarjeta += m.monto;
          else if (m.metodo_pago === 'QR') totales.qr += m.monto;
        });

        totales.saldo = totales.ingresos - totales.egresos;

        res.render('cajaDiaria', {
          title: 'Caja Diaria',
          movimientos,
          totales,
          error: req.flash('error'),
          success: req.flash('success')
        });
      } catch (err) {
        console.error('Error:', err);
        req.flash('error', 'Error: ' + err.message);
        res.redirect('/');
      }
    },

    agregarMovimiento: async (req, res) => {
      try {
        const { tipo, concepto, categoria, monto, metodo_pago } = req.body;
        const montoNum = parseFloat(monto);

        if (!tipo || !concepto || isNaN(montoNum) || montoNum <= 0) {
          req.flash('error', 'Datos inválidos. Verificá que todos los campos estén completos');
          return res.redirect('/caja-diaria');
        }

        const { timestamp } = obtenerFechaLocal();
        await db.run(
          'INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, fecha) VALUES (?, ?, ?, ?, ?, ?)',
          tipo,
          concepto.trim(),
          categoria || 'General',
          montoNum,
          metodo_pago || 'Efectivo',
          timestamp
        );

        req.flash('success', `✅ ${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado`);
        res.redirect('/caja-diaria');
      } catch (err) {
        console.error('Error:', err);
        req.flash('error', 'Error: ' + err.message);
        res.redirect('/caja-diaria');
      }
    },

    eliminarMovimiento: async (req, res) => {
      try {
        const { id } = req.params;

        // Obtener datos del movimiento antes de eliminar (para confirmar)
        const movimiento = await db.get(
          'SELECT * FROM movimientos_caja WHERE id = ?',
          id
        );

        if (!movimiento) {
          req.flash('error', 'Movimiento no encontrado.');
          return res.redirect('/caja-diaria');
        }

        // Eliminar el movimiento
        await db.run('DELETE FROM movimientos_caja WHERE id = ?', id);

        const tipoTexto = movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
        req.flash('success', `✅ ${tipoTexto} de $${movimiento.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})} eliminado`);
        res.redirect('/caja-diaria');
      } catch (err) {
        console.error('Error:', err);
        req.flash('error', 'Error: ' + err.message);
        res.redirect('/caja-diaria');
      }
    }
  };
};
