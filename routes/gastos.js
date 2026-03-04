// routes/gastos.js - CORREGIDO

const express = require('express');
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {
    const router = express.Router();

    const CATEGORIAS = ['Servicios', 'Sueldos', 'Insumos', 'Insumos papel', 'Insumos tinta/toner', 'Proveedores', 'Alquiler', 'Mantenimiento', 'Impuestos', 'Otros'];

    // Listar gastos del mes
    router.get('/', checkPermission, async (req, res) => {
        try {
            const mes = req.query.mes || new Date().toISOString().slice(0, 7);
            const tipo = req.query.tipo || 'todos'; // 'todos', 'negocio', 'personal'

            let query = `
                SELECT g.*, p.nombre AS proveedor_nombre
                FROM gastos g
                LEFT JOIN proveedores p ON g.proveedor_id = p.id
                WHERE strftime('%Y-%m', g.fecha) = ?
            `;
            const params = [mes];

            // Agregar filtro de tipo si no es 'todos'
            if (tipo === 'negocio') {
                query += ` AND g.tipo = 'negocio'`;
            } else if (tipo === 'personal') {
                query += ` AND g.tipo = 'personal'`;
            }

            query += ` ORDER BY g.fecha DESC`;

            const gastos = await db.all(query, ...params) || [];

            const proveedores = await db.all("SELECT id, nombre FROM proveedores ORDER BY nombre ASC") || [];
            const totalMes = gastos.reduce((s, g) => s + (g.monto || 0), 0);
            const totalNegocio = gastos.filter(g => g.tipo === 'negocio').reduce((s, g) => s + (g.monto || 0), 0);
            const totalPersonal = gastos.filter(g => g.tipo === 'personal').reduce((s, g) => s + (g.monto || 0), 0);

            res.render('gastos/index', {
                title: 'Gastos',
                gastos,
                proveedores,
                CATEGORIAS,
                mes,
                tipo,
                totalMes,
                totalNegocio,
                totalPersonal,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al cargar gastos: ' + err.message);
            res.render('gastos/index', {
                title: 'Gastos',
                gastos: [],
                proveedores: [],
                CATEGORIAS,
                mes: '',
                tipo: 'todos',
                totalMes: 0,
                totalNegocio: 0,
                totalPersonal: 0
            });
        }
    });

    // Crear nuevo gasto
    router.post('/nuevo', checkPermission, async (req, res) => {
        const { fecha, categoria, descripcion, monto, estado_pago, proveedor_id, tipo } = req.body;
        try {
            if (!fecha || !categoria || !descripcion || !monto) {
                req.flash('error', 'Todos los campos son requeridos');
                return res.redirect('/gastos');
            }

            const montoNum = parseFloat(monto);
            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'Monto inválido');
                return res.redirect('/gastos');
            }

            await db.run(
                "INSERT INTO gastos (fecha, categoria, descripcion, monto, estado_pago, proveedor_id, tipo, usuario_id) VALUES (?,?,?,?,?,?,?,?)",
                fecha,
                categoria,
                descripcion.trim(),
                montoNum,
                estado_pago || 'pendiente',
                proveedor_id || null,
                tipo || 'negocio',
                req.session.user?.id || null
            );
            req.flash('success', `✅ Gasto de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al registrar gasto: ' + err.message);
        }
        res.redirect('/gastos');
    });

    // Editar gasto
    router.post('/:id/editar', checkPermission, async (req, res) => {
        const { fecha, categoria, descripcion, monto, estado_pago, proveedor_id, tipo } = req.body;
        try {
            const id = parseInt(req.params.id);

            if (!fecha || !categoria || !descripcion || !monto) {
                req.flash('error', 'Todos los campos son requeridos');
                return res.redirect('/gastos');
            }

            const montoNum = parseFloat(monto);
            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'Monto inválido');
                return res.redirect('/gastos');
            }

            await db.run(
                "UPDATE gastos SET fecha = ?, categoria = ?, descripcion = ?, monto = ?, estado_pago = ?, proveedor_id = ?, tipo = ? WHERE id = ?",
                fecha,
                categoria,
                descripcion.trim(),
                montoNum,
                estado_pago || 'pendiente',
                proveedor_id || null,
                tipo || 'negocio',
                id
            );
            req.flash('success', `✅ Gasto actualizado correctamente`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al actualizar gasto: ' + err.message);
        }
        res.redirect('/gastos');
    });

    // Marcar gasto como pagado
    router.post('/:id/pagar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.run("UPDATE gastos SET estado_pago = 'pagado' WHERE id = ?", id);
            req.flash('success', 'Gasto marcado como pagado');
        } catch (err) {
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/gastos');
    });

    // Eliminar gasto
    router.post('/:id/eliminar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.run("DELETE FROM gastos WHERE id = ?", id);
            req.flash('success', 'Gasto eliminado');
        } catch (err) {
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/gastos');
    });

    return router;
};
