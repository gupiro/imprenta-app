// routes/gastos.js - REDISEÑADO CON CATEGORÍAS DINÁMICAS Y CAMPOS MEJORADOS

const express = require('express');
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {
    const router = express.Router();

    const CATEGORIAS_NEGOCIO = [
        'Materia Prima e Insumos',
        'Sueldos y Personal',
        'Alquiler Local',
        'Servicios (luz/gas/internet negocio)',
        'Mantenimiento de Máquinas',
        'Impuestos y Tasas',
        'Transporte y Fletes',
        'Publicidad',
        'Otros gastos del negocio'
    ];

    const CATEGORIAS_PERSONAL = [
        'Alimentación',
        'Salud',
        'Educación',
        'Hogar (luz/gas/alquiler casa)',
        'Ropa',
        'Transporte personal',
        'Entretenimiento',
        'Otros gastos personales'
    ];

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
            const totalPendiente = gastos.filter(g => g.estado_pago === 'pendiente').reduce((s, g) => s + (g.monto || 0), 0);
            const totalPendienteNegocio = gastos.filter(g => g.tipo === 'negocio' && g.estado_pago === 'pendiente').reduce((s, g) => s + (g.monto || 0), 0);

            res.render('gastos/index', {
                title: 'Gastos',
                gastos,
                proveedores,
                CATEGORIAS_NEGOCIO,
                CATEGORIAS_PERSONAL,
                mes,
                tipo,
                totalMes,
                totalNegocio,
                totalPersonal,
                totalPendiente,
                totalPendienteNegocio,
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
                CATEGORIAS_NEGOCIO,
                CATEGORIAS_PERSONAL,
                mes: '',
                tipo: 'todos',
                totalMes: 0,
                totalNegocio: 0,
                totalPersonal: 0,
                totalPendiente: 0,
                totalPendienteNegocio: 0
            });
        }
    });

    // Crear nuevo gasto
    router.post('/nuevo', checkPermission, async (req, res) => {
        const { fecha, categoria, descripcion, monto, estado_pago, proveedor_id, tipo, metodo_pago, tiene_factura } = req.body;
        try {
            // Validaciones detalladas y educativas
            if (!fecha) {
                req.flash('error', 'Debes indicar la fecha del gasto.');
                return res.redirect('/gastos');
            }
            if (!tipo) {
                req.flash('error', 'Seleccioná si es un gasto de Negocio o Personal.');
                return res.redirect('/gastos');
            }
            if (!categoria) {
                req.flash('error', 'Seleccioná una categoría para clasificar el gasto correctamente.');
                return res.redirect('/gastos');
            }
            if (!descripcion || descripcion.trim().length === 0) {
                req.flash('error', 'Describí el gasto con detalle. Ejemplo: "Resma papel A4 para trabajos" o "Sueldo completo de Ariel".');
                return res.redirect('/gastos');
            }
            if (!monto) {
                req.flash('error', 'Ingresá el monto que gastaste.');
                return res.redirect('/gastos');
            }

            const montoNum = parseFloat(monto);
            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'El monto debe ser un número mayor a cero. Ejemplo: 1500 o 350.50');
                return res.redirect('/gastos');
            }

            await db.run(
                "INSERT INTO gastos (fecha, categoria, descripcion, monto, estado_pago, proveedor_id, tipo, usuario_id, metodo_pago, tiene_factura) VALUES (?,?,?,?,?,?,?,?,?,?)",
                fecha,
                categoria,
                descripcion.trim(),
                montoNum,
                estado_pago || 'pendiente',
                proveedor_id || null,
                tipo || 'negocio',
                req.session.user?.id || null,
                metodo_pago || 'efectivo',
                tiene_factura === '1' ? 1 : 0
            );
            const tipoLabel = tipo === 'negocio' ? 'de Negocio' : 'Personal';
            req.flash('success', `✅ Gasto ${tipoLabel} de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado exitosamente`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al registrar gasto: ' + err.message);
        }
        res.redirect('/gastos');
    });

    // Editar gasto
    router.post('/:id/editar', checkPermission, async (req, res) => {
        const { fecha, categoria, descripcion, monto, estado_pago, proveedor_id, tipo, metodo_pago, tiene_factura } = req.body;
        try {
            const id = parseInt(req.params.id);

            // Mismas validaciones que al crear
            if (!fecha) {
                req.flash('error', 'Debes indicar la fecha del gasto.');
                return res.redirect('/gastos');
            }
            if (!tipo) {
                req.flash('error', 'Seleccioná si es un gasto de Negocio o Personal.');
                return res.redirect('/gastos');
            }
            if (!categoria) {
                req.flash('error', 'Seleccioná una categoría para clasificar el gasto correctamente.');
                return res.redirect('/gastos');
            }
            if (!descripcion || descripcion.trim().length === 0) {
                req.flash('error', 'Describí el gasto con detalle.');
                return res.redirect('/gastos');
            }
            if (!monto) {
                req.flash('error', 'Ingresá el monto que gastaste.');
                return res.redirect('/gastos');
            }

            const montoNum = parseFloat(monto);
            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'El monto debe ser un número mayor a cero.');
                return res.redirect('/gastos');
            }

            await db.run(
                "UPDATE gastos SET fecha = ?, categoria = ?, descripcion = ?, monto = ?, estado_pago = ?, proveedor_id = ?, tipo = ?, metodo_pago = ?, tiene_factura = ? WHERE id = ?",
                fecha,
                categoria,
                descripcion.trim(),
                montoNum,
                estado_pago || 'pendiente',
                proveedor_id || null,
                tipo || 'negocio',
                metodo_pago || 'efectivo',
                tiene_factura === '1' ? 1 : 0,
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
            req.flash('success', '✅ Gasto marcado como pagado');
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
            req.flash('success', '✅ Gasto eliminado correctamente');
        } catch (err) {
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/gastos');
    });

    return router;
};
