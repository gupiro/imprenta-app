/**
 * utils/financiero.js
 * Fuente única de verdad para el cálculo del balance mensual.
 * Usada por dashboard y reporte financiero para garantizar coherencia.
 *
 * @param {object} db  - Instancia de la base de datos (better-sqlite3 wrapeada con .get/.all)
 * @param {string} mes - Mes en formato 'YYYY-MM'
 * @returns {Promise<object>} Subtotales y neto del mes
 */
async function calcularBalanceMes(db, mes) {
  // ── 1. Ingresos de caja diaria ─────────────────────────────────────────────
  const ingresosCaja = (await db.get(
    "SELECT COALESCE(SUM(monto), 0) AS t FROM movimientos_caja WHERE tipo = 'ingreso' AND strftime('%Y-%m', fecha) = ?",
    [mes]
  ))?.t || 0;

  // ── 2. Gastos directos de la tabla gastos, separados por tipo ──────────────
  const gastosNegocio = (await db.get(
    "SELECT COALESCE(SUM(monto), 0) AS t FROM gastos WHERE tipo = 'negocio' AND strftime('%Y-%m', fecha) = ?",
    [mes]
  ))?.t || 0;

  const gastosPersonales = (await db.get(
    "SELECT COALESCE(SUM(monto), 0) AS t FROM gastos WHERE tipo = 'personal' AND strftime('%Y-%m', fecha) = ?",
    [mes]
  ))?.t || 0;

  // ── 3. Pagos realizados de gastos fijos ese mes ────────────────────────────
  const gastosfijosPagados = (await db.get(
    "SELECT COALESCE(SUM(monto_pagado), 0) AS t FROM pagos_gastos_fijos WHERE strftime('%Y-%m', fecha_pago) = ?",
    [mes]
  ))?.t || 0;

  // ── 4. Cuotas de compras_cuotas pagadas ese mes ────────────────────────────
  // No existe tabla de pagos individuales: se calcula por posición cronológica.
  const comprasCuotas = await db.all(
    "SELECT monto_cuota, cant_cuotas, cuotas_pagadas, fecha_primera_cuota FROM compras_cuotas WHERE activo = 1"
  ) || [];

  const [anio, mesNum] = mes.split('-').map(Number);
  const refDate = new Date(anio, mesNum - 1, 1); // primer día del mes solicitado

  const cuotasPagadas = comprasCuotas.reduce((sum, c) => {
    const primera = new Date(c.fecha_primera_cuota);
    const mesesTranscurridos = (refDate.getFullYear() - primera.getFullYear()) * 12
                             + (refDate.getMonth() - primera.getMonth());
    const numeroCuotaDelMes = mesesTranscurridos + 1;
    if (
      numeroCuotaDelMes >= 1 &&
      numeroCuotaDelMes <= c.cant_cuotas &&
      c.cuotas_pagadas >= numeroCuotaDelMes
    ) {
      return sum + c.monto_cuota;
    }
    return sum;
  }, 0);

  // ── 5. Compromisos PENDIENTES del mes (aún no pagados) ────────────────────

  // Total de gastos fijos activos comprometidos para el mes
  const totalGastosFijosActivos = (await db.get(
    "SELECT COALESCE(SUM(monto), 0) AS t FROM gastos_fijos WHERE activo = 1"
  ))?.t || 0;
  // Lo que falta pagar = total comprometido - lo ya pagado este mes
  const gastosFijosPendientes = Math.max(0, totalGastosFijosActivos - gastosfijosPagados);

  // Cuotas vencidas este mes que aún no fueron pagadas (complemento de cuotasPagadas)
  const cuotasPendientes = comprasCuotas.reduce((sum, c) => {
    const primera = new Date(c.fecha_primera_cuota);
    const mesesTranscurridos = (refDate.getFullYear() - primera.getFullYear()) * 12
                             + (refDate.getMonth() - primera.getMonth());
    const numeroCuotaDelMes = mesesTranscurridos + 1;
    if (
      numeroCuotaDelMes >= 1 &&
      numeroCuotaDelMes <= c.cant_cuotas &&
      c.cuotas_pagadas < numeroCuotaDelMes   // todavía sin pagar
    ) {
      return sum + c.monto_cuota;
    }
    return sum;
  }, 0);

  const totalPendiente = gastosFijosPendientes + cuotasPendientes;

  // ── 6. Totales ─────────────────────────────────────────────────────────────
  const gastosTotales = gastosNegocio + gastosfijosPagados + cuotasPagadas;
  const resultadoNeto = ingresosCaja - gastosTotales;
  const resultadoProyectado = resultadoNeto - totalPendiente;

  return {
    ingresosCaja,
    gastosNegocio,
    gastosPersonales,
    gastosfijosPagados,
    cuotasPagadas,
    gastosTotales,
    resultadoNeto,
    gastosFijosPendientes,
    cuotasPendientes,
    totalPendiente,
    resultadoProyectado
  };
}

module.exports = { calcularBalanceMes };
