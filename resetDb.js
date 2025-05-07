// resetDb.js
const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');



// Ruta a la base de datos
const DB_PATH = path.join(__dirname, 'imprenta.db');

// 1) Abrimos una conexión temporal para manipular tablas
const db = new Database(DB_PATH);

// 2) Desactivamos la verificación de FKs (para poder dropear en orden)
db.pragma('foreign_keys = OFF');

// 3) Borramos todas las tablas existentes
db.exec(`
  DROP TABLE IF EXISTS revision_comments;
  DROP TABLE IF EXISTS productos;
  DROP TABLE IF EXISTS pedidos;
  DROP TABLE IF EXISTS product_types;
  DROP TABLE IF EXISTS clients;
  DROP TABLE IF EXISTS users;
`);

// 4) Cerramos esa conexión
db.close();
console.log('🗑️ Tablas borradas correctamente.');

// 5) Reejecutamos el esquema desde database.js (que creará todo de nuevo)
require('./database');
console.log('✅ Esquema de base de datos recreado.');

// 6) Ahora añadimos la tabla de usuarios y creamos el Super-Admin
const db2 = new Database(DB_PATH);
db2.pragma('foreign_keys = ON');

// Creamos la tabla users si no existe
db2.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    NOT NULL UNIQUE,
    password TEXT    NOT NULL,
    rol      TEXT    NOT NULL
  );
`);

// Datos del Super-Admin (ajusta usuario y contraseña a tu gusto)
const masterUser = 'admin';
const masterPass = 'admin';  // Mínimo 4 caracteres
const masterRol  = 'Admin';
const masterHash = bcrypt.hashSync(masterPass, 10);

// Solo insertamos si no existe aún
const exists = db2.prepare('SELECT 1 FROM users WHERE username = ?').get(masterUser);
if (!exists) {
  db2.prepare(`
    INSERT INTO users (username, password, rol)
    VALUES (?, ?, ?)
  `).run(masterUser, masterHash, masterRol);
  console.log(`🔐 Super-Admin creado: usuario=${masterUser}, contraseña=${masterPass}`);
} else {
  console.log('ℹ️ Super-Admin ya existía, no se creó de nuevo.');
}

db2.close();
