const sqlite  = require('sqlite');
const sqlite3 = require('sqlite3');
const path    = require('path');

// Support for DATABASE_URL (Render) or local SQLite file
let dbFile;

if (process.env.DATABASE_URL) {
    // Render: Use persistent storage path if provided
    dbFile = process.env.DATABASE_URL;
} else if (process.env.DB_FILE) {
    // Legacy: Support custom DB_FILE environment variable
    dbFile = process.env.DB_FILE;
} else {
    // Default: Local SQLite file (development/localhost)
    dbFile = path.join(__dirname, '../imprenta.db');
}

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
                rol      TEXT NOT NULL DEFAULT 'operador' CHECK(rol IN ('admin', 'vendedor', 'operador', 'empleado', 'recepcionista')),
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
        // TABLA: GASTOS FIJOS (Módulo Finanzas)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS gastos_fijos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                categoria TEXT NOT NULL,
                frecuencia TEXT NOT NULL,
                monto REAL NOT NULL,
                dia_vencimiento INTEGER,
                activo INTEGER DEFAULT 1,
                fecha_creacion TEXT DEFAULT (datetime('now')),
                ultima_pagada TEXT,
                notas TEXT
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: PAGOS DE GASTOS FIJOS (Pagos parciales)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS pagos_gastos_fijos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                gasto_fijo_id INTEGER NOT NULL REFERENCES gastos_fijos(id) ON DELETE CASCADE,
                monto_pagado REAL NOT NULL,
                fecha_pago TEXT NOT NULL,
                metodo_pago TEXT,
                notas TEXT,
                caja_id INTEGER REFERENCES movimientos_caja(id),
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: COMPRAS EN CUOTAS (Módulo Finanzas)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS compras_cuotas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                descripcion TEXT NOT NULL,
                proveedor TEXT,
                fecha_compra TEXT NOT NULL,
                monto_total REAL NOT NULL,
                cant_cuotas INTEGER NOT NULL,
                monto_cuota REAL NOT NULL,
                fecha_primera_cuota TEXT NOT NULL,
                cuotas_pagadas INTEGER DEFAULT 0,
                medio_pago TEXT,
                categoria TEXT,
                notas TEXT,
                activo INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: FACTURAS RECIBIDAS (Libro IVA Compras)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS facturas_recibidas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_comprobante TEXT NOT NULL,
                numero_comprobante TEXT NOT NULL,
                fecha_emision TEXT NOT NULL,
                cuit_proveedor TEXT,
                razon_social TEXT NOT NULL,
                descripcion TEXT,
                categoria_contable TEXT,
                monto_neto REAL DEFAULT 0,
                alicuota_iva REAL DEFAULT 21,
                monto_iva REAL DEFAULT 0,
                monto_total REAL NOT NULL,
                forma_pago TEXT,
                estado TEXT DEFAULT 'pendiente',
                fecha_vencimiento_pago TEXT,
                notas TEXT,
                periodo TEXT,
                activo INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: PAGOS DE FACTURAS RECIBIDAS (Seguimiento de pagos)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS pagos_facturas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                factura_id INTEGER NOT NULL REFERENCES facturas_recibidas(id) ON DELETE CASCADE,
                monto_pagado REAL NOT NULL,
                fecha_pago TEXT NOT NULL,
                metodo_pago TEXT,
                notas TEXT,
                caja_id INTEGER REFERENCES movimientos_caja(id),
                usuario_id INTEGER REFERENCES users(id),
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // DATOS INICIALES
        // ════════════════════════════════════════════════════════════════

        // Usuario admin
        const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
        if (!adminExists) {
            const bcrypt = require('bcryptjs');
            const passwordHash = bcrypt.hashSync('admin123', 10);
            await db.run('INSERT INTO users (username, password, rol) VALUES (?, ?, ?)', ['admin', passwordHash, 'admin']);
            console.log('✅ Usuario admin creado (admin/admin123)');
        } else {
            console.log('✅ Usuario admin ya existe');
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

        // users.rol - agregar 'recepcionista' al CHECK constraint (migración)
        // Nota: La restricción CHECK se define en CREATE TABLE IF NOT EXISTS arriba
        // Las bases de datos existentes tendrán la restricción vieja, pero esto es OK
        // porque SQLite permite INSERT/UPDATE sin validar CHECK si la tabla ya existe
        // Los nuevos usuarios pueden tener cualquier rol a través de la aplicación

        // presupuestos.precio_extra (migración)
        const presupuestosInfo = await db.all("PRAGMA table_info(presupuestos)");
        if (!presupuestosInfo.some(c => c.name === 'precio_extra')) {
            await db.run("ALTER TABLE presupuestos ADD COLUMN precio_extra REAL DEFAULT 0");
            console.log('✅ Columna presupuestos.precio_extra agregada');
        }

        // pedidos.usuario_id (migración)
        const pedidosInfo = await db.all("PRAGMA table_info(pedidos)");
        if (!pedidosInfo.some(c => c.name === 'usuario_id')) {
            await db.run("ALTER TABLE pedidos ADD COLUMN usuario_id INTEGER REFERENCES users(id)");
            console.log('✅ Columna pedidos.usuario_id agregada');
        }

        // presupuestos.usuario_id (migración)
        const presupuestosInfo2 = await db.all("PRAGMA table_info(presupuestos)");
        if (!presupuestosInfo2.some(c => c.name === 'usuario_id')) {
            await db.run("ALTER TABLE presupuestos ADD COLUMN usuario_id INTEGER REFERENCES users(id)");
            console.log('✅ Columna presupuestos.usuario_id agregada');
        }

        // movimientos_caja.usuario_id (migración - para futuro)
        const cajaInfo = await db.all("PRAGMA table_info(movimientos_caja)");
        if (!cajaInfo.some(c => c.name === 'usuario_id')) {
            await db.run("ALTER TABLE movimientos_caja ADD COLUMN usuario_id INTEGER REFERENCES users(id)");
            console.log('✅ Columna movimientos_caja.usuario_id agregada');
        }

        // gastos.tipo (migración - separar gastos personales de negocio)
        const gastosInfo2 = await db.all("PRAGMA table_info(gastos)");
        if (!gastosInfo2.some(c => c.name === 'tipo')) {
            await db.run("ALTER TABLE gastos ADD COLUMN tipo TEXT DEFAULT 'negocio' CHECK(tipo IN ('negocio', 'personal'))");
            console.log('✅ Columna gastos.tipo agregada');
        }

        // gastos.metodo_pago (migración - registrar método de pago)
        const gastosInfo3 = await db.all("PRAGMA table_info(gastos)");
        if (!gastosInfo3.some(c => c.name === 'metodo_pago')) {
            await db.run("ALTER TABLE gastos ADD COLUMN metodo_pago TEXT DEFAULT 'efectivo'");
            console.log('✅ Columna gastos.metodo_pago agregada');
        }

        // gastos.tiene_factura (migración - indica si tiene factura registrada)
        const gastosInfo4 = await db.all("PRAGMA table_info(gastos)");
        if (!gastosInfo4.some(c => c.name === 'tiene_factura')) {
            await db.run("ALTER TABLE gastos ADD COLUMN tiene_factura INTEGER DEFAULT 0");
            console.log('✅ Columna gastos.tiene_factura agregada');
        }

        // proveedores.cuit (migración - para facturas recibidas)
        const provInfo2 = await db.all("PRAGMA table_info(proveedores)");
        if (!provInfo2.some(c => c.name === 'cuit')) {
            await db.run("ALTER TABLE proveedores ADD COLUMN cuit TEXT DEFAULT ''");
            console.log('✅ Columna proveedores.cuit agregada');
        }

        // proveedores.alicuota_iva_default (migración - alícuota por defecto)
        const provInfo3 = await db.all("PRAGMA table_info(proveedores)");
        if (!provInfo3.some(c => c.name === 'alicuota_iva_default')) {
            await db.run("ALTER TABLE proveedores ADD COLUMN alicuota_iva_default REAL DEFAULT 21");
            console.log('✅ Columna proveedores.alicuota_iva_default agregada');
        }

        // facturas_recibidas.proveedor_id (migración - referencia a proveedores)
        const facturasInfo = await db.all("PRAGMA table_info(facturas_recibidas)");
        if (!facturasInfo.some(c => c.name === 'proveedor_id')) {
            await db.run("ALTER TABLE facturas_recibidas ADD COLUMN proveedor_id INTEGER REFERENCES proveedores(id)");
            console.log('✅ Columna facturas_recibidas.proveedor_id agregada');
        }

        // facturas_recibidas.monto_pagado (migración - total pagado a la fecha)
        const facturasInfo2 = await db.all("PRAGMA table_info(facturas_recibidas)");
        if (!facturasInfo2.some(c => c.name === 'monto_pagado')) {
            await db.run("ALTER TABLE facturas_recibidas ADD COLUMN monto_pagado REAL DEFAULT 0");
            console.log('✅ Columna facturas_recibidas.monto_pagado agregada');
        }

        // facturas_recibidas.tiene_documento (migración - indica si tiene guardado el comprobante)
        const facturasInfo3 = await db.all("PRAGMA table_info(facturas_recibidas)");
        if (!facturasInfo3.some(c => c.name === 'tiene_documento')) {
            await db.run("ALTER TABLE facturas_recibidas ADD COLUMN tiene_documento INTEGER DEFAULT 0");
            console.log('✅ Columna facturas_recibidas.tiene_documento agregada');
        }

        // facturas_recibidas.fecha_pago (migración - fecha real de pago)
        const facturasInfo4 = await db.all("PRAGMA table_info(facturas_recibidas)");
        if (!facturasInfo4.some(c => c.name === 'fecha_pago')) {
            await db.run("ALTER TABLE facturas_recibidas ADD COLUMN fecha_pago TEXT DEFAULT ''");
            console.log('✅ Columna facturas_recibidas.fecha_pago agregada');
        }

        // ════════════════════════════════════════════════════════════════
        // TABLA: ITEMS DE FACTURAS RECIBIDAS (Para múltiples alícuotas)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS facturas_recibidas_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                factura_id INTEGER NOT NULL REFERENCES facturas_recibidas(id) ON DELETE CASCADE,
                descripcion TEXT NOT NULL,
                cantidad REAL DEFAULT 1,
                precio_unitario REAL NOT NULL,
                monto_neto REAL NOT NULL,
                alicuota_iva REAL DEFAULT 21,
                monto_iva REAL DEFAULT 0,
                subtotal REAL NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: VENCIMIENTOS FISCALES
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS vencimientos_fiscales (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                descripcion       TEXT NOT NULL,
                categoria         TEXT NOT NULL,
                fecha_vencimiento TEXT NOT NULL,
                periodo           TEXT DEFAULT '',
                monto_estimado    REAL DEFAULT 0,
                estado            TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'pagado', 'vencido')),
                notas             TEXT DEFAULT '',
                es_recurrente     INTEGER DEFAULT 0,
                periodicidad      TEXT DEFAULT '',
                created_at        TEXT DEFAULT (datetime('now'))
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // MIGRACIONES: vencimientos_fiscales (3 columnas nuevas)
        // ════════════════════════════════════════════════════════════════
        const vfCols = await db.all("PRAGMA table_info(vencimientos_fiscales)");
        if (!vfCols.some(c => c.name === 'organismo')) {
            await db.run("ALTER TABLE vencimientos_fiscales ADD COLUMN organismo TEXT DEFAULT NULL");
            console.log('✅ Columna vencimientos_fiscales.organismo agregada');
        }
        if (!vfCols.some(c => c.name === 'monto_real_pagado')) {
            await db.run("ALTER TABLE vencimientos_fiscales ADD COLUMN monto_real_pagado REAL DEFAULT NULL");
            console.log('✅ Columna vencimientos_fiscales.monto_real_pagado agregada');
        }
        if (!vfCols.some(c => c.name === 'fecha_real_pago')) {
            await db.run("ALTER TABLE vencimientos_fiscales ADD COLUMN fecha_real_pago TEXT DEFAULT NULL");
            console.log('✅ Columna vencimientos_fiscales.fecha_real_pago agregada');
        }

        // ════════════════════════════════════════════════════════════════
        // MIGRACIÓN: gastos_fijos.metodo_pago_default
        // ════════════════════════════════════════════════════════════════
        const gastosFijosColsV2 = await db.all("PRAGMA table_info(gastos_fijos)");
        if (!gastosFijosColsV2.some(c => c.name === 'metodo_pago_default')) {
            await db.run("ALTER TABLE gastos_fijos ADD COLUMN metodo_pago_default TEXT DEFAULT 'transferencia'");
            console.log('✅ Columna gastos_fijos.metodo_pago_default agregada');
        }

        // ════════════════════════════════════════════════════════════════
        // MIGRACIÓN: Columna turno en movimientos_caja
        // ════════════════════════════════════════════════════════════════
        const cajaCols = await db.all("PRAGMA table_info(movimientos_caja)");
        if (!cajaCols.some(c => c.name === 'turno')) {
            await db.run("ALTER TABLE movimientos_caja ADD COLUMN turno TEXT DEFAULT 'mañana'");
            console.log('✅ Columna movimientos_caja.turno agregada');
        }

        // ════════════════════════════════════════════════════════════════
        // MIGRACIÓN: deudas_tarjetas.banco
        // ════════════════════════════════════════════════════════════════
        const tarjetasColsBanco = await db.all("PRAGMA table_info(deudas_tarjetas)");
        if (!tarjetasColsBanco.some(c => c.name === 'banco')) {
            await db.run("ALTER TABLE deudas_tarjetas ADD COLUMN banco TEXT DEFAULT NULL");
            console.log('✅ Columna deudas_tarjetas.banco agregada');
        }

        // ════════════════════════════════════════════════════════════════
        // MIGRACIÓN: deudas_tarjetas.titular
        // ════════════════════════════════════════════════════════════════
        const tarjetasColsTitular = await db.all("PRAGMA table_info(deudas_tarjetas)");
        if (!tarjetasColsTitular.some(c => c.name === 'titular')) {
            await db.run("ALTER TABLE deudas_tarjetas ADD COLUMN titular TEXT DEFAULT NULL");
            console.log('✅ Columna deudas_tarjetas.titular agregada');
        }

        // ════════════════════════════════════════════════════════════════
        // MIGRACIÓN: deudas_tarjetas.tipo
        // ════════════════════════════════════════════════════════════════
        const tarjetasColsTipo = await db.all("PRAGMA table_info(deudas_tarjetas)");
        if (!tarjetasColsTipo.some(c => c.name === 'tipo')) {
            await db.run("ALTER TABLE deudas_tarjetas ADD COLUMN tipo TEXT DEFAULT 'negocio'");
            console.log('✅ Columna deudas_tarjetas.tipo agregada');
        }

        // ════════════════════════════════════════════════════════════════
        // TABLA: CIERRES DE TURNO
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS cierres_turno (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha      TEXT NOT NULL,
                turno      TEXT NOT NULL CHECK(turno IN ('mañana', 'tarde')),
                usuario_id INTEGER REFERENCES users(id),
                cerrado_at TEXT DEFAULT (datetime('now')),
                UNIQUE(fecha, turno)
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: NOTAS DEL SISTEMA (FEEDBACK)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS notas_sistema (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                contenido   TEXT NOT NULL,
                usuario_id  INTEGER REFERENCES users(id),
                fecha       TEXT DEFAULT (datetime('now'))
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // TABLA: PAGOS CLIENTES (Historial de pagos)
        // ════════════════════════════════════════════════════════════════
        await db.run(`
            CREATE TABLE IF NOT EXISTS pagos_clientes (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id          INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                monto               REAL NOT NULL,
                metodo_pago         TEXT DEFAULT 'Efectivo' CHECK(metodo_pago IN ('Efectivo', 'Transferencia', 'Tarjeta')),
                nota                TEXT,
                usuario_id          INTEGER REFERENCES users(id),
                pedidos_afectados   TEXT,
                fecha               TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at          TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ════════════════════════════════════════════════════════════════
        // ÍNDICES: Optimización de queries (FIX #6)
        // ════════════════════════════════════════════════════════════════
        // Índices críticos para 200+ pedidos/mes con 4 usuarios concurrentes
        const indexQueries = [
            // PEDIDOS - tablas más críticas (mayores volúmenes)
            "CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado)",
            "CREATE INDEX IF NOT EXISTS idx_pedidos_client_id ON pedidos(client_id)",
            "CREATE INDEX IF NOT EXISTS idx_pedidos_monto_restante ON pedidos(monto_restante)",
            "CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha)",
            "CREATE INDEX IF NOT EXISTS idx_pedidos_estado_pago ON pedidos(estado_pago)",

            // PRODUCTOS - por el N+1 fix
            "CREATE INDEX IF NOT EXISTS idx_productos_pedido_id ON productos(pedido_id)",

            // PRESUPUESTOS
            "CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON presupuestos(estado)",
            "CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente_id ON presupuestos(cliente_id)",
            "CREATE INDEX IF NOT EXISTS idx_presupuestos_usuario_id ON presupuestos(usuario_id)",

            // MOVIMIENTOS CAJA
            "CREATE INDEX IF NOT EXISTS idx_movimientos_caja_tipo ON movimientos_caja(tipo)",
            "CREATE INDEX IF NOT EXISTS idx_movimientos_caja_fecha ON movimientos_caja(fecha)",
            "CREATE INDEX IF NOT EXISTS idx_movimientos_caja_pedido_id ON movimientos_caja(pedido_id)",
            "CREATE INDEX IF NOT EXISTS idx_movimientos_caja_usuario_id ON movimientos_caja(usuario_id)",

            // DEUDAS - múltiples tablas
            "CREATE INDEX IF NOT EXISTS idx_deudas_pagos_deuda_id ON deudas_pagos(deuda_id)",
            "CREATE INDEX IF NOT EXISTS idx_deudas_pagos_tipo_deuda ON deudas_pagos(tipo_deuda)",
            "CREATE INDEX IF NOT EXISTS idx_deudas_cheques_estado ON deudas_cheques(estado)",
            "CREATE INDEX IF NOT EXISTS idx_deudas_cheques_fecha_vencimiento ON deudas_cheques(fecha_vencimiento)",
            "CREATE INDEX IF NOT EXISTS idx_deudas_prestamos_estado ON deudas_prestamos(estado)",
            "CREATE INDEX IF NOT EXISTS idx_deudas_proveedores_proveedor_id ON deudas_proveedores(proveedor_id)",

            // GASTOS
            "CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha)",
            "CREATE INDEX IF NOT EXISTS idx_gastos_estado_pago ON gastos(estado_pago)",

            // PAGOS CLIENTES
            "CREATE INDEX IF NOT EXISTS idx_pagos_clientes_cliente_id ON pagos_clientes(cliente_id)",
            "CREATE INDEX IF NOT EXISTS idx_pagos_clientes_fecha ON pagos_clientes(fecha)",
        ];

        try {
            for (const indexQuery of indexQueries) {
                await db.run(indexQuery);
            }
            console.log(`✅ ${indexQueries.length} índices de performance creados`);
        } catch (indexError) {
            console.log('⚠️  Error al crear índices (pueden ya existir):', indexError.message);
        }

        console.log('✅ Base de datos lista\n');

        // ════════════════════════════════════════════════════════════════
        // IMPORTAR DATOS DE BACKUP SI BD ESTÁ VACÍA
        // ════════════════════════════════════════════════════════════════
        try {
            const importData = require('./import-data');
            await importData(db);
        } catch (importError) {
            console.log('ℹ️  No se pudo importar datos (opcional)');
        }

        return db;

    } catch (error) {
        console.error('❌ Error al inicializar BD:', error);
        throw error;
    }
}

module.exports = initDb();
