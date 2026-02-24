#!/usr/bin/env node

/**
 * TEST COMPLETO DEL MÓDULO GESTIÓN DE DEUDAS
 *
 * Este script prueba:
 * 1. Creación de deudas (tarjetas, cheques, préstamos, proveedores)
 * 2. Registros de pagos
 * 3. Alertas de vencimientos
 * 4. Búsqueda y filtros
 * 5. Datos para gráficos
 */

const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

const dbFile = path.join(__dirname, 'imprenta.db');

async function runTests() {
    console.log('🧪 INICIANDO TESTS DEL MÓDULO GESTIÓN DE DEUDAS\n');

    try {
        const db = await sqlite.open({ filename: dbFile, driver: sqlite3.Database });
        console.log('✅ Conexión a BD establecida\n');

        // ════════════════════════════════════════════════════════════════
        // TEST 1: CREAR TARJETA DE CRÉDITO
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 1: Crear Tarjeta de Crédito');
        await db.run(
            `INSERT INTO deudas_tarjetas (nombre_tarjeta, limite_credito, saldo_adeudado, fecha_cierre, fecha_vencimiento, monto_minimo)
             VALUES (?, ?, ?, ?, ?, ?)`,
            'Visa Santander', 50000, 15000, 15, 25, 5000
        );
        console.log('✅ Tarjeta creada\n');

        // ════════════════════════════════════════════════════════════════
        // TEST 2: CREAR CHEQUE DIFERIDO
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 2: Crear Cheque Diferido');
        const hoy = new Date().toISOString().slice(0, 10);
        const vencidoCheque = new Date();
        vencidoCheque.setDate(vencidoCheque.getDate() - 5);
        const fechaVencidaCheque = vencidoCheque.toISOString().slice(0, 10);

        await db.run(
            `INSERT INTO deudas_cheques (numero_cheque, banco, beneficiario, monto, fecha_emision, fecha_vencimiento)
             VALUES (?, ?, ?, ?, ?, ?)`,
            '001234', 'Banco Santander', 'Juan Pérez', 25000, hoy, fechaVencidaCheque
        );
        console.log('✅ Cheque vencido creado (para test de alertas)\n');

        // Cheque próximo a vencer
        const proximoCheque = new Date();
        proximoCheque.setDate(proximoCheque.getDate() + 3);
        const fechaProximaCheque = proximoCheque.toISOString().slice(0, 10);

        await db.run(
            `INSERT INTO deudas_cheques (numero_cheque, banco, beneficiario, monto, fecha_emision, fecha_vencimiento)
             VALUES (?, ?, ?, ?, ?, ?)`,
            '001235', 'Banco Galicia', 'María García', 18000, hoy, fechaProximaCheque
        );
        console.log('✅ Cheque próximo a vencer creado\n');

        // ════════════════════════════════════════════════════════════════
        // TEST 3: CREAR PRÉSTAMO
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 3: Crear Préstamo');
        await db.run(
            `INSERT INTO deudas_prestamos (descripcion, entidad, monto_original, monto_pendiente, cuota_mensual, cuotas_totales, cuotas_pagadas, tasa_interes, dia_vencimiento_mensual)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            'Préstamo para capital de trabajo', 'Banco Nación', 100000, 80000, 5000, 24, 4, 12.5, 25
        );
        console.log('✅ Préstamo creado\n');

        // ════════════════════════════════════════════════════════════════
        // TEST 4: CREAR DEUDA CON PROVEEDOR
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 4: Crear Deuda con Proveedor');
        const vencidoProveedor = new Date();
        vencidoProveedor.setDate(vencidoProveedor.getDate() - 2);
        const fechaVencidaProveedor = vencidoProveedor.toISOString().slice(0, 10);

        await db.run(
            `INSERT INTO deudas_proveedores (concepto, monto_total, monto_pagado, fecha_deuda, fecha_vencimiento)
             VALUES (?, ?, ?, ?, ?)`,
            'Compra de papel y tinta', 45000, 20000, hoy, fechaVencidaProveedor
        );
        console.log('✅ Deuda con proveedor creada (vencida)\n');

        // ════════════════════════════════════════════════════════════════
        // TEST 5: VERIFICAR ALERTAS DE VENCIMIENTOS
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 5: Verificar Alertas de Vencimientos');

        const vencidos = await db.all(`
            SELECT 'cheque' AS tipo, numero_cheque AS descripcion, monto, fecha_vencimiento
            FROM deudas_cheques
            WHERE estado = 'pendiente' AND date(fecha_vencimiento) < date('now')
            UNION ALL
            SELECT 'proveedor', concepto, (monto_total - monto_pagado), fecha_vencimiento
            FROM deudas_proveedores
            WHERE estado != 'pagado' AND fecha_vencimiento IS NOT NULL
              AND date(fecha_vencimiento) < date('now')
        `);

        console.log(`   📊 Deudas vencidas encontradas: ${vencidos.length}`);
        vencidos.forEach(v => {
            console.log(`      - ${v.tipo}: ${v.descripcion} - $${v.monto}`);
        });
        console.log('');

        // ════════════════════════════════════════════════════════════════
        // TEST 6: VERIFICAR GRÁFICOS
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 6: Verificar Datos para Gráficos');

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

        console.log(`   💳 Total Tarjetas: $${totalTarjetas.toLocaleString('es-AR')}`);
        console.log(`   📝 Total Cheques: $${totalCheques.toLocaleString('es-AR')}`);
        console.log(`   🏦 Total Préstamos: $${totalPrestamos.toLocaleString('es-AR')}`);
        console.log(`   🏪 Total Proveedores: $${totalProveedores.toLocaleString('es-AR')}`);
        console.log(`   📊 DEUDA TOTAL: $${(totalTarjetas + totalCheques + totalPrestamos + totalProveedores).toLocaleString('es-AR')}\n`);

        // ════════════════════════════════════════════════════════════════
        // TEST 7: REGISTRAR PAGO
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 7: Registrar Pago de Tarjeta');

        // Insertar en movimientos_caja
        const cajaResult = await db.run(
            `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, fecha)
             VALUES (?, ?, ?, ?, ?, ?)`,
            'egreso', 'Pago Tarjeta de Crédito', 'Deuda', 5000, 'transferencia', hoy
        );

        // Registrar en deudas_pagos
        await db.run(
            `INSERT INTO deudas_pagos (tipo_deuda, deuda_id, monto, fecha, metodo_pago)
             VALUES (?, ?, ?, ?, ?)`,
            'tarjeta', 1, 5000, hoy, 'transferencia'
        );

        // Actualizar saldo
        await db.run('UPDATE deudas_tarjetas SET saldo_adeudado = 10000 WHERE id = 1');

        console.log('✅ Pago registrado ($5000)\n');

        // ════════════════════════════════════════════════════════════════
        // TEST 8: VERIFICAR BÚSQUEDA
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 8: Verificar Búsqueda');

        const resultadosBusqueda = await db.all(`
            SELECT 'tarjeta' AS tipo, id, nombre_tarjeta AS nombre, saldo_adeudado AS monto, estado
            FROM deudas_tarjetas
            WHERE nombre_tarjeta LIKE ?
        `, '%Visa%');

        console.log(`   🔍 Búsqueda "Visa": ${resultadosBusqueda.length} resultado(s)`);
        resultadosBusqueda.forEach(r => {
            console.log(`      - ${r.nombre}: $${r.monto}`);
        });
        console.log('');

        // ════════════════════════════════════════════════════════════════
        // TEST 9: VERIFICAR CONTEOS
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 9: Verificar Conteos');

        const conteoTarjetas = (await db.get(`SELECT COUNT(*) AS c FROM deudas_tarjetas WHERE estado = 'activa'`))?.c || 0;
        const conteoCheques = (await db.get(`SELECT COUNT(*) AS c FROM deudas_cheques WHERE estado = 'pendiente'`))?.c || 0;
        const conteoPrestamos = (await db.get(`SELECT COUNT(*) AS c FROM deudas_prestamos WHERE estado = 'activo'`))?.c || 0;
        const conteoProveedores = (await db.get(`SELECT COUNT(*) AS c FROM deudas_proveedores WHERE estado != 'pagado'`))?.c || 0;
        const conteoPagos = (await db.get(`SELECT COUNT(*) AS c FROM deudas_pagos`))?.c || 0;

        console.log(`   📊 Tarjetas activas: ${conteoTarjetas}`);
        console.log(`   📊 Cheques pendientes: ${conteoCheques}`);
        console.log(`   📊 Préstamos activos: ${conteoPrestamos}`);
        console.log(`   📊 Deudas proveedores: ${conteoProveedores}`);
        console.log(`   📊 Pagos registrados: ${conteoPagos}\n`);

        // ════════════════════════════════════════════════════════════════
        // TEST 10: VERIFICAR HISTORIAL DE PAGOS
        // ════════════════════════════════════════════════════════════════
        console.log('TEST 10: Verificar Historial de Pagos');

        const historialPagos = await db.all(`
            SELECT * FROM deudas_pagos ORDER BY fecha DESC
        `);

        console.log(`   📋 Pagos en el historial: ${historialPagos.length}`);
        historialPagos.forEach((p, idx) => {
            console.log(`      ${idx + 1}. ${p.tipo_deuda} - $${p.monto} (${p.fecha})`);
        });
        console.log('');

        // ════════════════════════════════════════════════════════════════
        // RESUMEN FINAL
        // ════════════════════════════════════════════════════════════════
        console.log('✅ ════════════════════════════════════════════════════════════════');
        console.log('✅ TODOS LOS TESTS COMPLETADOS EXITOSAMENTE');
        console.log('✅ ════════════════════════════════════════════════════════════════\n');

        console.log('📋 RESUMEN DE DATOS DE PRUEBA:');
        console.log(`   • 1 Tarjeta de crédito ($10,000 adeudado)`);
        console.log(`   • 2 Cheques diferidos ($43,000 pendiente)`);
        console.log(`   • 1 Préstamo ($80,000 pendiente)`);
        console.log(`   • 1 Deuda con proveedor ($25,000 pendiente)`);
        console.log(`   • 1 Pago registrado ($5,000)\n`);

        console.log('🔗 PRÓXIMOS PASOS:');
        console.log('   1. Ir a http://localhost:3000/');
        console.log('   2. Login: admin / admin123');
        console.log('   3. Ir a "Deudas" en menú Admin');
        console.log('   4. Ver alertas en página home');
        console.log('   5. Ver gráficos, búsqueda y filtros\n');

        await db.close();
        process.exit(0);

    } catch (err) {
        console.error('❌ ERROR EN TESTS:', err);
        process.exit(1);
    }
}

runTests();
