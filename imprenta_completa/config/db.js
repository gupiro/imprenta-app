const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../imprenta.db');
const db = new sqlite3.Database(dbPath);

function initDB() {
  db.serialize(() => {
    // Tabla de usuarios
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        contraseña TEXT NOT NULL,
        rol TEXT CHECK(rol IN ('admin', 'gerente', 'operario')) DEFAULT 'operario',
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de clientes
    db.run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT,
        telefono TEXT,
        direccion TEXT,
        ciudad TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de productos/catálogo
    db.run(`
      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        tipo TEXT CHECK(tipo IN ('lona', 'fotocopia', 'otro')) NOT NULL,
        precio_unitario REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        unidad TEXT CHECK(unidad IN ('m2', 'unidad', 'kg')) DEFAULT 'unidad',
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de presupuestos
    db.run(`
      CREATE TABLE IF NOT EXISTS presupuestos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        numero TEXT UNIQUE,
        fecha DATE DEFAULT CURRENT_DATE,
        estado TEXT CHECK(estado IN ('borrador', 'enviado', 'aceptado', 'rechazado')) DEFAULT 'borrador',
        subtotal REAL DEFAULT 0,
        descuento REAL DEFAULT 0,
        total REAL DEFAULT 0,
        vencimiento DATE,
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
      )
    `);

    // Tabla de items de presupuestos
    db.run(`
      CREATE TABLE IF NOT EXISTS presupuesto_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        presupuesto_id INTEGER NOT NULL,
        producto_id INTEGER,
        descripcion TEXT,
        cantidad REAL DEFAULT 1,
        ancho REAL,
        alto REAL,
        metros_cuadrados REAL,
        precio_unitario REAL NOT NULL,
        subtotal REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(presupuesto_id) REFERENCES presupuestos(id) ON DELETE CASCADE,
        FOREIGN KEY(producto_id) REFERENCES productos(id)
      )
    `);

    // Tabla de pedidos
    db.run(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        presupuesto_id INTEGER,
        cliente_id INTEGER,
        numero TEXT UNIQUE,
        fecha DATE DEFAULT CURRENT_DATE,
        estado TEXT CHECK(estado IN ('pendiente', 'en_proceso', 'completado', 'cancelado')) DEFAULT 'pendiente',
        fecha_entrega DATE,
        total REAL DEFAULT 0,
        pagado REAL DEFAULT 0,
        deuda REAL DEFAULT 0,
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(presupuesto_id) REFERENCES presupuestos(id),
        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
      )
    `);

    // Tabla de movimientos de caja
    db.run(`
      CREATE TABLE IF NOT EXISTS movimientos_caja (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha DATE DEFAULT CURRENT_DATE,
        tipo TEXT CHECK(tipo IN ('ingreso', 'egreso')) NOT NULL,
        concepto TEXT NOT NULL,
        monto REAL NOT NULL,
        pedido_id INTEGER,
        usuario_id INTEGER,
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pedido_id) REFERENCES pedidos(id),
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
      )
    `);

    // Tabla de movimientos de stock
    db.run(`
      CREATE TABLE IF NOT EXISTS movimientos_stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha DATE DEFAULT CURRENT_DATE,
        producto_id INTEGER NOT NULL,
        tipo TEXT CHECK(tipo IN ('entrada', 'salida', 'ajuste')) NOT NULL,
        cantidad REAL NOT NULL,
        pedido_id INTEGER,
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(producto_id) REFERENCES productos(id),
        FOREIGN KEY(pedido_id) REFERENCES pedidos(id)
      )
    `);

    // Insertar usuario admin por defecto
    db.get(`SELECT * FROM usuarios WHERE email = 'admin@imprenta.com'`, (err, row) => {
      if (!row) {
        const passwordHash = bcrypt.hashSync('admin123', 10);
        db.run(`
          INSERT INTO usuarios (nombre, email, contraseña, rol)
          VALUES (?, ?, ?, ?)
        `, ['Administrador', 'admin@imprenta.com', passwordHash, 'admin']);
      }
    });

    // Insertar productos de ejemplo
    db.get(`SELECT COUNT(*) as count FROM productos`, (err, row) => {
      if (row.count === 0) {
        const products = [
          ['Lona estándar', 'lona', 50, 0, 'm2'],
          ['Lona premium', 'lona', 75, 0, 'm2'],
          ['Fotocopia B/N', 'fotocopia', 0.50, 0, 'unidad'],
          ['Fotocopia color', 'fotocopia', 2, 0, 'unidad'],
          ['Impresión digital', 'otro', 5, 0, 'unidad']
        ];
        products.forEach(p => {
          db.run(`
            INSERT INTO productos (nombre, tipo, precio_unitario, stock, unidad)
            VALUES (?, ?, ?, ?, ?)
          `, p);
        });
      }
    });

    console.log('Base de datos inicializada');
  });
}

module.exports = {
  db,
  initDB,
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};
