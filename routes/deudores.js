const express = require('express');
const router = express.Router();
const { obtenerFechaLocal, turnoByHora } = require('../utils/dateHelper');

module.exports = (db) => {
    // ════════════════════════════════════════════════════════════════
    // GET /deudores - Tabla de deudores consolidada
    // ════════════════════════════════════════════════════════════════
    router.get('/', async (req, res) => {
        try {
            const deudores = await db.all(`
                SELECT
                    c.id, c.name, c.phone,
                    SUM(p.monto_restante) AS deuda_total,
                    COUNT(p.id) AS pedidos_pendientes,
                    MAX(p.fecha) AS ultimo_pedido,
                    json_group_array(json_object(
                        'id', p.id,
                        'precio', p.precio,
                        'monto_restante', p.monto_restante,
                        'fecha', p.fecha,
                        'detalle', p.detalle,
                        'estado', p.estado
                    )) AS pedidos_json
                FROM clients c
                JOIN pedidos p ON c.id = p.client_id
                WHERE p.monto_restante > 0 AND p.estado NOT IN ('CANCELADO')
                GROUP BY c.id
                ORDER BY deuda_total DESC
            `);

            // Parsear pedidos_json
            const deudoresFormateados = deudores.map(d => ({
                ...d,
                pedidos: JSON.parse(d.pedidos_json || '[]')
            }));

            // Calcular totales
            const totalDeuda = deudoresFormateados.reduce((sum, d) => sum + d.deuda_total, 0);
            const totalClientes = deudoresFormateados.length;
            const promedio = totalClientes > 0 ? totalDeuda / totalClientes : 0;

            res.render('deudores/index', {
                title: 'Deudores',
                deudores: deudoresFormateados,
                totalDeuda,
                totalClientes,
                promedio,
                user: req.session.user
            });
        } catch (err) {
            console.error('Error en GET /deudores:', err);
            res.status(500).render('error', { error: 'Error al cargar deudores', details: err.message });
        }
    });

    // ════════════════════════════════════════════════════════════════
    // POST /deudores/pagar - Registrar pago de cliente
    // ════════════════════════════════════════════════════════════════
    router.post('/pagar', async (req, res) => {
        try {
            const { cliente_id, monto_total, metodo_pago, nota, pedidos_ids } = req.body;
            const { fecha } = obtenerFechaLocal();

            // Validaciones
            if (!cliente_id || !monto_total || monto_total <= 0) {
                return res.json({ ok: false, error: 'Datos inválidos' });
            }

            const montoTotal = parseFloat(monto_total);

            // Obtener todos los pedidos del cliente ordenados por fecha (más antiguos primero)
            let query = `
                SELECT id, precio, monto_restante, monto_entregado, detalle
                FROM pedidos
                WHERE client_id = ? AND monto_restante > 0 AND estado NOT IN ('CANCELADO')
                ORDER BY fecha ASC
            `;
            const params = [cliente_id];

            // Si vienen pedidos específicos, filtrar
            if (pedidos_ids && pedidos_ids.length > 0) {
                const placeholders = pedidos_ids.map(() => '?').join(',');
                query = `
                    SELECT id, precio, monto_restante, monto_entregado, detalle
                    FROM pedidos
                    WHERE client_id = ? AND id IN (${placeholders}) AND monto_restante > 0
                    ORDER BY fecha ASC
                `;
                params.push(...pedidos_ids);
            }

            const pedidos = await db.all(query, params);

            if (pedidos.length === 0) {
                return res.json({ ok: false, error: 'No hay pedidos para pagar' });
            }

            // Distribuir el pago
            let montoRestante = montoTotal;
            const pedidosAfectados = [];
            const actualizaciones = [];

            for (const pedido of pedidos) {
                if (montoRestante <= 0) break;

                const pagosAhora = Math.min(montoRestante, pedido.monto_restante);
                const nuevoEntregado = pedido.monto_entregado + pagosAhora;
                const nuevoSaldo = pedido.precio - nuevoEntregado;
                const nuevoEstadoPago = nuevoSaldo <= 0.01 ? 'PAGADO' : 'PARCIAL';

                actualizaciones.push({
                    id: pedido.id,
                    monto_entregado: nuevoEntregado,
                    monto_restante: Math.max(0, nuevoSaldo),
                    estado_pago: nuevoEstadoPago,
                    fecha_pago: fecha,
                    metodo_pago: metodo_pago || 'Efectivo'
                });

                pedidosAfectados.push(pedido.id);
                montoRestante -= pagosAhora;
            }

            // Actualizar pedidos en transacción
            await db.run('BEGIN TRANSACTION');

            try {
                for (const upd of actualizaciones) {
                    await db.run(
                        `UPDATE pedidos SET
                            monto_entregado = ?,
                            monto_restante = ?,
                            fecha_pago = ?,
                            medio_pago = ?,
                            estado_pago = ?
                        WHERE id = ?`,
                        [upd.monto_entregado, upd.monto_restante, upd.fecha_pago, upd.metodo_pago, upd.estado_pago, upd.id]
                    );
                }

                // Registrar en movimientos_caja (un solo movimiento)
                await db.run(
                    `INSERT INTO movimientos_caja (tipo, concepto, categoria, monto, metodo_pago, turno, fecha, usuario_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        'ingreso',
                        `Pago Cliente ${cliente_id}`,
                        'Ventas - Pago de Pedido',
                        montoTotal,
                        metodo_pago || 'Efectivo',
                        turnoByHora(),
                        fecha,
                        req.session.user?.id || null
                    ]
                );

                // Registrar en pagos_clientes (historial)
                await db.run(
                    `INSERT INTO pagos_clientes (cliente_id, monto, metodo_pago, nota, usuario_id, pedidos_afectados, fecha)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        cliente_id,
                        montoTotal,
                        metodo_pago || 'Efectivo',
                        nota || null,
                        req.session.user?.id || null,
                        JSON.stringify(pedidosAfectados),
                        fecha
                    ]
                );

                await db.run('COMMIT');

                res.json({
                    ok: true,
                    message: `Pago de $${montoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })} registrado`,
                    pedidosAfectados
                });
            } catch (err) {
                await db.run('ROLLBACK');
                throw err;
            }
        } catch (err) {
            console.error('Error en POST /deudores/pagar:', err);
            res.json({ ok: false, error: err.message });
        }
    });

    return router;
};
