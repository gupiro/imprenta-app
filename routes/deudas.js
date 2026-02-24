// routes/deudas.js - Gestión de Deudas (Tarjetas, Cheques, Préstamos, Proveedores)

const express = require('express');
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {
    const router = express.Router();

    // ════════════════════════════════════════════════════════════════
    // GET /deudas - PANEL RESUMEN
    // ════════════════════════════════════════════════════════════════
    router.get('/', checkPermission, async (req, res) => {
        try {
            // Totales por tipo de deuda
            const totalTarjetas = (await db.get(`
                SELECT COALESCE(SUM(saldo_adeudado), 0) AS total
                FROM deudas_tarjetas
                WHERE estado = 'activa'
            `))?.total || 0;

            const totalCheques = (await db.get(`
                SELECT COALESCE(SUM(monto), 0) AS total
                FROM deudas_cheques
                WHERE estado = 'pendiente'
            `))?.total || 0;

            const totalPrestamos = (await db.get(`
                SELECT COALESCE(SUM(monto_pendiente), 0) AS total
                FROM deudas_prestamos
                WHERE estado = 'activo'
            `))?.total || 0;

            const totalProveedores = (await db.get(`
                SELECT COALESCE(SUM(monto_total - monto_pagado), 0) AS total
                FROM deudas_proveedores
                WHERE estado != 'pagado'
            `))?.total || 0;

            const deudaTotal = totalTarjetas + totalCheques + totalPrestamos + totalProveedores;

            // Conteos
            const conteoTarjetas = (await db.get(`
                SELECT COUNT(*) AS c FROM deudas_tarjetas WHERE estado = 'activa'
            `))?.c || 0;

            const conteoCheques = (await db.get(`
                SELECT COUNT(*) AS c FROM deudas_cheques WHERE estado = 'pendiente'
            `))?.c || 0;

            const conteoPrestamos = (await db.get(`
                SELECT COUNT(*) AS c FROM deudas_prestamos WHERE estado = 'activo'
            `))?.c || 0;

            const conteoProveedores = (await db.get(`
                SELECT COUNT(*) AS c FROM deudas_proveedores WHERE estado != 'pagado'
            `))?.c || 0;

            // Vencimientos próximos (30 días)
            const vencimientosProximos = await db.all(`
                -- Cheques próximos 30 días
                SELECT 'cheque' AS tipo, numero_cheque AS descripcion, monto,
                       fecha_vencimiento, 'Cheque #' || numero_cheque AS etiqueta, estado
                FROM deudas_cheques
                WHERE estado = 'pendiente'
                  AND date(fecha_vencimiento) <= date('now', '+30 days')
                UNION ALL
                -- Cheques vencidos
                SELECT 'cheque' AS tipo, numero_cheque AS descripcion, monto,
                       fecha_vencimiento, 'Cheque #' || numero_cheque AS etiqueta, estado
                FROM deudas_cheques
                WHERE estado = 'pendiente'
                  AND date(fecha_vencimiento) < date('now')
                UNION ALL
                -- Deudas proveedores próximas
                SELECT 'proveedor' AS tipo, concepto AS descripcion,
                       (monto_total - monto_pagado) AS monto,
                       fecha_vencimiento, concepto AS etiqueta, estado
                FROM deudas_proveedores
                WHERE estado != 'pagado'
                  AND fecha_vencimiento IS NOT NULL
                  AND date(fecha_vencimiento) <= date('now', '+30 days')
                ORDER BY fecha_vencimiento ASC
            `) || [];

            res.render('deudas/index', {
                title: 'Gestión de Deudas',
                totalTarjetas,
                totalCheques,
                totalPrestamos,
                totalProveedores,
                deudaTotal,
                conteoTarjetas,
                conteoCheques,
                conteoPrestamos,
                conteoProveedores,
                vencimientosProximos,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error en deudas:', err);
            req.flash('error', 'Error al cargar deudas: ' + err.message);
            res.redirect('/');
        }
    });

    // ════════════════════════════════════════════════════════════════
    // TARJETAS DE CRÉDITO
    // ════════════════════════════════════════════════════════════════

    router.get('/tarjetas', checkPermission, async (req, res) => {
        try {
            const tarjetas = await db.all(`
                SELECT * FROM deudas_tarjetas ORDER BY nombre_tarjeta ASC
            `) || [];

            const totalActivas = tarjetas.filter(t => t.estado === 'activa').reduce((s, t) => s + t.saldo_adeudado, 0);

            res.render('deudas/tarjetas', {
                title: 'Tarjetas de Crédito',
                tarjetas,
                totalActivas,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al cargar tarjetas: ' + err.message);
            res.redirect('/deudas');
        }
    });

    router.post('/tarjetas', checkPermission, async (req, res) => {
        const { nombre_tarjeta, limite_credito, saldo_adeudado, fecha_cierre, fecha_vencimiento, monto_minimo, notas } = req.body;
        try {
            if (!nombre_tarjeta) {
                req.flash('error', 'Nombre de tarjeta es requerido');
                return res.redirect('/deudas/tarjetas');
            }

            const limiteNum = parseFloat(limite_credito) || 0;
            const saldoNum = parseFloat(saldo_adeudado) || 0;
            const minimoNum = parseFloat(monto_minimo) || 0;

            await db.run(
                `INSERT INTO deudas_tarjetas (nombre_tarjeta, limite_credito, saldo_adeudado, fecha_cierre, fecha_vencimiento, monto_minimo, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                nombre_tarjeta.trim(),
                limiteNum,
                saldoNum,
                parseInt(fecha_cierre) || null,
                parseInt(fecha_vencimiento) || null,
                minimoNum,
                notas?.trim() || null
            );
            req.flash('success', `✅ Tarjeta ${nombre_tarjeta} creada`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al crear tarjeta: ' + err.message);
        }
        res.redirect('/deudas/tarjetas');
    });

    router.post('/tarjetas/:id/editar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { nombre_tarjeta, limite_credito, saldo_adeudado, fecha_cierre, fecha_vencimiento, monto_minimo, estado, notas } = req.body;

            const limiteNum = parseFloat(limite_credito) || 0;
            const saldoNum = parseFloat(saldo_adeudado) || 0;
            const minimoNum = parseFloat(monto_minimo) || 0;

            await db.run(
                `UPDATE deudas_tarjetas
                 SET nombre_tarjeta = ?, limite_credito = ?, saldo_adeudado = ?,
                     fecha_cierre = ?, fecha_vencimiento = ?, monto_minimo = ?, estado = ?, notas = ?
                 WHERE id = ?`,
                nombre_tarjeta?.trim(),
                limiteNum,
                saldoNum,
                parseInt(fecha_cierre) || null,
                parseInt(fecha_vencimiento) || null,
                minimoNum,
                estado || 'activa',
                notas?.trim() || null,
                id
            );
            req.flash('success', '✅ Tarjeta actualizada');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al actualizar tarjeta: ' + err.message);
        }
        res.redirect('/deudas/tarjetas');
    });

    router.post('/tarjetas/:id/eliminar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.run('DELETE FROM deudas_tarjetas WHERE id = ?', id);
            req.flash('success', '✅ Tarjeta eliminada');
        } catch (err) {
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/deudas/tarjetas');
    });

    router.post('/tarjetas/:id/pagar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { monto, fecha, metodo_pago, notas } = req.body;
            const montoNum = parseFloat(monto);

            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'Monto inválido');
                return res.redirect('/deudas/tarjetas');
            }

            const tarjeta = await db.get('SELECT saldo_adeudado FROM deudas_tarjetas WHERE id = ?', id);
            if (!tarjeta) {
                req.flash('error', 'Tarjeta no encontrada');
                return res.redirect('/deudas/tarjetas');
            }

            // Registrar en movimientos_caja
            const cajaResult = await db.run(
                `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, usuario_id, fecha, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                'egreso',
                'Pago Tarjeta de Crédito',
                'Deuda',
                montoNum,
                metodo_pago || null,
                req.session?.userId || null,
                fecha || new Date().toISOString().slice(0, 10),
                notas?.trim() || null
            );

            // Registrar pago en deudas_pagos
            await db.run(
                `INSERT INTO deudas_pagos (tipo_deuda, deuda_id, monto, fecha, metodo_pago, usuario_id, caja_id, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                'tarjeta',
                id,
                montoNum,
                fecha || new Date().toISOString().slice(0, 10),
                metodo_pago || null,
                req.session?.userId || null,
                null, // Se actualiza después si es necesario
                notas?.trim() || null
            );

            // Actualizar saldo
            const nuevoSaldo = Math.max(0, tarjeta.saldo_adeudado - montoNum);
            await db.run(
                'UPDATE deudas_tarjetas SET saldo_adeudado = ? WHERE id = ?',
                nuevoSaldo,
                id
            );

            req.flash('success', `✅ Pago de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al registrar pago: ' + err.message);
        }
        res.redirect('/deudas/tarjetas');
    });

    // ════════════════════════════════════════════════════════════════
    // CHEQUES DIFERIDOS EMITIDOS
    // ════════════════════════════════════════════════════════════════

    router.get('/cheques', checkPermission, async (req, res) => {
        try {
            const cheques = await db.all(`
                SELECT c.*, p.nombre AS proveedor_nombre
                FROM deudas_cheques c
                LEFT JOIN proveedores p ON c.proveedor_id = p.id
                ORDER BY c.fecha_vencimiento ASC
            `) || [];

            const proveedores = await db.all("SELECT id, nombre FROM proveedores ORDER BY nombre ASC") || [];

            const vencidos = cheques.filter(ch => ch.estado === 'pendiente' && new Date(ch.fecha_vencimiento) < new Date()).length;
            const proximos = cheques.filter(ch => ch.estado === 'pendiente' && new Date(ch.fecha_vencimiento) > new Date()).length;

            res.render('deudas/cheques', {
                title: 'Cheques Diferidos',
                cheques,
                proveedores,
                vencidos,
                proximos,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al cargar cheques: ' + err.message);
            res.redirect('/deudas');
        }
    });

    router.post('/cheques', checkPermission, async (req, res) => {
        const { numero_cheque, banco, beneficiario, monto, fecha_emision, fecha_vencimiento, proveedor_id, notas } = req.body;
        try {
            if (!numero_cheque || !banco || !beneficiario || !monto || !fecha_emision || !fecha_vencimiento) {
                req.flash('error', 'Todos los campos son requeridos');
                return res.redirect('/deudas/cheques');
            }

            const montoNum = parseFloat(monto);
            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'Monto inválido');
                return res.redirect('/deudas/cheques');
            }

            await db.run(
                `INSERT INTO deudas_cheques (numero_cheque, banco, beneficiario, monto, fecha_emision, fecha_vencimiento, proveedor_id, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                numero_cheque.trim(),
                banco.trim(),
                beneficiario.trim(),
                montoNum,
                fecha_emision,
                fecha_vencimiento,
                proveedor_id || null,
                notas?.trim() || null
            );
            req.flash('success', `✅ Cheque #${numero_cheque} creado`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al crear cheque: ' + err.message);
        }
        res.redirect('/deudas/cheques');
    });

    router.post('/cheques/:id/editar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { numero_cheque, banco, beneficiario, monto, fecha_emision, fecha_vencimiento, estado, proveedor_id, notas } = req.body;

            const montoNum = parseFloat(monto);

            await db.run(
                `UPDATE deudas_cheques
                 SET numero_cheque = ?, banco = ?, beneficiario = ?, monto = ?,
                     fecha_emision = ?, fecha_vencimiento = ?, estado = ?, proveedor_id = ?, notas = ?
                 WHERE id = ?`,
                numero_cheque?.trim(),
                banco?.trim(),
                beneficiario?.trim(),
                montoNum,
                fecha_emision,
                fecha_vencimiento,
                estado || 'pendiente',
                proveedor_id || null,
                notas?.trim() || null,
                id
            );
            req.flash('success', '✅ Cheque actualizado');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al actualizar cheque: ' + err.message);
        }
        res.redirect('/deudas/cheques');
    });

    router.post('/cheques/:id/eliminar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.run('DELETE FROM deudas_cheques WHERE id = ?', id);
            req.flash('success', '✅ Cheque eliminado');
        } catch (err) {
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/deudas/cheques');
    });

    router.post('/cheques/:id/pagar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { fecha, metodo_pago, notas } = req.body;

            const cheque = await db.get('SELECT monto FROM deudas_cheques WHERE id = ?', id);
            if (!cheque) {
                req.flash('error', 'Cheque no encontrado');
                return res.redirect('/deudas/cheques');
            }

            // Registrar en movimientos_caja
            await db.run(
                `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, usuario_id, fecha, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                'egreso',
                'Cheque Cobrado',
                'Deuda',
                cheque.monto,
                metodo_pago || null,
                req.session?.userId || null,
                fecha || new Date().toISOString().slice(0, 10),
                notas?.trim() || null
            );

            // Registrar pago
            await db.run(
                `INSERT INTO deudas_pagos (tipo_deuda, deuda_id, monto, fecha, metodo_pago, usuario_id, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                'cheque',
                id,
                cheque.monto,
                fecha || new Date().toISOString().slice(0, 10),
                metodo_pago || null,
                req.session?.userId || null,
                notas?.trim() || null
            );

            // Marcar cheque como cobrado
            await db.run('UPDATE deudas_cheques SET estado = ? WHERE id = ?', 'cobrado', id);

            req.flash('success', `✅ Cheque marcado como cobrado`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/deudas/cheques');
    });

    // ════════════════════════════════════════════════════════════════
    // PRÉSTAMOS
    // ════════════════════════════════════════════════════════════════

    router.get('/prestamos', checkPermission, async (req, res) => {
        try {
            const prestamos = await db.all(`
                SELECT * FROM deudas_prestamos ORDER BY fecha_primer_vencimiento ASC
            `) || [];

            const totalActivos = prestamos.filter(p => p.estado === 'activo').reduce((s, p) => s + p.monto_pendiente, 0);

            res.render('deudas/prestamos', {
                title: 'Préstamos',
                prestamos,
                totalActivos,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al cargar préstamos: ' + err.message);
            res.redirect('/deudas');
        }
    });

    router.post('/prestamos', checkPermission, async (req, res) => {
        const { descripcion, entidad, monto_original, monto_pendiente, cuota_mensual, fecha_primer_vencimiento, dia_vencimiento_mensual, cuotas_totales, tasa_interes, notas } = req.body;
        try {
            if (!descripcion || !entidad || !monto_original) {
                req.flash('error', 'Campos requeridos faltantes');
                return res.redirect('/deudas/prestamos');
            }

            const montoOrig = parseFloat(monto_original);
            const montoPend = parseFloat(monto_pendiente) || montoOrig;
            const cuotaMen = parseFloat(cuota_mensual) || 0;
            const tasa = parseFloat(tasa_interes) || 0;
            const cuotas = parseInt(cuotas_totales) || 0;

            await db.run(
                `INSERT INTO deudas_prestamos
                 (descripcion, entidad, monto_original, monto_pendiente, cuota_mensual, fecha_primer_vencimiento,
                  dia_vencimiento_mensual, cuotas_totales, tasa_interes, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                descripcion.trim(),
                entidad.trim(),
                montoOrig,
                montoPend,
                cuotaMen,
                fecha_primer_vencimiento || null,
                parseInt(dia_vencimiento_mensual) || null,
                cuotas,
                tasa,
                notas?.trim() || null
            );
            req.flash('success', `✅ Préstamo de $${montoOrig.toLocaleString('es-AR', {minimumFractionDigits: 2})} creado`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al crear préstamo: ' + err.message);
        }
        res.redirect('/deudas/prestamos');
    });

    router.post('/prestamos/:id/editar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { descripcion, entidad, monto_original, monto_pendiente, cuota_mensual, fecha_primer_vencimiento,
                    dia_vencimiento_mensual, cuotas_totales, cuotas_pagadas, tasa_interes, estado, notas } = req.body;

            const montoOrig = parseFloat(monto_original);
            const montoPend = parseFloat(monto_pendiente);
            const cuotaMen = parseFloat(cuota_mensual) || 0;
            const tasa = parseFloat(tasa_interes) || 0;

            await db.run(
                `UPDATE deudas_prestamos
                 SET descripcion = ?, entidad = ?, monto_original = ?, monto_pendiente = ?, cuota_mensual = ?,
                     fecha_primer_vencimiento = ?, dia_vencimiento_mensual = ?, cuotas_totales = ?,
                     cuotas_pagadas = ?, tasa_interes = ?, estado = ?, notas = ?
                 WHERE id = ?`,
                descripcion?.trim(),
                entidad?.trim(),
                montoOrig,
                montoPend,
                cuotaMen,
                fecha_primer_vencimiento || null,
                parseInt(dia_vencimiento_mensual) || null,
                parseInt(cuotas_totales) || 0,
                parseInt(cuotas_pagadas) || 0,
                tasa,
                estado || 'activo',
                notas?.trim() || null,
                id
            );
            req.flash('success', '✅ Préstamo actualizado');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al actualizar préstamo: ' + err.message);
        }
        res.redirect('/deudas/prestamos');
    });

    router.post('/prestamos/:id/eliminar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.run('DELETE FROM deudas_prestamos WHERE id = ?', id);
            req.flash('success', '✅ Préstamo eliminado');
        } catch (err) {
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/deudas/prestamos');
    });

    router.post('/prestamos/:id/pagar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { monto, fecha, metodo_pago, notas } = req.body;
            const montoNum = parseFloat(monto);

            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'Monto inválido');
                return res.redirect('/deudas/prestamos');
            }

            const prestamo = await db.get('SELECT monto_pendiente, cuotas_pagadas FROM deudas_prestamos WHERE id = ?', id);
            if (!prestamo) {
                req.flash('error', 'Préstamo no encontrado');
                return res.redirect('/deudas/prestamos');
            }

            // Registrar en movimientos_caja
            await db.run(
                `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, usuario_id, fecha, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                'egreso',
                'Pago Préstamo',
                'Deuda',
                montoNum,
                metodo_pago || null,
                req.session?.userId || null,
                fecha || new Date().toISOString().slice(0, 10),
                notas?.trim() || null
            );

            // Registrar pago
            await db.run(
                `INSERT INTO deudas_pagos (tipo_deuda, deuda_id, monto, fecha, metodo_pago, usuario_id, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                'prestamo',
                id,
                montoNum,
                fecha || new Date().toISOString().slice(0, 10),
                metodo_pago || null,
                req.session?.userId || null,
                notas?.trim() || null
            );

            // Actualizar saldo y cuotas
            const nuevoSaldo = Math.max(0, prestamo.monto_pendiente - montoNum);
            const nuevosCuotaPagadas = prestamo.cuotas_pagadas + 1;

            await db.run(
                'UPDATE deudas_prestamos SET monto_pendiente = ?, cuotas_pagadas = ? WHERE id = ?',
                nuevoSaldo,
                nuevosCuotaPagadas,
                id
            );

            // Si está pagado, cambiar estado
            if (nuevoSaldo <= 0) {
                await db.run('UPDATE deudas_prestamos SET estado = ? WHERE id = ?', 'cancelado', id);
            }

            req.flash('success', `✅ Pago de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado (Cuota ${nuevosCuotaPagadas})`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al registrar pago: ' + err.message);
        }
        res.redirect('/deudas/prestamos');
    });

    // ════════════════════════════════════════════════════════════════
    // DEUDAS CON PROVEEDORES
    // ════════════════════════════════════════════════════════════════

    router.get('/proveedores-deuda', checkPermission, async (req, res) => {
        try {
            const deudas = await db.all(`
                SELECT d.*, p.nombre AS proveedor_nombre
                FROM deudas_proveedores d
                LEFT JOIN proveedores p ON d.proveedor_id = p.id
                ORDER BY d.fecha_vencimiento ASC
            `) || [];

            const proveedores = await db.all("SELECT id, nombre FROM proveedores ORDER BY nombre ASC") || [];
            const totalPendiente = deudas.filter(d => d.estado !== 'pagado').reduce((s, d) => s + (d.monto_total - d.monto_pagado), 0);

            res.render('deudas/proveedores-deuda', {
                title: 'Deudas con Proveedores',
                deudas,
                proveedores,
                totalPendiente,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al cargar deudas: ' + err.message);
            res.redirect('/deudas');
        }
    });

    router.post('/proveedores-deuda', checkPermission, async (req, res) => {
        const { proveedor_id, concepto, monto_total, fecha_deuda, fecha_vencimiento, notas } = req.body;
        try {
            if (!concepto || !monto_total || !fecha_deuda) {
                req.flash('error', 'Campos requeridos faltantes');
                return res.redirect('/deudas/proveedores-deuda');
            }

            const montoTot = parseFloat(monto_total);
            if (isNaN(montoTot) || montoTot <= 0) {
                req.flash('error', 'Monto inválido');
                return res.redirect('/deudas/proveedores-deuda');
            }

            await db.run(
                `INSERT INTO deudas_proveedores (proveedor_id, concepto, monto_total, fecha_deuda, fecha_vencimiento, notas)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                proveedor_id || null,
                concepto.trim(),
                montoTot,
                fecha_deuda,
                fecha_vencimiento || null,
                notas?.trim() || null
            );
            req.flash('success', `✅ Deuda de $${montoTot.toLocaleString('es-AR', {minimumFractionDigits: 2})} creada`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al crear deuda: ' + err.message);
        }
        res.redirect('/deudas/proveedores-deuda');
    });

    router.post('/proveedores-deuda/:id/editar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { proveedor_id, concepto, monto_total, monto_pagado, fecha_deuda, fecha_vencimiento, estado, notas } = req.body;

            const montoTot = parseFloat(monto_total);
            const montoPag = parseFloat(monto_pagado) || 0;

            await db.run(
                `UPDATE deudas_proveedores
                 SET proveedor_id = ?, concepto = ?, monto_total = ?, monto_pagado = ?,
                     fecha_deuda = ?, fecha_vencimiento = ?, estado = ?, notas = ?
                 WHERE id = ?`,
                proveedor_id || null,
                concepto?.trim(),
                montoTot,
                montoPag,
                fecha_deuda,
                fecha_vencimiento || null,
                estado || 'pendiente',
                notas?.trim() || null,
                id
            );
            req.flash('success', '✅ Deuda actualizada');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al actualizar deuda: ' + err.message);
        }
        res.redirect('/deudas/proveedores-deuda');
    });

    router.post('/proveedores-deuda/:id/eliminar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.run('DELETE FROM deudas_proveedores WHERE id = ?', id);
            req.flash('success', '✅ Deuda eliminada');
        } catch (err) {
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/deudas/proveedores-deuda');
    });

    router.post('/proveedores-deuda/:id/pagar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { monto, fecha, metodo_pago, notas } = req.body;
            const montoNum = parseFloat(monto);

            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'Monto inválido');
                return res.redirect('/deudas/proveedores-deuda');
            }

            const deuda = await db.get('SELECT monto_total, monto_pagado FROM deudas_proveedores WHERE id = ?', id);
            if (!deuda) {
                req.flash('error', 'Deuda no encontrada');
                return res.redirect('/deudas/proveedores-deuda');
            }

            // Registrar en movimientos_caja
            await db.run(
                `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, usuario_id, fecha, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                'egreso',
                'Pago Proveedor',
                'Deuda',
                montoNum,
                metodo_pago || null,
                req.session?.userId || null,
                fecha || new Date().toISOString().slice(0, 10),
                notas?.trim() || null
            );

            // Registrar pago
            await db.run(
                `INSERT INTO deudas_pagos (tipo_deuda, deuda_id, monto, fecha, metodo_pago, usuario_id, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                'proveedor',
                id,
                montoNum,
                fecha || new Date().toISOString().slice(0, 10),
                metodo_pago || null,
                req.session?.userId || null,
                notas?.trim() || null
            );

            // Actualizar monto pagado
            const nuevoPagado = deuda.monto_pagado + montoNum;
            const nuevoEstado = nuevoPagado >= deuda.monto_total ? 'pagado' :
                               (nuevoPagado > 0 ? 'pagado_parcial' : 'pendiente');

            await db.run(
                'UPDATE deudas_proveedores SET monto_pagado = ?, estado = ? WHERE id = ?',
                nuevoPagado,
                nuevoEstado,
                id
            );

            req.flash('success', `✅ Pago de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al registrar pago: ' + err.message);
        }
        res.redirect('/deudas/proveedores-deuda');
    });

    // ════════════════════════════════════════════════════════════════
    // GRÁFICOS Y ANÁLISIS
    // ════════════════════════════════════════════════════════════════

    router.get('/graficos/deudas', checkPermission, async (req, res) => {
        try {
            const totalTarjetas = (await db.get(`
                SELECT COALESCE(SUM(saldo_adeudado), 0) AS total
                FROM deudas_tarjetas WHERE estado = 'activa'
            `))?.total || 0;

            const totalCheques = (await db.get(`
                SELECT COALESCE(SUM(monto), 0) AS total
                FROM deudas_cheques WHERE estado = 'pendiente'
            `))?.total || 0;

            const totalPrestamos = (await db.get(`
                SELECT COALESCE(SUM(monto_pendiente), 0) AS total
                FROM deudas_prestamos WHERE estado = 'activo'
            `))?.total || 0;

            const totalProveedores = (await db.get(`
                SELECT COALESCE(SUM(monto_total - monto_pagado), 0) AS total
                FROM deudas_proveedores WHERE estado != 'pagado'
            `))?.total || 0;

            // Último 6 meses de pagos
            const pagos6Meses = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const mes = d.toISOString().slice(0, 7);
                const label = d.toLocaleDateString('es-AR', { year: '2-digit', month: 'short' });

                const monto = (await db.get(
                    "SELECT COALESCE(SUM(monto), 0) AS total FROM deudas_pagos WHERE strftime('%Y-%m', fecha) = ?",
                    mes
                ))?.total || 0;

                pagos6Meses.push({ mes: label, monto });
            }

            res.json({
                deudaPorTipo: [
                    { label: 'Tarjetas', value: totalTarjetas, color: '#dc3545' },
                    { label: 'Cheques', value: totalCheques, color: '#ffc107' },
                    { label: 'Préstamos', value: totalPrestamos, color: '#0dcaf0' },
                    { label: 'Proveedores', value: totalProveedores, color: '#198754' }
                ],
                pagosPor6Meses: pagos6Meses
            });
        } catch (err) {
            console.error('Error:', err);
            res.json({ error: err.message });
        }
    });

    // ════════════════════════════════════════════════════════════════
    // ALERTAS Y VENCIMIENTOS
    // ════════════════════════════════════════════════════════════════

    router.get('/alertas', checkPermission, async (req, res) => {
        try {
            const vencidos = await db.all(`
                SELECT 'cheque' AS tipo, numero_cheque AS descripcion, monto, fecha_vencimiento
                FROM deudas_cheques
                WHERE estado = 'pendiente' AND date(fecha_vencimiento) < date('now')
                UNION ALL
                SELECT 'proveedor', concepto, (monto_total - monto_pagado), fecha_vencimiento
                FROM deudas_proveedores
                WHERE estado != 'pagado' AND fecha_vencimiento IS NOT NULL
                  AND date(fecha_vencimiento) < date('now')
            `) || [];

            const proximos7dias = await db.all(`
                SELECT 'cheque' AS tipo, numero_cheque AS descripcion, monto, fecha_vencimiento
                FROM deudas_cheques
                WHERE estado = 'pendiente'
                  AND date(fecha_vencimiento) >= date('now')
                  AND date(fecha_vencimiento) <= date('now', '+7 days')
                UNION ALL
                SELECT 'proveedor', concepto, (monto_total - monto_pagado), fecha_vencimiento
                FROM deudas_proveedores
                WHERE estado != 'pagado' AND fecha_vencimiento IS NOT NULL
                  AND date(fecha_vencimiento) >= date('now')
                  AND date(fecha_vencimiento) <= date('now', '+7 days')
            `) || [];

            res.json({
                vencidos: vencidos.length,
                proximos7dias: proximos7dias.length,
                detalles: {
                    vencidos,
                    proximos7dias
                }
            });
        } catch (err) {
            console.error('Error:', err);
            res.json({ error: err.message });
        }
    });

    // ════════════════════════════════════════════════════════════════
    // BÚSQUEDA Y FILTROS
    // ════════════════════════════════════════════════════════════════

    router.get('/buscar', checkPermission, async (req, res) => {
        try {
            const q = req.query.q?.toLowerCase() || '';
            const tipo = req.query.tipo || 'todos';

            if (!q || q.length < 2) {
                return res.json([]);
            }

            const resultados = [];

            if (tipo === 'todos' || tipo === 'tarjetas') {
                const tarjetas = await db.all(`
                    SELECT 'tarjeta' AS tipo, id, nombre_tarjeta AS nombre, saldo_adeudado AS monto, estado
                    FROM deudas_tarjetas
                    WHERE nombre_tarjeta LIKE ?
                `, `%${q}%`) || [];
                resultados.push(...tarjetas);
            }

            if (tipo === 'todos' || tipo === 'cheques') {
                const cheques = await db.all(`
                    SELECT 'cheque' AS tipo, id, numero_cheque AS nombre, monto, estado
                    FROM deudas_cheques
                    WHERE numero_cheque LIKE ? OR beneficiario LIKE ? OR banco LIKE ?
                `, `%${q}%`, `%${q}%`, `%${q}%`) || [];
                resultados.push(...cheques);
            }

            if (tipo === 'todos' || tipo === 'prestamos') {
                const prestamos = await db.all(`
                    SELECT 'prestamo' AS tipo, id, descripcion AS nombre, monto_pendiente AS monto, estado
                    FROM deudas_prestamos
                    WHERE descripcion LIKE ? OR entidad LIKE ?
                `, `%${q}%`, `%${q}%`) || [];
                resultados.push(...prestamos);
            }

            if (tipo === 'todos' || tipo === 'proveedores') {
                const deudas = await db.all(`
                    SELECT 'proveedor' AS tipo, d.id, d.concepto AS nombre,
                           (d.monto_total - d.monto_pagado) AS monto, d.estado,
                           p.nombre AS proveedor_nombre
                    FROM deudas_proveedores d
                    LEFT JOIN proveedores p ON d.proveedor_id = p.id
                    WHERE d.concepto LIKE ? OR p.nombre LIKE ?
                `, `%${q}%`, `%${q}%`) || [];
                resultados.push(...deudas);
            }

            res.json(resultados);
        } catch (err) {
            console.error('Error:', err);
            res.json({ error: err.message });
        }
    });

    // ════════════════════════════════════════════════════════════════
    // EXPORTAR REPORTE PDF
    // ════════════════════════════════════════════════════════════════

    router.get('/reporte-pdf', checkPermission, async (req, res) => {
        try {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument();
            const filename = `reporte-deudas-${new Date().toISOString().slice(0, 10)}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            doc.pipe(res);

            // Título
            doc.fontSize(20).font('Helvetica-Bold').text('REPORTE DE DEUDAS', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, { align: 'center' });
            doc.moveDown();

            // Totales
            const totalTarjetas = (await db.get(`
                SELECT COALESCE(SUM(saldo_adeudado), 0) AS total FROM deudas_tarjetas WHERE estado = 'activa'
            `))?.total || 0;

            const totalCheques = (await db.get(`
                SELECT COALESCE(SUM(monto), 0) AS total FROM deudas_cheques WHERE estado = 'pendiente'
            `))?.total || 0;

            const totalPrestamos = (await db.get(`
                SELECT COALESCE(SUM(monto_pendiente), 0) AS total FROM deudas_prestamos WHERE estado = 'activo'
            `))?.total || 0;

            const totalProveedores = (await db.get(`
                SELECT COALESCE(SUM(monto_total - monto_pagado), 0) AS total FROM deudas_proveedores WHERE estado != 'pagado'
            `))?.total || 0;

            const deudaTotal = totalTarjetas + totalCheques + totalPrestamos + totalProveedores;

            // Resumen
            doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN DE DEUDAS');
            doc.fontSize(10).font('Helvetica');
            doc.text(`Tarjetas de Crédito: $${totalTarjetas.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
            doc.text(`Cheques Diferidos: $${totalCheques.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
            doc.text(`Préstamos: $${totalPrestamos.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
            doc.text(`Proveedores: $${totalProveedores.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
            doc.fontSize(12).font('Helvetica-Bold').text(`TOTAL: $${deudaTotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
            doc.moveDown();

            // Tarjetas
            doc.fontSize(12).font('Helvetica-Bold').text('TARJETAS DE CRÉDITO');
            const tarjetas = await db.all('SELECT * FROM deudas_tarjetas WHERE estado = "activa" ORDER BY nombre_tarjeta');
            if (tarjetas.length > 0) {
                doc.fontSize(9).font('Helvetica');
                tarjetas.forEach(t => {
                    doc.text(`${t.nombre_tarjeta}: $${t.saldo_adeudado.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
                });
            } else {
                doc.text('Sin tarjetas registradas');
            }
            doc.moveDown();

            // Cheques
            doc.fontSize(12).font('Helvetica-Bold').text('CHEQUES PENDIENTES');
            const cheques = await db.all('SELECT * FROM deudas_cheques WHERE estado = "pendiente" ORDER BY fecha_vencimiento');
            if (cheques.length > 0) {
                doc.fontSize(9).font('Helvetica');
                cheques.forEach(ch => {
                    doc.text(`Cheque #${ch.numero_cheque} - ${ch.beneficiario}: $${ch.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})} (Vence: ${new Date(ch.fecha_vencimiento).toLocaleDateString('es-AR')})`);
                });
            } else {
                doc.text('Sin cheques pendientes');
            }
            doc.moveDown();

            // Préstamos
            doc.fontSize(12).font('Helvetica-Bold').text('PRÉSTAMOS ACTIVOS');
            const prestamos = await db.all('SELECT * FROM deudas_prestamos WHERE estado = "activo" ORDER BY descripcion');
            if (prestamos.length > 0) {
                doc.fontSize(9).font('Helvetica');
                prestamos.forEach(p => {
                    doc.text(`${p.descripcion} (${p.entidad}): $${p.monto_pendiente.toLocaleString('es-AR', {minimumFractionDigits: 2})} pendiente`);
                });
            } else {
                doc.text('Sin préstamos activos');
            }

            doc.end();
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al generar PDF: ' + err.message);
            res.redirect('/deudas');
        }
    });

    return router;
};
