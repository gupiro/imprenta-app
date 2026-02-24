-- Crear tabla presupuestos con TODAS las columnas
CREATE TABLE IF NOT EXISTS presupuestos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id       INTEGER,
    nombre_cliente   TEXT,
    email_cliente    TEXT,
    telefono_cliente TEXT,
    detalle          TEXT,
    precio_estimado  REAL DEFAULT 0,
    archivo_imagen   TEXT,
    producto_id      INTEGER,
    usado            INTEGER DEFAULT 0,
    descuento        REAL DEFAULT 0,
    estado           TEXT DEFAULT 'PENDIENTE',
    fecha_creacion   TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla presupuesto_items
CREATE TABLE IF NOT EXISTS presupuesto_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    presupuesto_id  INTEGER NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
    producto_id     INTEGER,
    descripcion     TEXT NOT NULL,
    cantidad        REAL DEFAULT 1,
    precio_unitario REAL NOT NULL,
    descuento_item  REAL DEFAULT 0,
    subtotal        REAL NOT NULL,
    fecha_creacion  TEXT DEFAULT CURRENT_TIMESTAMP
);
