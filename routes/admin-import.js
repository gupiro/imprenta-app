// routes/admin-import.js - Endpoint para importar datos (ADMIN ONLY)

const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // GET /admin/import - Formulario para importar
    router.get('/admin/import', (req, res) => {
        // Solo admin
        if (req.session?.user?.rol !== 'admin') {
            return res.status(403).send('❌ Acceso denegado');
        }

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Importar Datos</title>
                <style>
                    body { font-family: Arial; padding: 20px; }
                    .warning { background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    button { padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; }
                    button:hover { background: #218838; }
                    input { padding: 10px; margin: 10px 0; width: 100%; }
                </style>
            </head>
            <body>
                <h1>🔄 Importar Datos a Render</h1>

                <div class="warning">
                    ⚠️ <strong>ADVERTENCIA:</strong> Esta acción importará los datos de data-export.json<br>
                    Se borrarán los datos actuales en Render y se reemplazarán con los del archivo JSON.
                </div>

                <form method="POST" action="/admin/import">
                    <label>
                        <input type="password" name="confirm" placeholder="Escribe 'confirmo' para proceder" required>
                    </label>
                    <button type="submit">🔄 Importar Datos Ahora</button>
                </form>

                <hr>

                <p><strong>Después de importar:</strong></p>
                <ul>
                    <li>✅ Se cargarán todos los clientes, pedidos, gastos, etc.</li>
                    <li>✅ Los datos se guardarán en el disco persistente</li>
                    <li>✅ Puedes seguir usando la app normalmente</li>
                </ul>

                <p><a href="/">Volver al inicio</a></p>
            </body>
            </html>
        `);
    });

    // POST /admin/import - Ejecutar importación
    router.post('/admin/import', async (req, res) => {
        // Solo admin
        if (req.session?.user?.rol !== 'admin') {
            return res.status(403).send('❌ Acceso denegado');
        }

        const { confirm } = req.body;

        if (confirm !== 'confirmo') {
            return res.status(400).send('❌ Confirmación incorrecta. Debes escribir "confirmo"');
        }

        try {
            console.log('\n🔄 INICIANDO IMPORTACIÓN DE DATOS...\n');

            // Obtener datos del archivo JSON
            const fs = require('fs');
            const path = require('path');

            const dataPath = path.join(__dirname, '../data-export.json');

            if (!fs.existsSync(dataPath)) {
                return res.status(404).send('❌ No se encontró data-export.json');
            }

            const datos = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

            // Limpiar BD (borrar datos actuales)
            console.log('🗑️  Limpiando base de datos...');

            const tablasConDatos = [
                'deudas_pagos',
                'deudas_proveedores',
                'deudas_prestamos',
                'deudas_cheques',
                'deudas_tarjetas',
                'gastos',
                'proveedores',
                'presupuesto_items',
                'presupuestos',
                'productos',
                'movimientos_stock',
                'stock',
                'movimientos_caja',
                'pedidos',
                'catalogo_productos',
                'clients'
            ];

            for (const tabla of tablasConDatos) {
                try {
                    await db.run(`DELETE FROM ${tabla}`);
                } catch (e) {
                    console.log(`  ⚠️  No se pudo limpiar ${tabla}`);
                }
            }

            console.log('✅ BD limpiada\n');

            // Importar datos
            const importData = require('../scripts/import-data');
            await importData(db);

            // Contar registros importados
            const stats = {
                clients: (await db.get('SELECT COUNT(*) as count FROM clients'))?.count || 0,
                catalogo: (await db.get('SELECT COUNT(*) as count FROM catalogo_productos'))?.count || 0,
                pedidos: (await db.get('SELECT COUNT(*) as count FROM pedidos'))?.count || 0,
                caja: (await db.get('SELECT COUNT(*) as count FROM movimientos_caja'))?.count || 0,
                gastos: (await db.get('SELECT COUNT(*) as count FROM gastos'))?.count || 0,
            };

            console.log('\n📊 IMPORTACIÓN COMPLETADA:\n');
            console.log(`   ✅ Clientes: ${stats.clients}`);
            console.log(`   ✅ Productos: ${stats.catalogo}`);
            console.log(`   ✅ Pedidos: ${stats.pedidos}`);
            console.log(`   ✅ Movimientos caja: ${stats.caja}`);
            console.log(`   ✅ Gastos: ${stats.gastos}\n`);

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>✅ Importación Exitosa</title>
                    <style>
                        body { font-family: Arial; padding: 20px; }
                        .success { background: #d4edda; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <h1>✅ Importación Exitosa</h1>

                    <div class="success">
                        <h3>Datos importados correctamente:</h3>
                        <ul>
                            <li>👥 Clientes: <strong>${stats.clients}</strong></li>
                            <li>📦 Productos: <strong>${stats.catalogo}</strong></li>
                            <li>📋 Pedidos: <strong>${stats.pedidos}</strong></li>
                            <li>💰 Movimientos caja: <strong>${stats.caja}</strong></li>
                            <li>💸 Gastos: <strong>${stats.gastos}</strong></li>
                        </ul>
                    </div>

                    <p>Los datos están disponibles en tu aplicación.</p>
                    <a href="/">Ir al inicio</a>
                </body>
                </html>
            `);

        } catch (error) {
            console.error('❌ Error en importación:', error.message);
            res.status(500).send(`
                ❌ Error durante la importación:<br>
                ${error.message}<br><br>
                <a href="/admin/import">Volver</a>
            `);
        }
    });

    return router;
};
