// utils/dateHelper.js - Funciones de fecha y turno compartidas
// Versión canónica basada en cajaController

/**
 * Obtiene la fecha y hora en zona horaria de Argentina (no UTC)
 * @returns {object} { fecha: YYYY-MM-DD, time: HH:MM:SS, timestamp: YYYY-MM-DD HH:MM:SS }
 */
function obtenerFechaLocal() {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  // Argentina (-03:00) no aplica DST actualmente
  const argentinaOffset = -3 * 60 * 60000;
  const nowArg = new Date(utcTime + argentinaOffset);

  const year = nowArg.getFullYear();
  const mes = String(nowArg.getMonth() + 1).padStart(2, '0');
  const dia = String(nowArg.getDate()).padStart(2, '0');
  const horas = String(nowArg.getHours()).padStart(2, '0');
  const minutos = String(nowArg.getMinutes()).padStart(2, '0');
  const segundos = String(nowArg.getSeconds()).padStart(2, '0');

  return {
    fecha: `${year}-${mes}-${dia}`,
    time: `${horas}:${minutos}:${segundos}`,
    timestamp: `${year}-${mes}-${dia} ${horas}:${minutos}:${segundos}`
  };
}

/**
 * Determina el turno (mañana/tarde) basado en la hora del timestamp dado
 * @param {string|null} fechaTimestamp - Timestamp en formato 'YYYY-MM-DD HH:MM:SS'
 * @returns {string} 'mañana' (< 14:00) o 'tarde' (>= 14:00)
 */
function turnoByHora(fechaTimestamp) {
  const d = fechaTimestamp
    ? new Date(fechaTimestamp.replace(' ', 'T'))
    : new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const hora = d.getHours();
  return hora < 14 ? 'mañana' : 'tarde';
}

/**
 * Calcula el mes en formato YYYY-MM
 * @param {Date|null} fecha - Fecha a formatear. Si es null, usa la fecha actual
 * @returns {string} 'YYYY-MM'
 */
function obtenerMes(fecha = null) {
  const d = fecha ? new Date(fecha) : new Date();
  const year = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${mes}`;
}

module.exports = {
  obtenerFechaLocal,
  turnoByHora,
  obtenerMes
};
