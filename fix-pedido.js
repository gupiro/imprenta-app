const initDb = require('./config/db');

async function fix() {
    const db = await initDb;
    
    // Corregir pedido 30
    await db.run('UPDATE pedidos SET monto_restante = ? WHERE id = ?', 
        [21500 - 21505, 30]);
    
    console.log('✅ Pedido 30 corregido: monto_restante = -5');
    process.exit(0);
}

fix().catch(err => console.error(err.message));
