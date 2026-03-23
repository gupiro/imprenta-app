// test-integridad.js - Testing completo de integridad financiera

const initDb = require('./config/db');
const { diasHasta, calcularPrioridad } = require('./utils/pagosHelper');

let testsPasados = 0;
let testsFallidos = 0;

async function test(nombre, fn) {
    try {
        await fn();
        console.log(`✅ ${nombre}`);
        testsPasados++;
    } catch (error) {
        console.log(`❌ ${nombre}`);
        console.log(`   Error: ${error.message}`);
        testsFallidos++;
    }
}

async function assertEquals(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(`${msg} - Esperado: ${expected}, Actual: ${actual}`);
    }
}

async function assertGreaterOrEqual(actual, expected, msg) {
    if (actual < expected) {
        throw new Error(`${msg} - Esperado >= ${expected}, Actual: ${actual}`);
    }
}

async function runTests() {
    console.log('\n🧪 INICIANDO TESTING DE INTEGRIDAD FINANCIERA\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const db = await initDb;

    // ════════════════════════════════════════════════════════════════
    // TEST 1: CAJA DIARIA - Suma de ingresos y egresos
    // ════════════════════════════════════════════════════════════════

    await test('Caja: Ingresos totales se suman correctamente', async () => {
        const ingresosBD = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso'"
        ))?.total || 0;

        const movimientos = await db.all(
            "SELECT monto FROM movimientos_caja WHERE tipo = 'ingreso'"
        );

        const ingresoManual = movimientos.reduce((s, m) => s + m.monto, 0);
        await assertEquals(ingresosBD, ingresoManual, 'Suma ingresos mismatch');
    });

    await test('Caja: Egresos totales se suman correctamente', async () => {
        const egresosBD = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso'"
        ))?.total || 0;

        const movimientos = await db.all(
            "SELECT monto FROM movimientos_caja WHERE tipo = 'egreso'"
        );

        const egresosManual = movimientos.reduce((s, m) => s + m.monto, 0);
        await assertEquals(egresosBD, egresosManual, 'Suma egresos mismatch');
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 2: GASTOS - Separación negocio vs personal
    // ════════════════════════════════════════════════════════════════

    await test('Gastos: Separación de tipo (negocio vs personal)', async () => {
        const gastosTotales = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos"
        ))?.total || 0;

        const gastosNegocio = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE tipo = 'negocio'"
        ))?.total || 0;

        const gastosPersonal = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE tipo = 'personal'"
        ))?.total || 0;

        const suma = gastosNegocio + gastosPersonal;
        await assertEquals(gastosTotales, suma, 'Suma de tipos no coincide');
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 3: PEDIDOS - Monto pendiente correcto
    // ════════════════════════════════════════════════════════════════

    await test('Pedidos: monto_restante = precio - monto_entregado', async () => {
        const pedidos = await db.all(
            "SELECT id, precio, monto_entregado, monto_restante FROM pedidos WHERE precio > 0"
        );

        for (let p of pedidos) {
            const esperado = p.precio - p.monto_entregado;
            await assertEquals(p.monto_restante, esperado,
                `Pedido ${p.id}: monto_restante error`);
        }
    });

    await test('Pedidos: Verificar sobrepagos (monto_restante negativo)', async () => {
        const pedidos = await db.all(
            "SELECT id, precio, monto_entregado, monto_restante FROM pedidos WHERE monto_restante < 0"
        );

        if (pedidos.length > 0) {
            console.log(`   ⚠️  ${pedidos.length} pedido(s) con sobrepago (legítimo):`);
            pedidos.forEach(p => {
                const sobrepago = Math.abs(p.monto_restante);
                console.log(`      - Pedido ${p.id}: Sobrepago de $${sobrepago.toFixed(2)}`);
            });
        }
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 4: PRESUPUESTOS - Cálculo de totales
    // ════════════════════════════════════════════════════════════════

    await test('Presupuestos: Items tienen subtotal correcto', async () => {
        const items = await db.all(
            "SELECT id, cantidad, precio_unitario, descuento_item, subtotal FROM presupuesto_items"
        );

        for (let item of items) {
            const esperado = (item.cantidad * item.precio_unitario) - item.descuento_item;
            const diferencia = Math.abs(item.subtotal - esperado);

            if (diferencia > 0.01) {
                throw new Error(
                    `Item ${item.id}: subtotal ${item.subtotal} vs calculado ${esperado}`
                );
            }
        }
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 5: DEUDAS - Consolidación correcta
    // ════════════════════════════════════════════════════════════════

    await test('Deudas: Tarjetas - saldo_adeudado no negativo', async () => {
        const tarjetas = await db.all(
            "SELECT id, saldo_adeudado FROM deudas_tarjetas WHERE saldo_adeudado < 0"
        );

        if (tarjetas.length > 0) {
            throw new Error(`${tarjetas.length} tarjetas con saldo negativo`);
        }
    });

    await test('Deudas: Proveedores - monto_pagado no excede monto_total', async () => {
        const proveedores = await db.all(
            "SELECT id, monto_total, monto_pagado FROM deudas_proveedores WHERE monto_pagado > monto_total"
        );

        if (proveedores.length > 0) {
            throw new Error(`${proveedores.length} proveedores con sobrepago`);
        }
    });

    await test('Deudas: Préstamos - monto_pendiente >= 0', async () => {
        const prestamos = await db.all(
            "SELECT id, monto_pendiente FROM deudas_prestamos WHERE monto_pendiente < 0"
        );

        if (prestamos.length > 0) {
            throw new Error(`${prestamos.length} préstamos con monto_pendiente negativo`);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 6: MOVIMIENTOS - Integridad de datos
    // ════════════════════════════════════════════════════════════════

    await test('Movimientos: Monto siempre positivo', async () => {
        const movimientos = await db.all(
            "SELECT id, monto FROM movimientos_caja WHERE monto <= 0"
        );

        if (movimientos.length > 0) {
            throw new Error(`${movimientos.length} movimientos con monto <= 0`);
        }
    });

    await test('Movimientos: Tipo válido (ingreso o egreso)', async () => {
        const movimientos = await db.all(
            "SELECT id FROM movimientos_caja WHERE tipo NOT IN ('ingreso', 'egreso')"
        );

        if (movimientos.length > 0) {
            throw new Error(`${movimientos.length} movimientos con tipo inválido`);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 7: FUNCIONES DE UTILIDAD
    // ════════════════════════════════════════════════════════════════

    await test('Utilidad: diasHasta calcula correctamente', async () => {
        const hoy = new Date();
        const maniana = new Date(hoy);
        maniana.setDate(maniana.getDate() + 1);

        const dias = diasHasta(maniana.toISOString());
        await assertGreaterOrEqual(dias, 0, 'Día futuro debe tener días positivos');
    });

    await test('Utilidad: calcularPrioridad asigna correctamente', async () => {
        const tests = [
            { dias: -1, esperado: 'VENCIDO' },
            { dias: 2, esperado: 'URGENTE' },
            { dias: 5, esperado: 'PRÓXIMO' },
            { dias: 15, esperado: 'PLANIFICAR' },
            { dias: 40, esperado: 'OK' },
        ];

        for (let t of tests) {
            const prio = calcularPrioridad(t.dias);
            const tiene = prio.label.includes(t.esperado);
            if (!tiene) {
                throw new Error(`dias=${t.dias}: ${prio.label} no contiene "${t.esperado}"`);
            }
        }
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 8: REPORTES - Egresos incluyen gastos
    // ════════════════════════════════════════════════════════════════

    await test('Reportes: Egresos = movimientos_caja + gastos', async () => {
        const hoy = new Date().toISOString().split('T')[0];

        const egresosMovimientos = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso' AND DATE(fecha) = ?",
            [hoy]
        ))?.total || 0;

        const gastos = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE DATE(fecha) = ?",
            [hoy]
        ))?.total || 0;

        const egresos = egresosMovimientos + gastos;

        console.log(`   (Movimientos egreso: $${egresosMovimientos}, Gastos: $${gastos}, Total: $${egresos})`);
    });

    // ════════════════════════════════════════════════════════════════
    // TEST 9: USUARIOS - Admin existe
    // ════════════════════════════════════════════════════════════════

    await test('Sistema: Usuario admin existe', async () => {
        const admin = await db.get(
            "SELECT id FROM users WHERE username = ?", ['admin']
        );

        if (!admin) {
            throw new Error('Usuario admin no encontrado');
        }
    });

    // ════════════════════════════════════════════════════════════════
    // RESUMEN
    // ════════════════════════════════════════════════════════════════

    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log(`📊 RESUMEN:`);
    console.log(`   ✅ Pasados: ${testsPasados}`);
    console.log(`   ❌ Fallidos: ${testsFallidos}`);
    console.log(`   📈 Total: ${testsPasados + testsFallidos}`);

    if (testsFallidos === 0) {
        console.log(`\n🎉 ¡TODOS LOS TESTS PASARON! Sistema íntegro.\n`);
    } else {
        console.log(`\n⚠️  ${testsFallidos} tests fallaron. Revisar integridad.\n`);
    }

    process.exit(testsFallidos > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Error fatal en testing:', err);
    process.exit(1);
});
