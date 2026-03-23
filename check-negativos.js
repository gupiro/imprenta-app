const initDb = require('./config/db');

async function check() {
    const db = await initDb;
    const pedidos = await db.all(
        'SELECT id, precio, monto_entregado, monto_restante FROM pedidos WHERE monto_restante < 0'
    );
    console.log('\n📋 Pedidos con SOBREPAGO (monto_restante negativo):\n');
    pedidos.forEach(p => {
        const sobrepago = Math.abs(p.monto_restante);
        console.log(`  Pedido ${p.id}:`);
        console.log(`    Precio: $${p.precio}`);
        console.log(`    Entregado: $${p.monto_entregado}`);
        console.log(`    Sobrepago: $${sobrepago}\n`);
    });
    process.exit(0);
}

check().catch(err => console.error(err.message));
