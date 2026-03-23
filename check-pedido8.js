const initDb = require('./config/db');

async function check() {
    const db = await initDb;
    const pedido = await db.get('SELECT * FROM pedidos WHERE id = 8');
    console.log('\n📋 Pedido 8:\n');
    console.log(JSON.stringify(pedido, null, 2));
    
    console.log('\n💰 Movimientos de caja relacionados:');
    const movimientos = await db.all(
        "SELECT * FROM movimientos_caja WHERE pedido_id = 8"
    );
    console.log(JSON.stringify(movimientos, null, 2));
    
    process.exit(0);
}

check().catch(err => console.error(err.message));
