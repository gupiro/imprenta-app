const express = require('express');
const checkPermission = require('../middleware/permissions');
const { calcularFechaVencTarjeta, calcularProximaCuota, diasHasta, calcularPrioridad } = require('../utils/pagosHelper');

module.exports = (db) => {
    const router = express.Router();

    // GET /pagos - Centro de Pagos consolidado
    router.get('/', checkPermission, async (req, res) => {
        try {
            // Cheques pendientes
            const cheques = await db.all(`
                SELECT 'cheque' AS source_tipo, id, numero_cheque AS titulo,
                       monto, fecha_vencimiento, banco AS subtitulo, estado, notas
                FROM deudas_cheques
                WHERE estado = 'pendiente'
                ORDER BY fecha_vencimiento ASC
            `) || [];

            // Proveedores pendientes
            const proveedores = await db.all(`
                SELECT 'proveedor' AS source_tipo, dp.id,
                       COALESCE(p.nombre, 'Sin proveedor') || ' - ' || dp.concepto AS titulo,
                       (dp.monto_total - dp.monto_pagado) AS monto,
                       dp.fecha_vencimiento, dp.concepto AS subtitulo, dp.estado, dp.notas
                FROM deudas_proveedores dp
                LEFT JOIN proveedores p ON dp.proveedor_id = p.id
                WHERE dp.estado != 'pagado'
                ORDER BY dp.fecha_vencimiento ASC NULLS LAST
            `) || [];

            // Préstamos activos
            const prestamosRaw = await db.all(`
                SELECT 'prestamo' AS source_tipo, id, descripcion AS titulo,
                       cuota_mensual AS monto, dia_vencimiento_mensual,
                       entidad AS subtitulo, estado, notas, monto_pendiente,
                       cuotas_totales, cuotas_pagadas
                FROM deudas_prestamos
                WHERE estado = 'activo'
            `) || [];

            // Tarjetas activas
            const tarjetasRaw = await db.all(`
                SELECT 'tarjeta' AS source_tipo, id, nombre_tarjeta AS titulo,
                       monto_minimo AS monto, fecha_vencimiento AS dia_vencimiento,
                       saldo_adeudado, fecha_cierre, estado, notas
                FROM deudas_tarjetas
                WHERE estado = 'activa'
            `) || [];

            // Enriquecer cheques con fechas y prioridad
            const chequesEnriquecidos = cheques.map(ch => {
                const fecha = ch.fecha_vencimiento ? new Date(ch.fecha_vencimiento + 'T00:00:00') : null;
                const dias = diasHasta(fecha);
                return { ...ch, fecha_calculada: fecha, dias_restantes: dias, prioridad: calcularPrioridad(dias) };
            });

            // Enriquecer proveedores
            const proveedoresEnriquecidos = proveedores.map(pv => {
                const fecha = pv.fecha_vencimiento ? new Date(pv.fecha_vencimiento + 'T00:00:00') : null;
                const dias = diasHasta(fecha);
                return { ...pv, fecha_calculada: fecha, dias_restantes: dias, prioridad: calcularPrioridad(dias) };
            });

            // Enriquecer préstamos
            const prestamosEnriquecidos = prestamosRaw.map(pr => {
                const fecha = calcularProximaCuota(pr.dia_vencimiento_mensual);
                const dias = diasHasta(fecha);
                return { ...pr, fecha_calculada: fecha, dias_restantes: dias, prioridad: calcularPrioridad(dias) };
            });

            // Enriquecer tarjetas
            const tarjetasEnriquecidas = tarjetasRaw.map(tar => {
                const fecha = calcularFechaVencTarjeta(tar.dia_vencimiento);
                const dias = diasHasta(fecha);
                return { ...tar, fecha_calculada: fecha, dias_restantes: dias, prioridad: calcularPrioridad(dias) };
            });

            // Consolidar todos
            const todos = [
                ...chequesEnriquecidos,
                ...proveedoresEnriquecidos,
                ...prestamosEnriquecidos,
                ...tarjetasEnriquecidas
            ].sort((a, b) => {
                if (a.dias_restantes === null && b.dias_restantes === null) return 0;
                if (a.dias_restantes === null) return 1;
                if (b.dias_restantes === null) return -1;
                return a.dias_restantes - b.dias_restantes;
            });

            // Agrupar por tipo
            const tarjetas = tarjetasEnriquecidas;
            const chequesConsolidados = chequesEnriquecidos;
            const prestamosConsolidados = prestamosEnriquecidos;
            const proveedoresConsolidados = proveedoresEnriquecidos;

            // Cálculos de alertas
            const urgentes = todos.filter(p => p.dias_restantes !== null && p.dias_restantes <= 7);
            const totalUrgente = urgentes.reduce((s, p) => s + (p.monto || 0), 0);

            const proximos30 = todos.filter(p => p.dias_restantes !== null && p.dias_restantes <= 30);
            const totalProximos30 = proximos30.reduce((s, p) => s + (p.monto || 0), 0);

            // Saldo neto del mes
            const ingresosMes = (await db.get(
                `SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja
                 WHERE tipo = 'ingreso' AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`
            ))?.total || 0;

            const gastosMesNegocio = (await db.get(
                `SELECT COALESCE(SUM(monto), 0) AS total FROM gastos
                 WHERE tipo = 'negocio' AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`
            ))?.total || 0;

            const saldoDisponible = ingresosMes - gastosMesNegocio;

            res.render('pagos/index', {
                title: 'Centro de Pagos',
                todos,
                tarjetas,
                cheques: chequesConsolidados,
                prestamos: prestamosConsolidados,
                proveedores: proveedoresConsolidados,
                totalUrgente,
                totalProximos30,
                saldoDisponible,
                ingresosMes,
                gastosMesNegocio,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error en Centro de Pagos:', err);
            req.flash('error', 'Error al cargar pagos: ' + err.message);
            res.redirect('/');
        }
    });

    return router;
};
