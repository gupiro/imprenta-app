const initDb = require('./config/db');

async function fix() {
    const db = await initDb;
    
    // Arreglar pedido 8
    await db.run('UPDATE pedidos SET estado_pago = ? WHERE id = 8 AND monto_restante <= 0', ['PAGADO']);
    
    // Arreglar cualquier otro pedido con monto_restante <= 0 pero estado_pago != PAGADO
    await db.run('UPDATE pedidos SET estado_pago = ? WHERE monto_restante <= 0 AND estado_pago != ?', ['PAGADO', 'PAGADO']);
    
    console.log('✅ Pedidos con monto_restante <= 0 corregidos a estado_pago = PAGADO');
    process.exit(0);
}

fix().catch(err => console.error(err.message));
