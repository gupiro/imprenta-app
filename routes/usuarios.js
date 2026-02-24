// routes/usuarios.js
const express = require('express');
const router  = express.Router();
const bcrypt = require('bcryptjs');

// Este router ahora exporta una función que recibe la instancia de la DB
module.exports = (db) => { // Recibe 'db' como argumento

    // 3.1.1 Listar todos los usuarios
    router.get('/', async (req, res) => { // Hacemos la función async
        const usuarios = await db.all('SELECT id, username, rol FROM users ORDER BY username'); // Usa await db.all
        res.render('usuarios/index', { title: 'Gestión de Usuarios', usuarios });
    });

    // 3.1.2 Formulario creación de usuario
    router.get('/nuevo', (req, res) => {
        res.render('usuarios/nuevo', { title: 'Nuevo Usuario' });
    });

    // 3.1.3 Procesar creación
    router.post('/nuevo', async (req, res) => { // Hacemos la función async
        const { username, password, rol } = req.body;
        const errors = [];
        if (!username || !password || !rol) {
            errors.push('Todos los campos son obligatorios.');
        }
        if (password.length < 4) {
            errors.push('La contraseña debe tener al menos 4 caracteres.');
        }
        if (errors.length) {
            req.flash('error', errors);
            return res.redirect('/usuarios/nuevo');
        }
        // Verificar existencia
        const existingUser = await db.get('SELECT 1 FROM users WHERE username = ?', username); // Usa await db.get
        if (existingUser) {
            req.flash('error', 'Ya existe un usuario con ese nombre.');
            return res.redirect('/usuarios/nuevo');
        }
        // Hashear y guardar (rol en minúsculas para coincidir con permissions)
        const hash = await bcrypt.hash(password, 10);
        const rolNormalizado = (rol || '').toLowerCase().trim();
        const rolesValidos = ['admin', 'vendedor', 'operador', 'empleado'];
        const rolFinal = rolesValidos.includes(rolNormalizado) ? rolNormalizado : 'operador';

        await db.run(
            'INSERT INTO users (username, password, rol) VALUES (?, ?, ?)',
            username.trim(), hash, rolFinal
        );
        req.flash('success', 'Usuario creado correctamente.');
        res.redirect('/usuarios');
    });

    // 3.1.4 Cambiar rol de usuario
    router.post('/cambiar-rol/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { rol } = req.body;

            const rolesValidos = ['admin', 'vendedor', 'operador', 'empleado'];
            if (!rolesValidos.includes(rol)) {
                req.flash('error', 'Rol inválido.');
                return res.redirect('/usuarios');
            }

            // Verificar que el usuario existe
            const usuario = await db.get('SELECT id, username FROM users WHERE id = ?', id);
            if (!usuario) {
                req.flash('error', 'Usuario no encontrado.');
                return res.redirect('/usuarios');
            }

            // Actualizar rol
            await db.run('UPDATE users SET rol = ? WHERE id = ?', rol, id);
            req.flash('success', `Rol de ${usuario.username} cambiado a ${rol}`);
            res.redirect('/usuarios');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error: ' + err.message);
            res.redirect('/usuarios');
        }
    });

    // 3.1.5 Eliminar usuario
    router.post('/eliminar/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar que el usuario existe
            const usuario = await db.get('SELECT id, username FROM users WHERE id = ?', id);
            if (!usuario) {
                req.flash('error', 'Usuario no encontrado.');
                return res.redirect('/usuarios');
            }

            // No permitir eliminar al usuario actual
            if (req.session.user?.id == id) {
                req.flash('error', 'No puedes eliminar tu propio usuario.');
                return res.redirect('/usuarios');
            }

            // Eliminar usuario
            await db.run('DELETE FROM users WHERE id = ?', id);
            req.flash('success', `Usuario ${usuario.username} eliminado correctamente.`);
            res.redirect('/usuarios');
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error: ' + err.message);
            res.redirect('/usuarios');
        }
    });

    return router; // Retornamos el router configurado
};
