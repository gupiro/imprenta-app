// routes/productos.js
const express         = require('express');
const router          = express.Router();
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {

    // Listar productos (ítems de pedidos)
    router.get('/', checkPermission, async (req, res) => {
        try {
            const productos = await db.all('SELECT * FROM productos ORDER BY id ASC');
            res.render('productos/lista', {
                title:   'Productos',
                productos,
                success: req.flash('success'),
                error:   req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error: ' + err.message);
            res.redirect('/');
        }
    });

    // Formulario Nuevo Producto
    router.get('/nuevo', checkPermission, (req, res) => {
        res.render('productos/nuevo', {
            title:    'Nuevo Producto',
            producto: {},
            success:  req.flash('success'),
            error:    req.flash('error')
        });
    });

    // Formulario Editar Producto
    router.get('/editar/:id', checkPermission, async (req, res) => {
        try {
            const producto = await db.get('SELECT * FROM productos WHERE id = ?', req.params.id);
            if (!producto) {
                req.flash('error', 'Producto no encontrado.');
                return res.redirect('/productos');
            }
            res.render('productos/nuevo', {
                title:    'Editar Producto',
                producto,
                success:  req.flash('success'),
                error:    req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error: ' + err.message);
            res.redirect('/productos');
        }
    });

    // Crear Producto
    router.post('/nuevo', checkPermission, async (req, res) => {
        const { material, cantidad, precio_unitario, ancho, alto, pedido_id } = req.body;
        if (!material || !material.trim()) {
            req.flash('error', 'El nombre del material es obligatorio.');
            return res.redirect('/productos/nuevo');
        }
        try {
            await db.run(
                'INSERT INTO productos (pedido_id, material, cantidad, precio_unitario, ancho, alto) VALUES (?, ?, ?, ?, ?, ?)',
                pedido_id || null,
                material.trim(),
                parseInt(cantidad) || 1,
                parseFloat(precio_unitario) || 0,
                parseFloat(ancho) || 0,
                parseFloat(alto) || 0
            );
            req.flash('success', 'Producto creado exitosamente.');
            res.redirect('/productos');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error: ' + err.message);
            res.redirect('/productos/nuevo');
        }
    });

    // Editar Producto
    router.post('/editar/:id', checkPermission, async (req, res) => {
        const { material, cantidad, precio_unitario, ancho, alto, pedido_id } = req.body;
        if (!material || !material.trim()) {
            req.flash('error', 'El nombre del material es obligatorio.');
            return res.redirect(`/productos/editar/${req.params.id}`);
        }
        try {
            await db.run(
                'UPDATE productos SET pedido_id = ?, material = ?, cantidad = ?, precio_unitario = ?, ancho = ?, alto = ? WHERE id = ?',
                pedido_id || null,
                material.trim(),
                parseInt(cantidad) || 1,
                parseFloat(precio_unitario) || 0,
                parseFloat(ancho) || 0,
                parseFloat(alto) || 0,
                req.params.id
            );
            req.flash('success', 'Producto actualizado.');
            res.redirect('/productos');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error: ' + err.message);
            res.redirect('/productos');
        }
    });

    // Eliminar Producto
    router.post('/eliminar/:id', checkPermission, async (req, res) => {
        try {
            await db.run('DELETE FROM productos WHERE id = ?', req.params.id);
            req.flash('success', 'Producto eliminado correctamente.');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/productos');
    });

    return router;
};
