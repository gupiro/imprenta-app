const Database = require('better-sqlite3');
const path     = require('path');

/* Ruta del archivo de base de datos:
   - En Render usaremos /data/imprenta.db  (el Disk persistente)
   - En desarrollo local usaremos ./imprenta.db junto al código */
const dbFile = process.env.DB_FILE || path.join(__dirname, 'imprenta.db');

// Abrimos (o creamos) la base de datos con un timeout de 10 s
const db = new Database(dbFile, { timeout: 10000 });




// Configuramos WAL y llaves foráneas, y busy_timeout en la sesión de SQLite
try {
  db.pragma('journal_mode = WAL', { simple: true });
  db.pragma('foreign_keys = ON', { simple: true });
  db.pragma('busy_timeout = 10000', { simple: true });
} catch (err) {
  console.warn('Pragma no aplicado (DB bloqueada?):', err.message);
}

// ── MATERIALS ──────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS materials (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    price       REAL    NOT NULL,
    tipoUnidad  TEXT    NOT NULL DEFAULT 'unidad'  -- <- nueva columna
  )
`).run();

// Migración: si no existe la columna tipoUnidad, la agregamos
{
  const cols = db.prepare("PRAGMA table_info(materials)").all().map(r => r.name);
  if (!cols.includes('tipoUnidad')) {
    db.prepare("ALTER TABLE materials ADD COLUMN tipoUnidad TEXT NOT NULL DEFAULT 'unidad'").run();
  }
}


// ── CLIENTES ────────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS clients (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT    NOT NULL,
    address  TEXT,
    phone    TEXT,
    email    TEXT,
    cuit     TEXT
  )
`).run();

// ── PRODUCT TYPES ─────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS product_types (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL
  )
`).run();
['Lona','Vinilo','Otros'].forEach(t => {
  if (!db.prepare('SELECT 1 FROM product_types WHERE name = ?').get(t)) {
    db.prepare('INSERT INTO product_types (name) VALUES (?)').run(t);
  }
});

// ── PEDIDOS ──────────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS pedidos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id        INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    precio           REAL    DEFAULT 0,
    fecha            TEXT,
    estado           TEXT    DEFAULT 'PENDIENTE',
    estado_pago      TEXT    DEFAULT 'PENDIENTE',
    monto_entregado  REAL    DEFAULT 0,
    monto_restante   REAL    DEFAULT 0,
    medio_pago       TEXT,
    fecha_pago       TEXT,
    fecha_entrega    TEXT,
    revision_archivo TEXT,
    unread_comments  INTEGER DEFAULT 0
  )
`).run();

// Migraciones de columnas en pedidos
try {
  const cols = db.prepare("PRAGMA table_info(pedidos)").all().map(r => r.name);
  if (!cols.includes('estado_pago'))      db.prepare("ALTER TABLE pedidos ADD COLUMN estado_pago TEXT DEFAULT 'PENDIENTE'").run();
  if (!cols.includes('fecha_pago'))       db.prepare("ALTER TABLE pedidos ADD COLUMN fecha_pago TEXT").run();
  if (!cols.includes('fecha_entrega'))    db.prepare("ALTER TABLE pedidos ADD COLUMN fecha_entrega TEXT").run();
  if (!cols.includes('revision_archivo')) db.prepare("ALTER TABLE pedidos ADD COLUMN revision_archivo TEXT").run();
  if (!cols.includes('unread_comments'))  db.prepare("ALTER TABLE pedidos ADD COLUMN unread_comments INTEGER DEFAULT 0").run();
} catch (err) {
  console.warn('Migración pedidos falló:', err.message);
}

// ── PRODUCTOS ────────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS productos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id   INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    material    TEXT,
    ancho       REAL,
    alto        REAL,
    descuento   REAL,
    precio      REAL,
    descripcion TEXT,
    imagenes    TEXT
  )
`).run();

// ── REVISION COMMENTS ─────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS revision_comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id  INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    comment    TEXT    NOT NULL,
    "user"     TEXT    NOT NULL,
    fecha      TEXT    NOT NULL,
    leido      INTEGER DEFAULT 0
  )
`).run();

// Migración para "leido"
try {
  const cols = db.prepare("PRAGMA table_info(revision_comments)").all().map(r => r.name);
  if (!cols.includes('leido')) {
    db.prepare("ALTER TABLE revision_comments ADD COLUMN leido INTEGER DEFAULT 0").run();
  }
} catch (err) {
  console.warn('Migración comments falló:', err.message);
}

// ── USUARIOS ────────────────────────────────────────────────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    UNIQUE NOT NULL,
    password  TEXT    NOT NULL,
    rol       TEXT    NOT NULL,
    permisos  TEXT    DEFAULT '[]'
  )
`).run();

module.exports = db;
