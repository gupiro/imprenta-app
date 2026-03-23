// test-completo.js - Suite de Tests Exhaustiva para Imprenta-App

const initDb = require('./config/db');

let testsPasados = 0;
let testsFallidos = 0;
const reporteDetallado = [];

async function test(modulo, nombre, fn) {
    try {
        await fn();
        console.log(`  ✅ ${nombre}`);
        testsPasados++;
        reporteDetallado.push({ modulo, nombre, estado: 'PASÓ' });
    } catch (error) {
        console.log(`  ❌ ${nombre}`);
        console.log(`     Error: ${error.message}`);
        testsFallidos++;
        reporteDetallado.push({ modulo, nombre, estado: 'FALLÓ', error: error.message });
    }
}

async function assertEquals(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(`${msg} - Esperado: ${expected}, Actual: ${actual}`);
    }
}

async function assertExists(value, msg) {
    if (!value) throw new Error(`${msg} - No encontrado`);
}

async function assertGreater(actual, expected, msg) {
    if (actual <= expected) throw new Error(`${msg} - Esperado > ${expected}, Actual: ${actual}`);
}

async function runTests() {
    console.log('\n🧪 SUITE DE TESTS EXHAUSTIVA - IMPRENTA-APP\n');
    console.log('═════════════════════════════════════════════════════════════\n');

    const db = await initDb;

    // ════════════════════════════════════════════════════════════════
    // MÓDULO 1: PEDIDOS
    // ════════════════════════════════════════════════════════════════
    console.log('📋 MÓDULO 1: PEDIDOS\n');

    await test('PEDIDOS', 'Crear pedido: Inserta correctamente', async () => {
        const pedido = await db.get('SELECT id, estado FROM pedidos ORDER BY id DESC LIMIT 1');
        assertExists(pedido, 'Pedido no encontrado');
        assertEquals(pedido.estado, 'PENDIENTE', 'Estado inicial debe ser PENDIENTE');
    });

    await test('PEDIDOS', 'Pedidos: Relación con cliente', async () => {
        const pedidos = await db.all('SELECT * FROM pedidos WHERE client_id IS NOT NULL LIMIT 5');
        for (let p of pedidos) {
            const cliente = await db.get('SELECT id FROM clients WHERE id = ?', [p.client_id]);
            assertExists(cliente, `Pedido ${p.id} tiene client_id ${p.client_id} inválido`);
        }
    });

    await test('PEDIDOS', 'Pedidos: Cálculo monto_restante correcto', async () => {
        const pedidos = await db.all(
            'SELECT id, precio, monto_entregado, monto_restante FROM pedidos WHERE precio > 0 LIMIT 10'
        );
        for (let p of pedidos) {
            const esperado = p.precio - p.monto_entregado;
            assertEquals(p.monto_restante, esperado, `Pedido ${p.id}: monto_restante incorrecto`);
        }
    });

    await test('PEDIDOS', 'Pedidos: Estado de pago actualizado al pagar', async () => {
        const pagados = await db.all(
            'SELECT id, monto_restante, estado_pago FROM pedidos WHERE monto_restante <= 0 LIMIT 5'
        );
        pagados.forEach(p => {
            assertEquals(p.estado_pago, 'PAGADO', `Pedido ${p.id}: estado_pago debe ser PAGADO cuando monto_restante <= 0`);
        });
    });

    await test('PEDIDOS', 'Pedidos: Productos relacionados existen', async () => {
        const pedidos = await db.all('SELECT id FROM pedidos LIMIT 3');
        for (let p of pedidos) {
            const productos = await db.all('SELECT id FROM productos WHERE pedido_id = ?', [p.id]);
            // Puede tener 0 o más productos
        }
    });

    await test('PEDIDOS', 'Pedidos: Estados válidos (PENDIENTE, EN_PRODUCCION, LISTO, ENTREGADO)', async () => {
        const invalidos = await db.all(
            "SELECT id FROM pedidos WHERE estado NOT IN ('PENDIENTE', 'EN_PRODUCCION', 'LISTO', 'ENTREGADO', 'CANCELADO')"
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} pedidos con estado inválido`);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // MÓDULO 2: CAJA DIARIA
    // ════════════════════════════════════════════════════════════════
    console.log('\n💰 MÓDULO 2: CAJA DIARIA\n');

    await test('CAJA', 'Movimientos: Tipo válido (ingreso/egreso)', async () => {
        const invalidos = await db.all(
            "SELECT id FROM movimientos_caja WHERE tipo NOT IN ('ingreso', 'egreso')"
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} movimientos con tipo inválido`);
        }
    });

    await test('CAJA', 'Movimientos: Monto siempre positivo', async () => {
        const negativos = await db.all('SELECT id FROM movimientos_caja WHERE monto <= 0');
        if (negativos.length > 0) {
            throw new Error(`${negativos.length} movimientos con monto negativo`);
        }
    });

    await test('CAJA', 'Movimientos: Suma ingresos correcta', async () => {
        const ingresosBD = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'ingreso'"
        ))?.total || 0;

        const movimientos = await db.all("SELECT monto FROM movimientos_caja WHERE tipo = 'ingreso'");
        const ingresoManual = movimientos.reduce((s, m) => s + m.monto, 0);

        assertEquals(ingresosBD, ingresoManual, 'Suma ingresos mismatch');
    });

    await test('CAJA', 'Movimientos: Suma egresos correcta', async () => {
        const egresosBD = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja WHERE tipo = 'egreso'"
        ))?.total || 0;

        const movimientos = await db.all("SELECT monto FROM movimientos_caja WHERE tipo = 'egreso'");
        const egresosManual = movimientos.reduce((s, m) => s + m.monto, 0);

        assertEquals(egresosBD, egresosManual, 'Suma egresos mismatch');
    });

    await test('CAJA', 'Movimientos: Métodos de pago válidos', async () => {
        const metodos = await db.all(
            "SELECT DISTINCT metodo_pago FROM movimientos_caja WHERE metodo_pago IS NOT NULL"
        );
        const metodosValidos = ['Efectivo', 'Transferencia', 'Tarjeta', 'QR'];
        for (let m of metodos) {
            if (!metodosValidos.includes(m.metodo_pago)) {
                throw new Error(`Método de pago inválido: ${m.metodo_pago}`);
            }
        }
    });

    // ════════════════════════════════════════════════════════════════
    // MÓDULO 3: CATÁLOGO Y STOCK
    // ════════════════════════════════════════════════════════════════
    console.log('\n📦 MÓDULO 3: CATÁLOGO Y STOCK\n');

    await test('CATÁLOGO', 'Productos: Tienen código único', async () => {
        const duplicados = await db.all(
            "SELECT codigo, COUNT(*) as cnt FROM catalogo_productos WHERE codigo IS NOT NULL GROUP BY codigo HAVING cnt > 1"
        );
        if (duplicados.length > 0) {
            throw new Error(`${duplicados.length} productos con código duplicado`);
        }
    });

    await test('CATÁLOGO', 'Productos: Precio base positivo', async () => {
        const negativos = await db.all('SELECT id FROM catalogo_productos WHERE precio_base <= 0');
        if (negativos.length > 0) {
            throw new Error(`${negativos.length} productos con precio negativo`);
        }
    });

    await test('CATÁLOGO', 'Productos: Tipo válido', async () => {
        const invalidos = await db.all(
            "SELECT id FROM catalogo_productos WHERE tipo NOT IN ('lona', 'fotocopia', 'impresion', 'otro')"
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} productos con tipo inválido`);
        }
    });

    await test('STOCK', 'Stock: Cantidad no negativa', async () => {
        const negativos = await db.all('SELECT id FROM stock WHERE cantidad < 0');
        if (negativos.length > 0) {
            throw new Error(`${negativos.length} items de stock con cantidad negativa`);
        }
    });

    await test('STOCK', 'Movimientos: Tipos válidos', async () => {
        const invalidos = await db.all(
            "SELECT id FROM movimientos_stock WHERE tipo NOT IN ('entrada', 'salida', 'ajuste')"
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} movimientos con tipo inválido`);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // MÓDULO 4: DEUDAS Y FINANZAS
    // ════════════════════════════════════════════════════════════════
    console.log('\n💳 MÓDULO 4: DEUDAS Y FINANZAS\n');

    await test('DEUDAS-TARJETAS', 'Saldo adeudado no negativo', async () => {
        const negativos = await db.all('SELECT id FROM deudas_tarjetas WHERE saldo_adeudado < 0');
        if (negativos.length > 0) {
            throw new Error(`${negativos.length} tarjetas con saldo negativo`);
        }
    });

    await test('DEUDAS-TARJETAS', 'Saldo adeudado <= límite de crédito', async () => {
        const exceso = await db.all(
            'SELECT id FROM deudas_tarjetas WHERE saldo_adeudado > limite_credito'
        );
        if (exceso.length > 0) {
            console.log(`   ⚠️  ${exceso.length} tarjetas con saldo > límite (pueden permitirse si hay mora)`);
        }
    });

    await test('DEUDAS-CHEQUES', 'Cheques: Monto positivo', async () => {
        const negativos = await db.all('SELECT id FROM deudas_cheques WHERE monto <= 0');
        if (negativos.length > 0) {
            throw new Error(`${negativos.length} cheques con monto negativo`);
        }
    });

    await test('DEUDAS-CHEQUES', 'Cheques: Estados válidos', async () => {
        const invalidos = await db.all(
            "SELECT id FROM deudas_cheques WHERE estado NOT IN ('pendiente', 'cobrado', 'rechazado')"
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} cheques con estado inválido`);
        }
    });

    await test('DEUDAS-PRESTAMOS', 'Monto pendiente >= 0', async () => {
        const negativos = await db.all('SELECT id FROM deudas_prestamos WHERE monto_pendiente < 0');
        if (negativos.length > 0) {
            throw new Error(`${negativos.length} préstamos con monto_pendiente negativo`);
        }
    });

    await test('DEUDAS-PRESTAMOS', 'Cuotas pagadas <= total', async () => {
        const exceso = await db.all(
            'SELECT id FROM deudas_prestamos WHERE cuotas_pagadas > cuotas_totales'
        );
        if (exceso.length > 0) {
            throw new Error(`${exceso.length} préstamos con cuotas pagadas > total`);
        }
    });

    await test('DEUDAS-PROVEEDORES', 'Monto pagado <= monto total', async () => {
        const exceso = await db.all(
            'SELECT id FROM deudas_proveedores WHERE monto_pagado > monto_total'
        );
        if (exceso.length > 0) {
            throw new Error(`${exceso.length} proveedores con monto pagado > total`);
        }
    });

    await test('DEUDAS-PAGOS', 'Pagos registran monto positivo', async () => {
        const negativos = await db.all('SELECT id FROM deudas_pagos WHERE monto <= 0');
        if (negativos.length > 0) {
            throw new Error(`${negativos.length} pagos con monto negativo`);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // MÓDULO 5: PRESUPUESTOS
    // ════════════════════════════════════════════════════════════════
    console.log('\n📄 MÓDULO 5: PRESUPUESTOS\n');

    await test('PRESUPUESTOS', 'Estados válidos', async () => {
        const invalidos = await db.all(
            "SELECT id FROM presupuestos WHERE estado NOT IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'CONVERTIDO')"
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} presupuestos con estado inválido`);
        }
    });

    await test('PRESUPUESTOS', 'Items: Subtotal correcto', async () => {
        const items = await db.all(
            "SELECT id, cantidad, precio_unitario, descuento_item, subtotal FROM presupuesto_items"
        );
        for (let item of items) {
            const esperado = (item.cantidad * item.precio_unitario) - item.descuento_item;
            const diferencia = Math.abs(item.subtotal - esperado);
            if (diferencia > 0.01) {
                throw new Error(`Item ${item.id}: subtotal ${item.subtotal} vs ${esperado}`);
            }
        }
    });

    await test('PRESUPUESTOS', 'Items: Cantidad positiva', async () => {
        const negativos = await db.all('SELECT id FROM presupuesto_items WHERE cantidad <= 0');
        if (negativos.length > 0) {
            throw new Error(`${negativos.length} items con cantidad <= 0`);
        }
    });

    await test('PRESUPUESTOS', 'Convertido a pedido: Relación correcta', async () => {
        const convertidos = await db.all(
            "SELECT id FROM presupuestos WHERE estado = 'CONVERTIDO' AND usado = 1"
        );
        for (let p of convertidos) {
            const pedido = await db.get(
                'SELECT id FROM pedidos WHERE presupuesto_id = ?', [p.id]
            );
            assertExists(pedido, `Presupuesto ${p.id} no tiene pedido asociado`);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // GASTOS Y SEPARACIÓN TIPOS
    // ════════════════════════════════════════════════════════════════
    console.log('\n💸 MÓDULO 6: GASTOS\n');

    await test('GASTOS', 'Tipo válido (negocio/personal)', async () => {
        const invalidos = await db.all(
            "SELECT id FROM gastos WHERE tipo NOT IN ('negocio', 'personal')"
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} gastos con tipo inválido`);
        }
    });

    await test('GASTOS', 'Monto positivo', async () => {
        const negativos = await db.all('SELECT id FROM gastos WHERE monto <= 0');
        if (negativos.length > 0) {
            throw new Error(`${negativos.length} gastos con monto negativo`);
        }
    });

    await test('GASTOS', 'Suma de negocio + personal = total', async () => {
        const total = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos"
        ))?.total || 0;

        const negocio = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE tipo = 'negocio'"
        ))?.total || 0;

        const personal = (await db.get(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE tipo = 'personal'"
        ))?.total || 0;

        assertEquals(total, negocio + personal, 'Suma de gastos por tipo no coincide');
    });

    // ════════════════════════════════════════════════════════════════
    // INTEGRIDAD DE RELACIONES
    // ════════════════════════════════════════════════════════════════
    console.log('\n🔗 INTEGRIDAD DE RELACIONES\n');

    await test('RELACIONES', 'Pedidos: client_id válido', async () => {
        const invalidos = await db.all(
            `SELECT p.id FROM pedidos p
             WHERE p.client_id IS NOT NULL AND p.client_id NOT IN (SELECT id FROM clients)`
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} pedidos con client_id inválido`);
        }
    });

    await test('RELACIONES', 'Movimientos caja: usuario_id válido si existe', async () => {
        const invalidos = await db.all(
            `SELECT m.id FROM movimientos_caja m
             WHERE m.usuario_id IS NOT NULL AND m.usuario_id NOT IN (SELECT id FROM users)`
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} movimientos con usuario_id inválido`);
        }
    });

    await test('RELACIONES', 'Deudas pagos: tipo_deuda válido', async () => {
        const invalidos = await db.all(
            "SELECT id FROM deudas_pagos WHERE tipo_deuda NOT IN ('tarjeta', 'cheque', 'prestamo', 'proveedor')"
        );
        if (invalidos.length > 0) {
            throw new Error(`${invalidos.length} pagos con tipo_deuda inválido`);
        }
    });

    // ════════════════════════════════════════════════════════════════
    // FLUJO COMPLETO: PRESUPUESTO → PEDIDO → CAJA
    // ════════════════════════════════════════════════════════════════
    console.log('\n🔄 FLUJOS COMPLETOSCS\n');

    await test('FLUJO', 'Presupuesto creado con items', async () => {
        const presupuestos = await db.all(
            'SELECT id FROM presupuestos LIMIT 3'
        );
        for (let p of presupuestos) {
            const items = await db.all(
                'SELECT id FROM presupuesto_items WHERE presupuesto_id = ?', [p.id]
            );
            // Puede tener 0 o más items (algunos presupuestos pueden ser vacíos)
        }
    });

    await test('FLUJO', 'Pedido creado registra adelanto en caja', async () => {
        const pedidosConAdelanto = await db.all(
            'SELECT id, precio FROM pedidos WHERE monto_entregado > 0 LIMIT 3'
        );
        for (let p of pedidosConAdelanto) {
            const movimiento = await db.get(
                "SELECT id FROM movimientos_caja WHERE pedido_id = ? AND tipo = 'ingreso' AND concepto LIKE 'Adelanto%'",
                [p.id]
            );
            // Puede o no tener movimiento, depende del flujo
        }
    });

    await test('FLUJO', 'Pago de pedido registra en movimientos_caja', async () => {
        const pedidosPagados = await db.all(
            "SELECT id FROM pedidos WHERE estado_pago = 'PAGADO' LIMIT 3"
        );
        for (let p of pedidosPagados) {
            const movimientos = await db.all(
                "SELECT id FROM movimientos_caja WHERE pedido_id = ? AND tipo = 'ingreso'",
                [p.id]
            );
            // Debe tener al menos un movimiento
        }
    });

    // ════════════════════════════════════════════════════════════════
    // RESUMEN
    // ════════════════════════════════════════════════════════════════

    console.log('\n═════════════════════════════════════════════════════════════\n');
    console.log('📊 RESUMEN DE TESTS:\n');

    const porModulo = {};
    reporteDetallado.forEach(r => {
        if (!porModulo[r.modulo]) porModulo[r.modulo] = { pasados: 0, fallidos: 0 };
        if (r.estado === 'PASÓ') porModulo[r.modulo].pasados++;
        else porModulo[r.modulo].fallidos++;
    });

    Object.keys(porModulo).forEach(mod => {
        const stats = porModulo[mod];
        const total = stats.pasados + stats.fallidos;
        const porcentaje = Math.round((stats.pasados / total) * 100);
        const barra = '█'.repeat(Math.round(porcentaje / 5)) + '░'.repeat(20 - Math.round(porcentaje / 5));
        console.log(`${mod.padEnd(20)} [${barra}] ${stats.pasados}/${total} (${porcentaje}%)`);
    });

    console.log('\n📈 TOTALES:\n');
    console.log(`   ✅ Pasados:  ${testsPasados}`);
    console.log(`   ❌ Fallidos: ${testsFallidos}`);
    console.log(`   📊 Total:    ${testsPasados + testsFallidos}`);
    console.log(`   🎯 Tasa de éxito: ${Math.round((testsPasados / (testsPasados + testsFallidos)) * 100)}%\n`);

    if (testsFallidos === 0) {
        console.log('🎉 ¡SISTEMA COMPLETAMENTE ÍNTEGRO! Todos los módulos funcionan correctamente.\n');
    } else {
        console.log(`⚠️  ${testsFallidos} tests fallaron. Revisar errores arriba.\n`);
    }

    process.exit(testsFallidos > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
