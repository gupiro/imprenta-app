// controllers/cajaController.js - ACTUALIZADO CON GASTOS

// Función auxiliar para obtener fecha y hora en zona horaria local (no UTC)
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

// Función para determinar turno por hora actual (mañana: <14:00, tarde: >=14:00)
function turnoByHora(fechaTimestamp) {
  const d = fechaTimestamp ? new Date(fechaTimestamp) : new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const hora = d.getHours();
  return hora < 14 ? 'mañana' : 'tarde';
}

module.exports = (db) => {
  return {
    mostrarCajaDiaria: async (req, res) => {
      try {
        // Leer fecha de query string o usar hoy
        const fechaParam = req.query.fecha;
        const hoy = fechaParam || obtenerFechaLocal().fecha;

        // Filtros opcionales
        const tipo = req.query.tipo || '';
        const concepto = req.query.concepto || '';
        const metodo = req.query.metodo || '';

        // Ordenamiento (todos los usuarios)
        const sortBy = req.query.sortBy || 'fecha';
        const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC';

        // Whitelist de columnas para seguridad (evitar SQL injection)
        const columnasPermitidas = {
          'tipo':     'm.tipo',
          'concepto': 'm.concepto',
          'categoria':'m.categoria',
          'metodo':   'm.metodo_pago',
          'monto':    'm.monto',
          'usuario':  'u.username',
          'fecha':    'm.fecha'
        };
        const columnaSQL = columnasPermitidas[sortBy] || 'm.fecha';

        // Construir query dinámica con JOIN a users para obtener username
        let query = `
          SELECT m.*, u.username FROM movimientos_caja m
          LEFT JOIN users u ON m.usuario_id = u.id
          WHERE SUBSTR(m.fecha, 1, 10) = ?
        `;
        const params = [hoy];

        const filtroTurno = req.query.turno || '';
        if (filtroTurno) {
          query += ' AND m.turno = ?';
          params.push(filtroTurno);
        }
        if (tipo) {
          query += ' AND m.tipo = ?';
          params.push(tipo);
        }
        if (concepto) {
          query += ' AND m.concepto LIKE ?';
          params.push(`%${concepto}%`);
        }
        if (metodo) {
          query += ' AND m.metodo_pago = ?';
          params.push(metodo);
        }

        query += ` ORDER BY ${columnaSQL} ${sortDir}`;
        const movimientos = await db.all(query, params) || [];

        const totales = {
          ingresos: 0,
          egresos: 0,
          efectivo: 0,
          transferencia: 0,
          tarjeta: 0,
          qr: 0
        };

        // Subtotales por turno
        const totalesTurno = {
          manana:  { ingresos: 0, egresos: 0, saldo: 0 },
          tarde:   { ingresos: 0, egresos: 0, saldo: 0 }
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

          // Subtotales por turno
          const t = m.turno === 'tarde' ? 'tarde' : 'manana';
          if (m.tipo === 'ingreso') {
            totalesTurno[t].ingresos += m.monto;
          } else {
            totalesTurno[t].egresos += m.monto;
          }
        });

        totales.saldo = totales.ingresos - totales.egresos;
        totalesTurno.manana.saldo = totalesTurno.manana.ingresos - totalesTurno.manana.egresos;
        totalesTurno.tarde.saldo = totalesTurno.tarde.ingresos - totalesTurno.tarde.egresos;

        // Consultar turnos cerrados para la fecha actual
        const cierres = await db.all("SELECT turno FROM cierres_turno WHERE fecha = ?", [hoy]) || [];
        const turnosCerrados = cierres.map(c => c.turno);

        // Turno actual (para default en form)
        const turnoActual = turnoByHora();

        res.render('cajaDiaria', {
          title: 'Caja Diaria',
          movimientos,
          totales,
          totalesTurno,
          turnosCerrados,
          turnoActual,
          fechaSeleccionada: hoy,
          filtros: { tipo, concepto, metodo, turno: filtroTurno },
          sortBy,
          sortDir: sortDir.toLowerCase(),
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
        const { tipo, concepto, categoria, monto, metodo_pago, turno } = req.body;
        const montoNum = parseFloat(monto);

        if (!tipo || !concepto || isNaN(montoNum) || montoNum <= 0) {
          req.flash('error', 'Datos inválidos. Verificá que todos los campos estén completos');
          return res.redirect('/caja-diaria');
        }

        const { timestamp, fecha } = obtenerFechaLocal();
        const usuarioId = req.session.user?.id || null;
        const turnoUsado = turno || turnoByHora();

        // Validar que el turno no esté cerrado
        const cierre = await db.get(
          "SELECT id FROM cierres_turno WHERE fecha = ? AND turno = ?",
          [fecha, turnoUsado]
        );
        if (cierre) {
          req.flash('error', `El turno ${turnoUsado} ya está cerrado para hoy. No se pueden agregar movimientos.`);
          return res.redirect('/caja-diaria');
        }

        await db.run(
          'INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, turno, fecha, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [tipo, concepto.trim(), categoria || 'General', montoNum, metodo_pago || 'Efectivo', turnoUsado, timestamp, usuarioId]
        );

        req.flash('success', `✅ ${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado en turno ${turnoUsado}`);
        res.redirect('/caja-diaria');
      } catch (err) {
        console.error('Error:', err);
        req.flash('error', 'Error: ' + err.message);
        res.redirect('/caja-diaria');
      }
    },

    editarMovimiento: async (req, res) => {
      try {
        const { id } = req.params;
        const { tipo, concepto, categoria, monto, metodo_pago } = req.body;
        const montoNum = parseFloat(monto);

        if (!tipo || !concepto || isNaN(montoNum) || montoNum <= 0) {
          req.flash('error', 'Datos inválidos. Verificá que todos los campos estén completos');
          return res.redirect('/caja-diaria');
        }

        await db.run(
          'UPDATE movimientos_caja SET tipo = ?, concepto = ?, categoria = ?, monto = ?, metodo_pago = ? WHERE id = ?',
          [tipo, concepto.trim(), categoria || 'General', montoNum, metodo_pago || 'Efectivo', id]
        );

        req.flash('success', `✅ Movimiento actualizado correctamente`);
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
          [id]
        );

        if (!movimiento) {
          req.flash('error', 'Movimiento no encontrado.');
          return res.redirect('/caja-diaria');
        }

        // Eliminar el movimiento
        await db.run('DELETE FROM movimientos_caja WHERE id = ?', [id]);

        const tipoTexto = movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Egreso';
        req.flash('success', `✅ ${tipoTexto} de $${movimiento.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})} eliminado`);
        res.redirect('/caja-diaria');
      } catch (err) {
        console.error('Error:', err);
        req.flash('error', 'Error: ' + err.message);
        res.redirect('/caja-diaria');
      }
    },

    cerrarTurno: async (req, res) => {
      try {
        const { turno } = req.body;

        if (!['mañana', 'tarde'].includes(turno)) {
          req.flash('error', 'Turno inválido');
          return res.redirect('/caja-diaria');
        }

        const { fecha } = obtenerFechaLocal();
        const usuarioId = req.session.user?.id || null;

        // Verificar que no esté ya cerrado
        const yaExiste = await db.get(
          "SELECT id FROM cierres_turno WHERE fecha = ? AND turno = ?",
          [fecha, turno]
        );

        if (yaExiste) {
          req.flash('error', `El turno ${turno} ya fue cerrado hoy.`);
          return res.redirect('/caja-diaria');
        }

        // Insertar cierre de turno
        await db.run(
          "INSERT INTO cierres_turno (fecha, turno, usuario_id) VALUES (?,?,?)",
          [fecha, turno, usuarioId]
        );

        req.flash('success', `✅ Turno ${turno} cerrado correctamente.`);
        res.redirect('/caja-diaria');
      } catch (err) {
        console.error('Error:', err);
        req.flash('error', 'Error: ' + err.message);
        res.redirect('/caja-diaria');
      }
    },

    reabrirTurno: async (req, res) => {
      try {
        const { turno } = req.body;

        if (!['mañana', 'tarde'].includes(turno)) {
          req.flash('error', 'Turno inválido');
          return res.redirect('/caja-diaria');
        }

        const { fecha } = obtenerFechaLocal();

        // Verificar que esté cerrado
        const cierre = await db.get(
          "SELECT id FROM cierres_turno WHERE fecha = ? AND turno = ?",
          [fecha, turno]
        );

        if (!cierre) {
          req.flash('error', `El turno ${turno} no está cerrado.`);
          return res.redirect('/caja-diaria');
        }

        // Eliminar cierre de turno
        await db.run(
          "DELETE FROM cierres_turno WHERE fecha = ? AND turno = ?",
          [fecha, turno]
        );

        req.flash('success', `✅ Turno ${turno} reabierto correctamente. Puedes agregar movimientos nuevamente.`);
        res.redirect('/caja-diaria');
      } catch (err) {
        console.error('Error:', err);
        req.flash('error', 'Error: ' + err.message);
        res.redirect('/caja-diaria');
      }
    }
  };
};

module.exports.turnoByHora = turnoByHora;
