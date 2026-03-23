const initDb = require('./config/db');

async function fix() {
    const db = await initDb;
    
    // Estandarizar métodos de pago a mayúscula correcta
    await db.run("UPDATE movimientos_caja SET metodo_pago = 'Transferencia' WHERE LOWER(metodo_pago) = 'transferencia'");
    await db.run("UPDATE movimientos_caja SET metodo_pago = 'Efectivo' WHERE LOWER(metodo_pago) = 'efectivo'");
    await db.run("UPDATE movimientos_caja SET metodo_pago = 'Tarjeta' WHERE LOWER(metodo_pago) = 'tarjeta'");
    await db.run("UPDATE movimientos_caja SET metodo_pago = 'QR' WHERE LOWER(metodo_pago) = 'qr'");
    
    // Verificar cambios
    const metodos = await db.all(
        "SELECT DISTINCT metodo_pago FROM movimientos_caja WHERE metodo_pago IS NOT NULL ORDER BY metodo_pago"
    );
    
    console.log('✅ Métodos de pago estandarizados:');
    metodos.forEach(m => console.log(`   - ${m.metodo_pago}`));
    
    process.exit(0);
}

fix().catch(err => console.error(err.message));
