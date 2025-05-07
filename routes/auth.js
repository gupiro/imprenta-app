// routes/auth.js
const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const db       = require('../database');
const rolePermissions = require('../config/permissions'); // ← Cargamos nuestro mapa de permisos

// ——— DESHABILITAMOS REGISTRO PÚBLICO ———
// // Mostrar formulario de registro
// router.get('/register', (req, res) => {
//   res.render('auth/register', { title: 'Registro de Usuario' });
// });

// // Procesar registro
// router.post('/register', async (req, res) => {
//   /* … lógica de validación y guardado … */
// });

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

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
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

module.exports = router;
