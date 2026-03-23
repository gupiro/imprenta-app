// scripts/import-data.js - Importar datos de backup a la BD

const fs = require('fs');
const path = require('path');

module.exports = async (db) => {
    try {
        // Verificar si BD tiene datos
        const clientsCount = (await db.get('SELECT COUNT(*) as count FROM clients'))?.count || 0;

        if (clientsCount > 0) {
            console.log('✅ BD ya tiene datos. Saltando importación.');
            return;
        }

        console.log('\n📥 Importando datos de backup...\n');

        // Leer archivo de datos
        const dataPath = path.join(__dirname, '../data-export.json');

        if (!fs.existsSync(dataPath)) {
            console.log('⚠️  No hay archivo data-export.json. Continuando con BD vacía.');
            return;
        }

        const datos = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        // Importar clientes
        if (datos.clients?.length > 0) {
            for (const c of datos.clients) {
                await db.run(
                    'INSERT INTO clients (id, name, address, phone, email, cuit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [c.id, c.name, c.address, c.phone, c.email, c.cuit, c.created_at]
                );
            }
            console.log(`✅ Clientes: ${datos.clients.length}`);
        }

        // Importar catálogo
        if (datos.catalogo_productos?.length > 0) {
            for (const p of datos.catalogo_productos) {
                await db.run(
                    'INSERT INTO catalogo_productos (id, codigo, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [p.id, p.codigo, p.nombre, p.tipo, p.precio_base, p.precio_costo, p.minimo, p.detalle, p.publico, p.stock, p.unidad, p.activo, p.created_at]
                );
            }
            console.log(`✅ Productos catálogo: ${datos.catalogo_productos.length}`);
        }

        // Importar usuarios (excepto admin que ya existe)
        if (datos.users?.length > 0) {
            for (const u of datos.users) {
                const exists = await db.get('SELECT id FROM users WHERE username = ?', [u.username]);
                if (!exists) {
                    await db.run(
                        'INSERT INTO users (username, password, rol) VALUES (?, ?, ?)',
                        [u.username, u.password, u.rol]
                    );
                }
            }
            console.log(`✅ Usuarios: ${datos.users.length}`);
        }

        // Importar pedidos
        if (datos.pedidos?.length > 0) {
            for (const p of datos.pedidos) {
                await db.run(
                    'INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, usuario_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [p.id, p.client_id, p.presupuesto_id, p.precio, p.fecha, p.estado, p.estado_pago, p.monto_entregado, p.monto_restante, p.medio_pago, p.fecha_pago, p.fecha_entrega, p.usuario_id, p.created_at]
                );
            }
            console.log(`✅ Pedidos: ${datos.pedidos.length}`);
        }

        // Importar productos (items de pedidos)
        if (datos.productos?.length > 0) {
            for (const p of datos.productos) {
                await db.run(
                    'INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [p.id, p.pedido_id, p.material, p.ancho, p.alto, p.descuento, p.precio, p.descripcion, p.imagenes, p.cantidad, p.precio_unitario, p.created_at]
                );
            }
            console.log(`✅ Productos pedidos: ${datos.productos.length}`);
        }

        // Importar movimientos caja
        if (datos.movimientos_caja?.length > 0) {
            for (const m of datos.movimientos_caja) {
                await db.run(
                    'INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [m.id, m.tipo, m.concepto, m.categoria, m.monto, m.metodo_pago, m.pedido_id, m.usuario_id, m.fecha, m.notas, m.created_at]
                );
            }
            console.log(`✅ Movimientos caja: ${datos.movimientos_caja.length}`);
        }

        // Importar presupuestos
        if (datos.presupuestos?.length > 0) {
            for (const p of datos.presupuestos) {
                await db.run(
                    'INSERT INTO presupuestos (id, cliente_id, nombre_cliente, email_cliente, telefono_cliente, detalle, precio_estimado, archivo_imagen, producto_id, usado, descuento, estado, fecha_creacion, vencimiento, precio_extra, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [p.id, p.cliente_id, p.nombre_cliente, p.email_cliente, p.telefono_cliente, p.detalle, p.precio_estimado, p.archivo_imagen, p.producto_id, p.usado, p.descuento, p.estado, p.fecha_creacion, p.vencimiento, p.precio_extra, p.usuario_id]
                );
            }
            console.log(`✅ Presupuestos: ${datos.presupuestos.length}`);
        }

        // Importar gastos
        if (datos.gastos?.length > 0) {
            for (const g of datos.gastos) {
                await db.run(
                    'INSERT INTO gastos (id, fecha, categoria, descripcion, monto, estado_pago, usuario_id, proveedor_id, tipo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [g.id, g.fecha, g.categoria, g.descripcion, g.monto, g.estado_pago, g.usuario_id, g.proveedor_id, g.tipo, g.created_at]
                );
            }
            console.log(`✅ Gastos: ${datos.gastos.length}`);
        }

        // Importar proveedores
        if (datos.proveedores?.length > 0) {
            for (const p of datos.proveedores) {
                await db.run(
                    'INSERT INTO proveedores (id, nombre, telefono, email, rubro, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [p.id, p.nombre, p.telefono, p.email, p.rubro, p.created_at]
                );
            }
            console.log(`✅ Proveedores: ${datos.proveedores.length}`);
        }

        // Importar deudas tarjetas
        if (datos.deudas_tarjetas?.length > 0) {
            for (const d of datos.deudas_tarjetas) {
                await db.run(
                    'INSERT INTO deudas_tarjetas (id, nombre_tarjeta, limite_credito, saldo_adeudado, fecha_cierre, fecha_vencimiento, monto_minimo, estado, notas, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [d.id, d.nombre_tarjeta, d.limite_credito, d.saldo_adeudado, d.fecha_cierre, d.fecha_vencimiento, d.monto_minimo, d.estado, d.notas, d.created_at]
                );
            }
            console.log(`✅ Deudas tarjetas: ${datos.deudas_tarjetas.length}`);
        }

        // Importar deudas pagos
        if (datos.deudas_pagos?.length > 0) {
            for (const p of datos.deudas_pagos) {
                await db.run(
                    'INSERT INTO deudas_pagos (id, tipo_deuda, deuda_id, monto, fecha, metodo_pago, notas, usuario_id, caja_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [p.id, p.tipo_deuda, p.deuda_id, p.monto, p.fecha, p.metodo_pago, p.notas, p.usuario_id, p.caja_id, p.created_at]
                );
            }
            console.log(`✅ Deudas pagos: ${datos.deudas_pagos.length}`);
        }

        console.log('\n✅ Importación completada exitosamente!\n');

    } catch (error) {
        console.error('❌ Error al importar datos:', error.message);
        // No lanzar error para que el servidor siga iniciando
    }
};
