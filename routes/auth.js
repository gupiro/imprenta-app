// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// --- Importamos la instancia de la base de datos desde config/db.js ---
// Ya no importamos 'database.js'
// Como config/db.js ahora exporta una promesa, necesitamos la instancia 'db' dentro del POST
// Podemos obtenerla de res.app.locals.db si la pasamos allí, o ajustar.
// Para simplificar, ajustaremos directamente para usar la DB que se pasa en server.js.
// Por ahora, lo ajustaremos para que espere una función que reciba db.

// Este router ahora exporta una función que recibe la instancia de la DB
module.exports = (db) => {
    const rolePermissions = require('../config/permissions'); // ← Cargamos nuestro mapa de permisos

    // Mostrar formulario de login
    router.get('/login', (req, res) => {
        res.render('auth/login', { title: 'Iniciar Sesión' });
    });

    // Procesar login
    router.post('/login', async (req, res) => {
        const username = req.body.username?.trim();
        const password = req.body.password;
        if (!username || !password) {
            req.flash('error', 'Todos los campos son obligatorios.');
            return res.redirect('/auth/login');
        }

        const user = await db.get('SELECT * FROM users WHERE username = ?', username); // Usamos db.get de sqlite
        if (!user || !(await bcrypt.compare(password, user.password))) {
            req.flash('error', 'Usuario o contraseña inválidos.');
            return res.redirect('/auth/login');
        }

        // Cargamos los permisos según el rol
        const permisos = rolePermissions[user.rol] || [];

        // Guardar en sesión
        req.session.user = {
            username: user.username,
            rol:      user.rol,
            permisos  // ← lista de permisos asignada
        };

        req.flash('success', `¡Bienvenido, ${user.username}!`);
        res.redirect('/');
    });

    // Logout
    router.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/auth/login');
    });

    return router; // Retornamos el router configurado
};
