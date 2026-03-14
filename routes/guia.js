const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // ════════════════════════════════════════════════════════════════
  // GET /guia
  // Página de rutina diaria, semanal, mensual para no-contables
  // ════════════════════════════════════════════════════════════════
  router.get('/', async (req, res) => {
    try {
      // Calcular estado financiero del mes actual (misma lógica que /api/semaforo)
      const now = new Date();
      const fechaInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const ingresos = (await db.get(
        "SELECT COALESCE(SUM(monto),0) AS t FROM movimientos_caja WHERE tipo='ingreso' AND SUBSTR(fecha,1,10) >= ?",
        [fechaInicio]
      ))?.t || 0;

      const gastos = (await db.get(
        "SELECT COALESCE(SUM(monto),0) AS t FROM movimientos_caja WHERE tipo='egreso' AND SUBSTR(fecha,1,10) >= ?",
        [fechaInicio]
      ))?.t || 0;

      const diferencia = ingresos - gastos;
      const pct = ingresos > 0 ? ((diferencia / ingresos) * 100) : 0;

      let estadoFinanciero = 'bien'; // 'bien' | 'equilibrio' | 'atencion'
      if (diferencia < 0) {
        estadoFinanciero = 'atencion';
      } else if (pct <= 15) {
        estadoFinanciero = 'equilibrio';
      }

      // Formatear fecha en español
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const hoy = new Date();
      const diaSemana = diasSemana[hoy.getDay()];
      const fechaFormateada = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

      res.render('guia', {
        title: 'Mi Rutina',
        diaSemana,
        fechaFormateada,
        estadoFinanciero,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error('Error en /guia:', err);
      res.status(500).render('error', {
        title: 'Error',
        mensaje: 'Error al cargar Mi Rutina',
        error: err.message
      });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // POST /guia/feedback
  // Guardar feedback/notas del usuario
  // ════════════════════════════════════════════════════════════════
  router.post('/feedback', async (req, res) => {
    try {
      const { contenido } = req.body;
      if (!contenido?.trim()) {
        return res.redirect('/guia');
      }

      await db.run(
        'INSERT INTO notas_sistema (contenido, usuario_id) VALUES (?, ?)',
        [contenido.trim(), req.session.user?.id || null]
      );

      req.flash('success', '¡Gracias! Tu comentario fue guardado.');
      res.redirect('/guia');
    } catch (err) {
      console.error('Error guardando feedback:', err);
      req.flash('error', 'Error al guardar tu comentario: ' + err.message);
      res.redirect('/guia');
    }
  });

  return router;
};
