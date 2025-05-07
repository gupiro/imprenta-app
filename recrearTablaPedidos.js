const Database = require('better-sqlite3');
const db = new Database('imprenta.db');

// 1. Crear nueva tabla temporal SIN la columna 'descripcion'
db.exec(`
  CREATE TABLE pedidos_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER,
    material TEXT,
    ancho REAL,
    alto REAL,
    descuento REAL,
    precio REAL NOT NULL,
    fecha TEXT NOT NULL,
    imagen TEXT,
    archivo_final TEXT,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE',
    monto_entregado REAL DEFAULT 0,
    monto_restante REAL DEFAULT 0,
    medio_pago TEXT DEFAULT 'Efectivo',
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  )
`);

// 2. Copiar los datos de pedidos a pedidos_temp
db.exec(`
  INSERT INTO pedidos_temp (id, cliente_id, material, ancho, alto, descuento, precio, fecha, imagen, archivo_final, estado, monto_entregado, monto_restante, medio_pago)
  SELECT id, cliente_id, material, ancho, alto, descuento, precio, fecha, imagen, archivo_final, estado, monto_entregado, monto_restante, medio_pago
  FROM pedidos
`);

// 3. Borrar tabla pedidos vieja
db.exec(`DROP TABLE pedidos`);

// 4. Renombrar pedidos_temp a pedidos
db.exec(`ALTER TABLE pedidos_temp RENAME TO pedidos`);

console.log('✅ ¡Tabla pedidos recreada sin la columna descripcion!');
