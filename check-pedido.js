const initDb = require('./config/db');

async function check() {
    const db = await initDb;
    const pedido = await db.get('SELECT * FROM pedidos WHERE id = 30');
    console.log('Pedido 30:', pedido);
    process.exit(0);
}

check().catch(err => console.error(err.message));
