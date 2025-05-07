const path = require('path');
const Database = require('better-sqlite3');

// Conexión a la base
const dbPath = path.join(__dirname, 'imprenta.db');
const db = new Database(dbPath);

// Crear tabla productos si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER,
    material TEXT NOT NULL,
    ancho REAL,
    alto REAL,
    descuento REAL,
    precio REAL,
    descripcion TEXT,
    imagen TEXT,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
  );
`);

console.log('✅ Tabla productos creada correctamente.');
db.close();
