const path = require('path');
const Database = require('better-sqlite3');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'imprenta.db');
const db = new Database(dbPath);

// Crear la tabla productos
db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    material TEXT NOT NULL,
    ancho REAL DEFAULT 0,
    alto REAL DEFAULT 0,
    descuento REAL DEFAULT 0,
    precio REAL DEFAULT 0,
    descripcion TEXT,
    imagen TEXT,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
  );
`);

console.log('✅ Tabla "productos" creada correctamente.');
db.close();
