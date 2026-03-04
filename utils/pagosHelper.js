/**
 * Utilidades compartidas para cálculo de pagos y prioridades
 */

/**
 * Calcula la fecha de vencimiento de una tarjeta de crédito
 * @param {number} diaInt - Día del mes (ej: 25)
 * @returns {Date} Fecha calculada para este ciclo (próximo mes si ya pasó)
 */
function calcularFechaVencTarjeta(diaInt) {
  const hoy = new Date();
  const añoActual = hoy.getFullYear();
  const mesActual = hoy.getMonth();
  const diaActual = hoy.getDate();

  // Crear fecha para este mes
  let fechaVenc = new Date(añoActual, mesActual, diaInt);

  // Si ya pasó este mes, usar próximo mes
  if (fechaVenc < hoy) {
    fechaVenc = new Date(añoActual, mesActual + 1, diaInt);
  }

  return fechaVenc;
}

/**
 * Calcula la próxima cuota de un préstamo
 * @param {number} diaInt - Día del mes (ej: 15)
 * @returns {Date} Fecha de la próxima cuota
 */
function calcularProximaCuota(diaInt) {
  return calcularFechaVencTarjeta(diaInt);
}

/**
 * Calcula los días entre hoy y una fecha
 * @param {Date|string} fecha - Fecha a calcular
 * @returns {number|null} Número de días (negativo si vencido), null si fecha inválida
 */
function diasHasta(fecha) {
  if (!fecha) return null;

  const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(fechaObj.getTime())) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaObj.setHours(0, 0, 0, 0);

  const diff = fechaObj.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calcula la prioridad de un pago según días restantes
 * @param {number|null} diasRestantes - Días hasta el vencimiento
 * @returns {object} { nivel, label, clase } para badge Bootstrap
 */
function calcularPrioridad(diasRestantes) {
  if (diasRestantes === null) {
    return { nivel: 5, label: 'SIN FECHA', clase: 'bg-secondary' };
  }

  if (diasRestantes < 0) {
    return { nivel: 0, label: '🔴 VENCIDO', clase: 'bg-danger' };
  } else if (diasRestantes <= 3) {
    return { nivel: 1, label: '🔴 URGENTE', clase: 'bg-danger' };
  } else if (diasRestantes <= 7) {
    return { nivel: 2, label: '🟠 PRÓXIMO', clase: 'bg-warning text-dark' };
  } else if (diasRestantes <= 30) {
    return { nivel: 3, label: '🟡 PLANIFICAR', clase: 'bg-info' };
  } else {
    return { nivel: 4, label: '🟢 OK', clase: 'bg-success' };
  }
}

module.exports = {
  calcularFechaVencTarjeta,
  calcularProximaCuota,
  diasHasta,
  calcularPrioridad
};
