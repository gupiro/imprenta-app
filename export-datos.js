const initDb = require('./config/db');
const fs = require('fs');

async function exportar() {
    const db = await initDb;
    
    console.log('📊 Exportando datos...\n');
    
    const datos = {
        clients: await db.all('SELECT * FROM clients'),
        catalogo_productos: await db.all('SELECT * FROM catalogo_productos'),
        users: await db.all('SELECT id, username, password, rol FROM users'),
        pedidos: await db.all('SELECT * FROM pedidos'),
        productos: await db.all('SELECT * FROM productos'),
        movimientos_caja: await db.all('SELECT * FROM movimientos_caja'),
        presupuestos: await db.all('SELECT * FROM presupuestos'),
        presupuesto_items: await db.all('SELECT * FROM presupuesto_items'),
        stock: await db.all('SELECT * FROM stock'),
        gastos: await db.all('SELECT * FROM gastos'),
        proveedores: await db.all('SELECT * FROM proveedores'),
        deudas_tarjetas: await db.all('SELECT * FROM deudas_tarjetas'),
        deudas_cheques: await db.all('SELECT * FROM deudas_cheques'),
        deudas_prestamos: await db.all('SELECT * FROM deudas_prestamos'),
        deudas_proveedores: await db.all('SELECT * FROM deudas_proveedores'),
        deudas_pagos: await db.all('SELECT * FROM deudas_pagos'),
    };
    
    fs.writeFileSync('data-export.json', JSON.stringify(datos, null, 2));
    
    console.log('✅ Datos exportados:\n');
    Object.keys(datos).forEach(tabla => {
        console.log(`   ${tabla}: ${datos[tabla].length} registros`);
    });
    
    process.exit(0);
}

exportar().catch(err => console.error(err.message));
