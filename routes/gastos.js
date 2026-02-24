// routes/gastos.js - CORREGIDO

const express = require('express');
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {
    const router = express.Router();

    const CATEGORIAS = ['Servicios', 'Sueldos', 'Insumos', 'Proveedores', 'Alquiler', 'Mantenimiento', 'Impuestos', 'Otros'];

    // Listar gastos del mes
    router.get('/', checkPermission, async (req, res) => {
        try {
            const mes = req.query.mes || new Date().toISOString().slice(0, 7);
            const gastos = await db.all(`
                SELECT g.*, p.nombre AS proveedor_nombre
                FROM gastos g
                LEFT JOIN proveedores p ON g.proveedor_id = p.id
                WHERE strftime('%Y-%m', g.fecha) = ?
                ORDER BY g.fecha DESC
            `, mes) || [];
            
            const proveedores = await db.all("SELECT id, nombre FROM proveedores ORDER BY nombre ASC") || [];
            const totalMes = gastos.reduce((s, g) => s + (g.monto || 0), 0);

            res.render('gastos/index', { 
                title: 'Gastos', 
                gastos, 
                proveedores, 
                CATEGORIAS, 
                mes, 
                totalMes,
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
                totalMes: 0 
            });
        }
    });

    // Crear nuevo gasto
    router.post('/nuevo', checkPermission, async (req, res) => {
        const { fecha, categoria, descripcion, monto, estado_pago, proveedor_id } = req.body;
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
                "INSERT INTO gastos (fecha, categoria, descripcion, monto, estado_pago, proveedor_id) VALUES (?,?,?,?,?,?)",
                fecha, 
                categoria, 
                descripcion.trim(), 
                montoNum, 
                estado_pago || 'pendiente', 
                proveedor_id || null
            );
            req.flash('success', `✅ Gasto de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al registrar gasto: ' + err.message);
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
