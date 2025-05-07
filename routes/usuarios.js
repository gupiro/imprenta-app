// routes/usuarios.js
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const db      = require('../database');

// 3.1.1 Listar todos los usuarios
router.get('/', async (req, res) => {
  const usuarios = db.prepare('SELECT id, username, rol FROM users ORDER BY username').all();
  res.render('usuarios/index', { title: 'Gestión de Usuarios', usuarios });
});

// 3.1.2 Formulario creación de usuario
router.get('/nuevo', (req, res) => {
  res.render('usuarios/nuevo', { title: 'Nuevo Usuario' });
});

// 3.1.3 Procesar creación
router.post('/nuevo', async (req, res) => {
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
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
    req.flash('error', 'Ya existe un usuario con ese nombre.');
    return res.redirect('/usuarios/nuevo');
  }
  // Hashear y guardar
  const hash = await bcrypt.hash(password, 10);
  db.prepare(`
    INSERT INTO users (username, password, rol)
    VALUES (?, ?, ?)
  `).run(username.trim(), hash, rol);
  req.flash('success', 'Usuario creado correctamente.');
  res.redirect('/usuarios');
});

module.exports = router;
