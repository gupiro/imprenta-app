// crearTablaClientes.js

const path = require('path');
const Database = require('better-sqlite3');

// Ruta absoluta para la base de datos
const dbPath = path.join(__dirname, 'imprenta.db');
const db = new Database(dbPath);

// Crear tabla clientes si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    direccion TEXT
  );
`);

console.log('✅ Tabla clientes creada correctamente.');
db.close();
