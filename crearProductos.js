// crearProductos.js

const path = require('path');
const Database = require('better-sqlite3');

// Ruta absoluta de la base de datos
const dbPath = path.join(__dirname, 'imprenta.db');
const db = new Database(dbPath);

// Crear tabla productos
db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER,
    material TEXT,
    ancho REAL,
    alto REAL,
    descuento REAL,
    precio REAL,
    descripcion TEXT,
    imagen TEXT,
    FOREIGN KEY(pedido_id) REFERENCES pedidos(id)
  );
`);

console.log('✅ Tabla productos creada correctamente.');
db.close();
