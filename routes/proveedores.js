// routes/proveedores.js - CORREGIDO

const express = require('express');
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {
    const router = express.Router();

    // Listar proveedores
    router.get('/', checkPermission, async (req, res) => {
        try {
            const proveedores = await db.all("SELECT * FROM proveedores ORDER BY nombre ASC") || [];
            res.render('proveedores/index', { 
                title: 'Proveedores', 
                proveedores,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al cargar proveedores: ' + err.message);
            res.render('proveedores/index', { 
                title: 'Proveedores', 
                proveedores: [] 
            });
        }
    });

    // Formulario nuevo proveedor
    router.get('/nuevo', (req, res) => {
        res.render('proveedores/form', { 
            title: 'Nuevo Proveedor', 
            proveedor: null,
            success: req.flash('success'),
            error: req.flash('error')
        });
    });

    // Crear proveedor
    router.post('/nuevo', checkPermission, async (req, res) => {
        const { nombre, telefono, email, rubro, notas } = req.body;
        try {
            if (!nombre) {
                req.flash('error', 'El nombre del proveedor es requerido');
                return res.redirect('/proveedores/nuevo');
            }

            await db.run(
                "INSERT INTO proveedores (nombre, telefono, email, rubro, notas) VALUES (?,?,?,?,?)",
                nombre.trim(), 
                telefono || '', 
                email || '', 
                rubro || '', 
                notas || ''
            );
            req.flash('success', 'Proveedor agregado correctamente');
            res.redirect('/proveedores');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al guardar proveedor: ' + err.message);
            res.redirect('/proveedores/nuevo');
        }
    });

    // Formulario editar proveedor
    router.get('/:id/editar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const proveedor = await db.get("SELECT * FROM proveedores WHERE id = ?", id);
            if (!proveedor) { 
                req.flash('error', 'Proveedor no encontrado');
                return res.redirect('/proveedores');
            }
            res.render('proveedores/form', { 
                title: 'Editar Proveedor', 
                proveedor,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al cargar proveedor: ' + err.message);
            res.redirect('/proveedores');
        }
    });

    // Actualizar proveedor
    router.post('/:id/editar', checkPermission, async (req, res) => {
        const { nombre, telefono, email, rubro, notas } = req.body;
        const id = parseInt(req.params.id);
        try {
            if (!nombre) {
                req.flash('error', 'El nombre del proveedor es requerido');
                return res.redirect(`/proveedores/${id}/editar`);
            }

            await db.run(
                "UPDATE proveedores SET nombre=?, telefono=?, email=?, rubro=?, notas=? WHERE id=?",
                nombre.trim(), 
                telefono || '', 
                email || '', 
                rubro || '', 
                notas || '', 
                id
            );
            req.flash('success', 'Proveedor actualizado correctamente');
            res.redirect('/proveedores');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al actualizar: ' + err.message);
            res.redirect(`/proveedores/${id}/editar`);
        }
    });

    // Eliminar proveedor
    router.post('/:id/eliminar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.run("DELETE FROM proveedores WHERE id = ?", id);
            req.flash('success', 'Proveedor eliminado correctamente');
        } catch (err) {
            req.flash('error', 'Error al eliminar: ' + err.message);
        }
        res.redirect('/proveedores');
    });

    return router;
};
