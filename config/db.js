const sqlite  = require('sqlite');
const sqlite3 = require('sqlite3');
const path    = require('path');

const dbFile = process.env.DB_FILE || path.join(__dirname, '../imprenta.db');
console.log('🔍 Base de datos:', dbFile);

let db = null;

async function initDb() {
    if (db) return db;
    try {
        db = await sqlite.open({ filename: dbFile, driver: sqlite3.Database });
        console.log('✅ Conexión a BD establecida');

        // ════════════════════════════════════════════════════════════════
        // TABLA: USUARIOS
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                rol      TEXT NOT NULL DEFAULT 'operador' CHECK(rol IN ('admin', 'vendedor', 'operador', 'empleado')),
                permisos TEXT DEFAULT '[]',
                activo   BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: CLIENTES
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS clients (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                name    TEXT NOT NULL,
                address TEXT,
                phone   TEXT,
                email   TEXT,
                cuit    TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: CATÁLOGO DE PRODUCTOS
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS catalogo_productos (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo       TEXT UNIQUE,
                nombre       TEXT NOT NULL,
                tipo         TEXT NOT NULL CHECK(tipo IN ('lona', 'fotocopia', 'impresion', 'otro')),
                precio_base  REAL NOT NULL,
                precio_costo REAL DEFAULT 0,
                minimo       REAL DEFAULT 1,
                detalle      TEXT,
                publico      INTEGER DEFAULT 0,
                stock        REAL DEFAULT 0,
                unidad       TEXT DEFAULT 'unidad' CHECK(unidad IN ('unidad', 'm2', 'kg')),
                activo       BOOLEAN DEFAULT 1,
                created_at   TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: PRESUPUESTOS
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS presupuestos (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id       INTEGER REFERENCES clients(id),
                nombre_cliente   TEXT,
                email_cliente    TEXT,
                telefono_cliente TEXT,
                detalle          TEXT,
                precio_estimado  REAL DEFAULT 0,
                archivo_imagen   TEXT,
                producto_id      INTEGER,
                usado            INTEGER DEFAULT 0,
                descuento        REAL DEFAULT 0,
                estado           TEXT DEFAULT 'PENDIENTE' CHECK(estado IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'CONVERTIDO')),
                fecha_creacion   TEXT DEFAULT CURRENT_TIMESTAMP,
                vencimiento      TEXT
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: ITEMS DE PRESUPUESTO
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS presupuesto_items (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                presupuesto_id  INTEGER NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
                producto_id     INTEGER,
                descripcion     TEXT NOT NULL,
                cantidad        REAL DEFAULT 1,
                ancho           REAL,
                alto            REAL,
                precio_unitario REAL NOT NULL,
                descuento_item  REAL DEFAULT 0,
                subtotal        REAL NOT NULL,
                fecha_creacion  TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: PEDIDOS
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id        INTEGER REFERENCES clients(id) ON DELETE SET NULL,
                presupuesto_id   INTEGER,
                precio           REAL DEFAULT 0,
                fecha            TEXT DEFAULT CURRENT_TIMESTAMP,
                estado           TEXT DEFAULT 'PENDIENTE' CHECK(estado IN ('PENDIENTE', 'EN_PRODUCCION', 'LISTO', 'ENTREGADO', 'CANCELADO')),
                estado_pago      TEXT DEFAULT 'PENDIENTE' CHECK(estado_pago IN ('PENDIENTE', 'PARCIAL', 'PAGADO')),
                monto_entregado  REAL DEFAULT 0,
                monto_restante   REAL DEFAULT 0,
                medio_pago       TEXT,
                fecha_pago       TEXT,
                fecha_entrega    TEXT,
                unread_comments  INTEGER DEFAULT 0,
                created_at       TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: PRODUCTOS (ítems de pedido)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS productos (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id        INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
                material         TEXT,
                ancho            REAL,
                alto             REAL,
                descuento        REAL DEFAULT 0,
                precio           REAL,
                descripcion      TEXT,
                imagenes         TEXT DEFAULT '[]',
                cantidad         INTEGER DEFAULT 1,
                precio_unitario  REAL,
                created_at       TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: MOVIMIENTOS DE CAJA (integración automática)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS movimientos_caja (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo        TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso')),
                concepto    TEXT NOT NULL,
                categoria   TEXT,
                monto       REAL NOT NULL,
                metodo_pago TEXT,
                pedido_id   INTEGER REFERENCES pedidos(id),
                usuario_id  INTEGER REFERENCES users(id),
                fecha       TEXT DEFAULT CURRENT_TIMESTAMP,
                notas       TEXT,
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: STOCK
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS stock (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre       TEXT NOT NULL,
                producto_id  INTEGER REFERENCES catalogo_productos(id),
                unidad       TEXT DEFAULT 'unidad',
                cantidad     REAL DEFAULT 0,
                stock_minimo REAL DEFAULT 0,
                precio_costo REAL DEFAULT 0,
                created_at   TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: MOVIMIENTOS DE STOCK (FASE 2)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS movimientos_stock (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_id INTEGER NOT NULL REFERENCES catalogo_productos(id),
                tipo        TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'ajuste')),
                cantidad    REAL NOT NULL,
                pedido_id   INTEGER REFERENCES pedidos(id),
                usuario_id  INTEGER REFERENCES users(id),
                notas       TEXT,
                fecha       TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: GASTOS
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS gastos (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha          TEXT NOT NULL,
                categoria      TEXT NOT NULL,
                descripcion    TEXT NOT NULL,
                monto          REAL NOT NULL,
                estado_pago    TEXT DEFAULT 'pendiente',
                usuario_id     INTEGER REFERENCES users(id),
                created_at     TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: PROVEEDORES
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS proveedores (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre      TEXT NOT NULL,
                telefono    TEXT,
                email       TEXT,
                rubro       TEXT,
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: COMENTARIOS DE REVISIÓN (FASE 2)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS revision_comments (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
                comment  TEXT NOT NULL,
                "user"   TEXT NOT NULL,
                fecha    TEXT DEFAULT CURRENT_TIMESTAMP,
                leido    INTEGER DEFAULT 0
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: IMÁGENES DE REVISIÓN (FASE 2)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS revision_images (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
                filename  TEXT NOT NULL,
                fecha     TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: DEUDAS - TARJETAS DE CRÉDITO
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS deudas_tarjetas (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_tarjeta      TEXT NOT NULL,
                limite_credito      REAL DEFAULT 0,
                saldo_adeudado      REAL DEFAULT 0,
                fecha_cierre        INTEGER,
                fecha_vencimiento   INTEGER,
                monto_minimo        REAL DEFAULT 0,
                estado              TEXT DEFAULT 'activa' CHECK(estado IN ('activa', 'inactiva')),
                notas               TEXT,
                created_at          TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: DEUDAS - CHEQUES DIFERIDOS EMITIDOS
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS deudas_cheques (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_cheque       TEXT NOT NULL,
                banco               TEXT NOT NULL,
                beneficiario        TEXT NOT NULL,
                monto               REAL NOT NULL,
                fecha_emision       TEXT NOT NULL,
                fecha_vencimiento   TEXT NOT NULL,
                estado              TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'cobrado', 'rechazado')),
                proveedor_id        INTEGER REFERENCES proveedores(id),
                notas               TEXT,
                created_at          TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: DEUDAS - PRÉSTAMOS
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS deudas_prestamos (
                id                      INTEGER PRIMARY KEY AUTOINCREMENT,
                descripcion             TEXT NOT NULL,
                entidad                 TEXT NOT NULL,
                monto_original          REAL NOT NULL,
                monto_pendiente         REAL NOT NULL,
                cuota_mensual           REAL DEFAULT 0,
                fecha_primer_vencimiento TEXT,
                dia_vencimiento_mensual INTEGER,
                cuotas_totales          INTEGER DEFAULT 0,
                cuotas_pagadas          INTEGER DEFAULT 0,
                tasa_interes            REAL DEFAULT 0,
                estado                  TEXT DEFAULT 'activo' CHECK(estado IN ('activo', 'cancelado')),
                notas                   TEXT,
                created_at              TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: DEUDAS - PROVEEDORES
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS deudas_proveedores (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                proveedor_id      INTEGER REFERENCES proveedores(id),
                concepto          TEXT NOT NULL,
                monto_total       REAL NOT NULL,
                monto_pagado      REAL DEFAULT 0,
                fecha_deuda       TEXT NOT NULL,
                fecha_vencimiento TEXT,
                estado            TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'pagado_parcial', 'pagado')),
                notas             TEXT,
                created_at        TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: DEUDAS - HISTORIAL DE PAGOS
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS deudas_pagos (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_deuda  TEXT NOT NULL CHECK(tipo_deuda IN ('tarjeta', 'cheque', 'prestamo', 'proveedor')),
                deuda_id    INTEGER NOT NULL,
                monto       REAL NOT NULL,
                fecha       TEXT NOT NULL,
                metodo_pago TEXT,
                notas       TEXT,
                usuario_id  INTEGER REFERENCES users(id),
                caja_id     INTEGER REFERENCES movimientos_caja(id),
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // DATOS INICIALES
        // ════════════════════════════════════════════════════════════════

        // Usuario admin
        const adminExists = await db.get('SELECT id FROM users WHERE username = ?', 'admin');
        if (!adminExists) {
            const bcrypt = require('bcryptjs');
            const passwordHash = bcrypt.hashSync('admin123', 10);
            await db.run('INSERT INTO users (username, password, rol) VALUES (?, ?, ?)', 'admin', passwordHash, 'admin');
            console.log('✅ Usuario admin creado (admin/admin123)');
        }

        // Rol EMPLEADO añadido - solo acceso a Caja y opciones limitadas
        // Sin acceso a: ingresos/ventas, deudores

        // Productos iniciales
        const productsCount = await db.get('SELECT COUNT(*) as count FROM catalogo_productos');
        if (productsCount.count === 0) {
            const products = [
                ['Lona estándar', 'lona', 10000, 0, 1, 'm2'],
                ['Lona premium', 'lona', 15000, 0, 1, 'm2'],
                ['Fotocopia B/N', 'fotocopia', 500, 0, 100, 'unidad'],
                ['Fotocopia color', 'fotocopia', 2000, 0, 100, 'unidad'],
                ['Impresión digital', 'impresion', 5000, 0, 10, 'unidad'],
                ['Talonario 22x17', 'otro', 6000, 0, 1, 'unidad']
            ];
            for (const p of products) {
                await db.run(
                    'INSERT INTO catalogo_productos (nombre, tipo, precio_base, precio_costo, minimo, unidad) VALUES (?, ?, ?, ?, ?, ?)',
                    ...p
                );
            }
            console.log('✅ Productos iniciales creados');
        }

        // ════════════════════════════════════════════════════════════════
        // MIGRACIONES: columnas añadidas en actualizaciones
        // ════════════════════════════════════════════════════════════════

        // gastos.proveedor_id (migración)
        const gastosInfo = await db.all("PRAGMA table_info(gastos)");
        if (!gastosInfo.some(c => c.name === 'proveedor_id')) {
            await db.run("ALTER TABLE gastos ADD COLUMN proveedor_id INTEGER REFERENCES proveedores(id)");
            console.log('✅ Columna gastos.proveedor_id agregada');
        }

        // proveedores.notas (migración)
        const provInfo = await db.all("PRAGMA table_info(proveedores)");
        if (!provInfo.some(c => c.name === 'notas')) {
            await db.run("ALTER TABLE proveedores ADD COLUMN notas TEXT DEFAULT ''");
            console.log('✅ Columna proveedores.notas agregada');
        }

        console.log('✅ Base de datos lista\n');
        return db;

    } catch (error) {
        console.error('❌ Error al inicializar BD:', error);
        throw error;
    }
}

module.exports = initDb();
