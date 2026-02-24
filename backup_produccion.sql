-- Backup de Imprenta El Gráfico
-- Fecha: 23/2/2026, 10:42:04

CREATE TABLE users (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                rol      TEXT NOT NULL DEFAULT 'operador' CHECK(rol IN ('admin', 'vendedor', 'operador')),
                permisos TEXT DEFAULT '[]',
                activo   BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

CREATE TABLE sqlite_sequence(name,seq);

CREATE TABLE clients (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                name    TEXT NOT NULL,
                address TEXT,
                phone   TEXT,
                email   TEXT,
                cuit    TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

CREATE TABLE catalogo_productos (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
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
            , codigo TEXT DEFAULT NULL);

CREATE TABLE presupuestos (
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
            );

CREATE TABLE presupuesto_items (
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
            );

CREATE TABLE pedidos (
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
            );

CREATE TABLE productos (
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
            );

CREATE TABLE movimientos_caja (
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
            );

CREATE TABLE stock (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre       TEXT NOT NULL,
                producto_id  INTEGER REFERENCES catalogo_productos(id),
                unidad       TEXT DEFAULT 'unidad',
                cantidad     REAL DEFAULT 0,
                stock_minimo REAL DEFAULT 0,
                precio_costo REAL DEFAULT 0,
                created_at   TEXT DEFAULT CURRENT_TIMESTAMP
            );

CREATE TABLE movimientos_stock (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_id INTEGER NOT NULL REFERENCES catalogo_productos(id),
                tipo        TEXT NOT NULL CHECK(tipo IN ('entrada', 'salida', 'ajuste')),
                cantidad    REAL NOT NULL,
                pedido_id   INTEGER REFERENCES pedidos(id),
                usuario_id  INTEGER REFERENCES users(id),
                notas       TEXT,
                fecha       TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP
            );

CREATE TABLE gastos (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha          TEXT NOT NULL,
                categoria      TEXT NOT NULL,
                descripcion    TEXT NOT NULL,
                monto          REAL NOT NULL,
                estado_pago    TEXT DEFAULT 'pendiente',
                usuario_id     INTEGER REFERENCES users(id),
                created_at     TEXT DEFAULT CURRENT_TIMESTAMP
            , proveedor_id INTEGER REFERENCES proveedores(id));

CREATE TABLE proveedores (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre      TEXT NOT NULL,
                telefono    TEXT,
                email       TEXT,
                rubro       TEXT,
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP
            , notas TEXT DEFAULT '');

CREATE TABLE revision_comments (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
                comment  TEXT NOT NULL,
                "user"   TEXT NOT NULL,
                fecha    TEXT DEFAULT CURRENT_TIMESTAMP,
                leido    INTEGER DEFAULT 0
            );

CREATE TABLE revision_images (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
                filename  TEXT NOT NULL,
                fecha     TEXT DEFAULT CURRENT_TIMESTAMP
            );

CREATE TABLE pagos_pedido (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
                    monto REAL NOT NULL,
                    metodo_pago TEXT,
                    fecha TEXT DEFAULT CURRENT_TIMESTAMP,
                    usuario_id INTEGER REFERENCES users(id),
                    notas TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

INSERT INTO users (id, username, password, rol, permisos, activo, created_at) VALUES (1, 'admin', '$2b$10$kEvQsW/pT9QRQv14qPS6SO6n7AQMhVNxZ5sPaIOBmlELb6K0zjz06', 'admin', '[]', 1, '2026-02-22 20:56:16');
INSERT INTO users (id, username, password, rol, permisos, activo, created_at) VALUES (2, 'JUAN', '$2b$10$G6OhlwSmysJL1dHlcF6O.eUk5DGEBu7khZbEGqzIkUEZdYlOb87d.', 'vendedor', '[]', 1, '2026-02-22 22:53:12');
INSERT INTO users (id, username, password, rol, permisos, activo, created_at) VALUES (3, 'ROSANA', '$2b$10$rtIf5osewgJlTCK4EtUj8umGAViedPzvpFGKSJ1po1f1f7mqNTcBW', 'operador', '[]', 1, '2026-02-22 22:54:28');
INSERT INTO users (id, username, password, rol, permisos, activo, created_at) VALUES (4, 'Ariel', '$2b$10$PD19mx141O75o82sGYVUIuBXxSzGKWFpaElezvCTcOd7CZymnRHb.', 'vendedor', '[]', 1, '2026-02-23 13:04:16');
INSERT INTO users (id, username, password, rol, permisos, activo, created_at) VALUES (5, 'papa', '$2b$10$Xu4W/tgWDqkeHlq3rUrvE.W6mFQLrH1o3tRWXDWJVshORVqZRgaJ2', 'vendedor', '[]', 1, '2026-02-23 23:58:18');
INSERT INTO users (id, username, password, rol, permisos, activo, created_at) VALUES (6, 'mama', '$2b$10$gdTjtoxKw1yRDm3XTRdDjuhIbNAQSnl.8NmqNidRhxzBuJCmXKvkO', 'vendedor', '[]', 1, '2026-02-24 01:15:33');

INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (1, 'Lona estándar', 'lona', 10000, 0, 1, NULL, 0, 0, 'm2', 1, '2026-02-22 20:56:16', 'LON-001');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (3, 'Fotocopia B/N', 'fotocopia', 500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-22 20:56:16', 'FOT-001');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (4, 'Fotocopia color', 'fotocopia', 2000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-22 20:56:16', 'FOT-002');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (5, 'Impresión digital', 'impresion', 5000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-22 20:56:16', 'IMP-001');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (6, 'Talonario 1/2 Oficio x Duplicado', 'otro', 5000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-22 20:56:16', '005-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (7, 'Talonario 1/3', 'otro', 4000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '006-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (8, 'Talonario Oficio x Duplicado', 'otro', 12000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '007-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (9, 'Talonario Oficio x Triplicado', 'otro', 20000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '008-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (10, 'A4 Logo Color', 'otro', 10000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '010-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (11, '1/2 Oficio Logo Color', 'otro', 6000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '011-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (12, 'Entradas 6 Tal', 'otro', 12000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '012-E');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (13, 'Entradas Logo Color 8 Tal', 'otro', 6000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '015-E');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (14, 'Entradas 12 Tal', 'otro', 21600, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '014-E');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (15, 'Entradas Logo Color', 'otro', 6000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '015-E');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (16, 'Entradas Full Color', 'otro', 8000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '016-E');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (17, 'TAL.ABROCHADOS', 'otro', 2500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '017-E');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (18, 'Bono Contribución 500 Nº', 'otro', 16500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '018-B');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (19, 'Bono Contribución 1000 Nº', 'otro', 33000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '019-B');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (20, 'Impresión Color A4', 'impresion', 500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:25', '020-I');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (21, 'Impresión Color A3', 'impresion', 1000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '021-I');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (22, 'Impresión Color A4 Cartulina', 'impresion', 1500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '022-I');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (23, 'Impresión Color A3 Cartulina', 'impresion', 3000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '023-I');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (24, 'Impresión Papel IMP/B Nº A4', 'impresion', 150, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '024-I');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (25, 'Impresión Papel IMP/B Nº A3', 'impresion', 300, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '025-I');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (26, 'Fotográfico', 'otro', 2000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '026-F');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (27, 'Fotográfico Papel', 'otro', 13000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '027-F');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (28, 'Fotocopias Blanco y Negro', 'fotocopia', 15, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '028-F');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (29, 'Fotocopias Color', 'fotocopia', 35, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '029-F');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (30, 'Fotocopias 150 Blanco/Negro', 'fotocopia', 150, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '030-F');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (31, 'Fotocopias 150 Blanco/Negro A3', 'fotocopia', 180, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '031-F');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (32, 'Tarjeta Personal', 'otro', 12000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '032-J');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (33, 'Tarjeta Personal 10x15', 'otro', 16000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '033-J');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (34, 'Tarjetas Cartulina 1/8', 'otro', 250, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '034-J');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (35, 'Tarjetas Cartulina 1/4', 'otro', 150, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '035-J');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (36, 'Tarjetas Certificados A3', 'otro', 2000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '069-C');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (37, 'Banner Público', 'otro', 30000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '037-L');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (38, 'Lona Front', 'lona', 20000, 0, 1, NULL, 0, 0, 'm2', 1, '2026-02-23 23:38:26', NULL);
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (39, 'Lona Back', 'lona', 14000, 0, 1, NULL, 0, 0, 'm2', 1, '2026-02-23 23:38:26', '039-L');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (40, 'Lona Front High', 'lona', 600, 0, 1, NULL, 0, 0, 'm2', 1, '2026-02-23 23:38:26', '040-L');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (41, 'Vinilo BB', 'otro', 11500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '041-L');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (42, 'Vinilo TR', 'otro', 16500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '042-L');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (43, 'Sello Público', 'otro', 30000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '043-S');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (44, 'Sello Bolsillo', 'otro', 3000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '044-S');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (45, 'Talonario A4 x Triplicado', 'otro', 17000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '004-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (46, 'Carnet', 'otro', 2000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '046-S');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (47, 'Llaveros', 'otro', 2000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '047-D');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (48, 'Plastificado', 'otro', 500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '048-D');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (49, 'Anillado', 'otro', 6000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '049-D');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (50, 'Sublimado en Gorra', 'otro', 6500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '050-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (51, 'Sublimado en DIE', 'otro', 1500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '051-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (52, 'Estampado en Gorra', 'otro', 1500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '052-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (53, 'Micro', 'otro', 17000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '053-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (54, 'Ploteo Tapa', 'otro', 5400, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '054-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (55, 'Cerámica', 'otro', 10000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '055-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (56, 'Talonario Oficio x Quadrup', 'otro', 24000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '009-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (57, 'Canvas', 'otro', 18200, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '057-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (58, 'Bandera 1.50x1', 'otro', 15000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '058-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (59, 'Mueble', 'otro', 2500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '059-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (60, 'Acrílico', 'otro', 1500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '060-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (61, 'UNSA', 'otro', 0, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '061-A');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (62, 'Resma Logo Color', 'otro', 60000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '062-R');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (63, 'Resma 1/Azul', 'otro', 25000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '063-R');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (64, 'Resma Encolada Azul', 'otro', 14300, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '064-R');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (65, 'Resma 1/ Negra', 'otro', 27500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '065-R');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (66, 'Gremio', 'lona', 9000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', NULL);
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (67, 'Talonarios 3 500', 'otro', 3500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '067-R');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (68, 'Clínica', 'otro', 0, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '068-C');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (69, 'Certificados A3', 'otro', 2000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '069-C');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (70, 'Adhesivo', 'otro', 2500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '070-C');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (71, 'Carátula A/L', 'otro', 350, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '071-C');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (72, 'Ficha 10x14', 'otro', 150, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', 'FICHA-10x14');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (73, 'Patente', 'otro', 2500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '072-P');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (74, 'Talonario 1/2', 'otro', 5000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '005-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (75, 'Talonario 1/2 Oficio x Triplicado', 'otro', 5000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '005-T');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (76, 'Cambio', 'otro', 5000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '045-S');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (77, 'Resma Encolado', 'otro', 3500, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '066-R');
INSERT INTO catalogo_productos (id, nombre, tipo, precio_base, precio_costo, minimo, detalle, publico, stock, unidad, activo, created_at, codigo) VALUES (78, 'Talonario A4 Duplicado', 'otro', 12000, 0, 1, NULL, 0, 0, 'unidad', 1, '2026-02-23 23:38:26', '003-T');

INSERT INTO presupuestos (id, cliente_id, nombre_cliente, email_cliente, telefono_cliente, detalle, precio_estimado, archivo_imagen, producto_id, usado, descuento, estado, fecha_creacion, vencimiento) VALUES (1, 1, 'Juan Bravo', '', '3878441387', NULL, 15000, NULL, NULL, 0, 0, 'PENDIENTE', '2026-02-22 21:05:20', NULL);
INSERT INTO presupuestos (id, cliente_id, nombre_cliente, email_cliente, telefono_cliente, detalle, precio_estimado, archivo_imagen, producto_id, usado, descuento, estado, fecha_creacion, vencimiento) VALUES (2, 1, 'Juan Bravo', '', '3878441387', NULL, 63000, NULL, NULL, 1, 0, 'CONVERTIDO', '2026-02-22 21:31:29', NULL);
INSERT INTO presupuestos (id, cliente_id, nombre_cliente, email_cliente, telefono_cliente, detalle, precio_estimado, archivo_imagen, producto_id, usado, descuento, estado, fecha_creacion, vencimiento) VALUES (3, 1, 'Juan Bravo', '', '3878441387', NULL, 60000, NULL, NULL, 1, 0, 'CONVERTIDO', '2026-02-22 21:44:45', NULL);
INSERT INTO presupuestos (id, cliente_id, nombre_cliente, email_cliente, telefono_cliente, detalle, precio_estimado, archivo_imagen, producto_id, usado, descuento, estado, fecha_creacion, vencimiento) VALUES (4, NULL, 'Pepe', '', '3878455991', NULL, 120000, NULL, NULL, 1, 0, 'CONVERTIDO', '2026-02-22 22:27:21', NULL);
INSERT INTO presupuestos (id, cliente_id, nombre_cliente, email_cliente, telefono_cliente, detalle, precio_estimado, archivo_imagen, producto_id, usado, descuento, estado, fecha_creacion, vencimiento) VALUES (5, 4, 'Pepe', '', '3878455991', NULL, 70000, NULL, NULL, 0, 0, 'PENDIENTE', '2026-02-23 11:26:04', NULL);

INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (1, 1, NULL, 95000, '2026-02-22 21:09:06', 'ENTREGADO', 'PAGADO', 50000, 95000, 'Efectivo', '2026-02-22 21:28:33', NULL, 0, '2026-02-22 21:09:06');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (2, 2, NULL, 68000, '2026-02-22 21:13:01', 'LISTO', 'PENDIENTE', 10000, 68000, 'Transferencia', NULL, NULL, 0, '2026-02-22 21:13:01');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (3, 1, 2, 63000, '2026-02-22 21:31:39', 'CANCELADO', 'PAGADO', 63000, 0, 'QR', '2026-02-24 00:09:57', NULL, 0, '2026-02-22 21:31:39');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (4, 1, NULL, 70000, '2026-02-22 21:40:17', 'ENTREGADO', 'PAGADO', 22500, 70000, 'Transferencia', '2026-02-22 21:43:09', NULL, 0, '2026-02-22 21:40:17');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (5, 1, 3, 60000, '2026-02-22 21:45:10', 'EN_PRODUCCION', 'PENDIENTE', 0, 60000, NULL, NULL, NULL, 0, '2026-02-22 21:45:10');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (6, 1, NULL, 205000, '2026-02-22 22:05:08', 'LISTO', 'PAGADO', 15000, 205000, 'Tarjeta', '2026-02-22 22:14:43', NULL, 0, '2026-02-22 22:05:08');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (7, 2, NULL, 630000, '2026-02-22 22:16:16', 'ENTREGADO', 'PENDIENTE', 40000, 630000, 'Efectivo', NULL, NULL, 0, '2026-02-22 22:16:16');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (8, 1, NULL, 60000, '2026-02-22 22:22:27', 'PENDIENTE', 'PENDIENTE', 30000, 60000, 'Efectivo', NULL, NULL, 0, '2026-02-22 22:22:27');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (9, 4, 4, 120000, '2026-02-22 22:31:48', 'PENDIENTE', 'PENDIENTE', 0, 120000, NULL, NULL, NULL, 0, '2026-02-22 22:31:48');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (10, 3, NULL, 332500, '2026-02-23 11:05:12', 'ENTREGADO', 'PENDIENTE', 30000, 332500, 'Transferencia', NULL, NULL, 0, '2026-02-23 11:05:12');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (11, 2, NULL, 220000, '2026-02-23 11:21:57', 'PENDIENTE', 'PENDIENTE', 10000, 220000, 'QR', NULL, NULL, 0, '2026-02-23 11:21:57');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (12, 1, NULL, 45000, '2026-02-23 23:28:59', 'CANCELADO', 'PENDIENTE', 10000, 35000, 'Efectivo', NULL, '2026-03-02', 0, '2026-02-23 23:28:59');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (13, 1, NULL, 19500, '2026-02-23 23:53:55', 'LISTO', 'PENDIENTE', 5000, 14500, 'QR', NULL, '2026-02-24', 0, '2026-02-23 23:53:55');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (14, 3, NULL, 12000, '2026-02-23 23:55:39', 'PENDIENTE', 'PENDIENTE', 2000, 10000, 'Efectivo', NULL, '2026-02-23', 0, '2026-02-23 23:55:39');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (15, 3, NULL, 12000, '2026-02-24 00:08:00', 'PENDIENTE', 'PENDIENTE', 2000, 10000, 'Efectivo', NULL, '2026-02-25', 0, '2026-02-24 00:08:00');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (16, 2, NULL, 44000, '2026-02-24 00:11:48', 'PENDIENTE', 'PENDIENTE', 20000, 24000, 'Tarjeta', NULL, '2026-02-25', 0, '2026-02-24 00:11:48');
INSERT INTO pedidos (id, client_id, presupuesto_id, precio, fecha, estado, estado_pago, monto_entregado, monto_restante, medio_pago, fecha_pago, fecha_entrega, unread_comments, created_at) VALUES (17, 5, NULL, 23500, '2026-02-24 00:25:24', 'LISTO', 'PENDIENTE', 13500, 10000, 'Efectivo', NULL, '2026-02-25', 0, '2026-02-24 00:25:24');

INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (1, 1, 'Fotocopia B/N', 0, 0, 0, 50000, 'Sin descripción', '[]', 1, NULL, '2026-02-22 21:09:06');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (2, 1, 'Lona estándar', 5, 0.9, 0, 45000, 'Sin descripción', '[]', 1, NULL, '2026-02-22 21:09:06');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (3, 2, 'Fotocopia B/N', 0, 0, 0, 50000, 'Sin descripción', '[]', 1, NULL, '2026-02-22 21:13:01');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (4, 2, 'Lona estándar', 2, 1, 0, 18000, 'Sin descripción', '[]', 1, NULL, '2026-02-22 21:13:01');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (5, 3, 'Fotocopia B/N', NULL, NULL, 0, 50000, 'Fotocopia B/N', '[]', 1, NULL, '2026-02-22 21:31:39');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (6, 3, 'Lona estándar', NULL, NULL, 0, 13000, 'Lona estándar', '[]', 1, NULL, '2026-02-22 21:31:39');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (7, 4, 'Fotocopia B/N', 0, 0, 0, 50000, 'Sin descripción', '[]', 1, NULL, '2026-02-22 21:40:18');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (8, 4, 'Lona estándar', 2, 1, 0, 20000, 'Sin descripción', '[]', 1, NULL, '2026-02-22 21:40:18');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (9, 5, 'Fotocopia B/N', NULL, NULL, 0, 50000, 'Fotocopia B/N', '[]', 1, NULL, '2026-02-22 21:45:11');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (10, 5, 'Lona estándar', NULL, NULL, 0, 10000, 'Lona estándar', '[]', 1, NULL, '2026-02-22 21:45:11');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (11, 6, 'Fotocopia B/N', 0, 0, 0, 200000, 'Sin descripción', '[]', 1, NULL, '2026-02-22 22:05:08');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (12, 6, 'Lona estándar', 1, 0.5, 0, 5000, 'Sin descripción', '[]', 1, NULL, '2026-02-22 22:05:08');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (13, 7, 'Fotocopia B/N', 0, 0, 0, 450000, 'Cartilla ingles', '[]', 1, NULL, '2026-02-22 22:16:16');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (14, 7, 'Lona estándar', 1, 2, 0, 180000, 'Lona Cursillo', '[]', 1, NULL, '2026-02-22 22:16:16');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (15, 8, 'Lona estándar', 3, 2, 0, 60000, 'lona Municipalidad pichanal', '[]', 1, NULL, '2026-02-22 22:22:27');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (16, 9, 'Impresión digital', NULL, NULL, 0, 75000, 'Impresión digital', '[]', 1, NULL, '2026-02-22 22:31:48');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (17, 9, 'Lona premium', NULL, NULL, 0, 45000, 'Lona premium', '[]', 1, NULL, '2026-02-22 22:31:48');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (18, 10, 'Fotocopia B/N', 0, 0, 0, 12500, 'Copias cursillo', '[]', 1, NULL, '2026-02-23 11:05:12');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (19, 10, 'Lona estándar', 2, 1, 0, 320000, 'Lona Mate', '[]', 1, NULL, '2026-02-23 11:05:12');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (20, 11, 'Fotocopia B/N', 0, 0, 0, 200000, 'Copias cursillo', '[]', 1, NULL, '2026-02-23 11:21:57');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (21, 11, 'Lona estándar', 2, 1, 0, 20000, 'Lona computadora', '[]', 1, NULL, '2026-02-23 11:21:57');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (22, 12, 'Lona estándar', 3, 1.5, 0, 45000, 'de su cara', '[]', 1, NULL, '2026-02-23 23:28:59');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (23, 13, 'Talonario 1/2 Oficio x Duplicado', 0, 0, 0, 58500, 'El gauchito', '[]', 1, NULL, '2026-02-23 23:53:55');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (24, 14, '1/2 Oficio Logo Color', 0, 0, 0, 24000, 'Sin descripción', '[]', 1, NULL, '2026-02-23 23:55:39');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (25, 15, '1/2 Oficio Logo Color', 0, 0, 0, 24000, 'Sin descripción', '[]', 1, NULL, '2026-02-24 00:08:00');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (26, 16, 'Lona Back', 2, 1, 0, 28000, 'Sin descripción', '[]', 1, NULL, '2026-02-24 00:11:48');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (27, 16, 'Entradas Full Color', 0, 0, 0, 32000, 'Sin descripción', '[]', 1, NULL, '2026-02-24 00:11:48');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (28, 17, 'A4 Logo Color', 0, 0, 0, 20000, 'Sin descripción', '[]', 1, NULL, '2026-02-24 00:25:24');
INSERT INTO productos (id, pedido_id, material, ancho, alto, descuento, precio, descripcion, imagenes, cantidad, precio_unitario, created_at) VALUES (29, 17, 'Carátula A/L', 0, 0, 0, 3500, 'Sin descripción', '[]', 1, NULL, '2026-02-24 00:25:24');

INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (1, 'ingreso', 'Pago Pedido #1 - Juan Bravo', 'Ventas - Pago de Pedido', 49000, 'Efectivo', NULL, NULL, '2026-02-22 21:28:33', NULL, '2026-02-22 21:28:33');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (2, 'ingreso', 'Pago Pedido #4 - Juan Bravo', 'Ventas - Pago de Pedido', 21500, 'Transferencia', NULL, NULL, '2026-02-22 21:43:09', NULL, '2026-02-22 21:43:09');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (3, 'ingreso', 'Fotocopia', 'Ventas - Pago de Pedido', 5000, 'Efectivo', NULL, NULL, '2026-02-22 22:01:26', NULL, '2026-02-22 22:01:26');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (4, 'egreso', 'Pichulo', 'Otros', 12000, 'Efectivo', NULL, NULL, '2026-02-22 22:01:40', NULL, '2026-02-22 22:01:40');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (5, 'ingreso', 'Pago Pedido #6 - Juan Bravo', 'Ventas - Pago de Pedido', 10000, 'Tarjeta', NULL, NULL, '2026-02-22 22:14:43', NULL, '2026-02-22 22:14:43');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (6, 'ingreso', 'Copias', 'Ventas - Pago de Pedido', 13000, 'Efectivo', NULL, NULL, '2026-02-22 22:36:27', NULL, '2026-02-22 22:36:27');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (7, 'egreso', 'devolucion trabajo Ines', 'Devoluciones', 15000, 'Transferencia', NULL, NULL, '2026-02-22 22:36:53', NULL, '2026-02-22 22:36:53');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (8, 'ingreso', 'Fotocopia', 'Ventas', 5000, 'Efectivo', NULL, NULL, '2026-02-23 11:28:37', NULL, '2026-02-23 11:28:37');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (9, 'ingreso', 'aaa', 'Ventas', 10000, 'QR', NULL, NULL, '2026-02-23 11:28:51', NULL, '2026-02-23 11:28:51');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (10, 'ingreso', 'Adelanto Pedido #13 - Cliente', 'Ventas - Adelanto', 5000, 'QR', 13, NULL, '2026-02-23 23:53:55', NULL, '2026-02-23 23:53:55');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (11, 'ingreso', 'Adelanto Pedido #14 - Cliente', 'Ventas - Adelanto', 2000, 'Efectivo', 14, NULL, '2026-02-23 23:55:39', NULL, '2026-02-23 23:55:39');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (12, 'ingreso', 'Adelanto Pedido #15 - Cliente', 'Ventas - Adelanto', 2000, 'Efectivo', 15, NULL, '2026-02-24 00:08:00', NULL, '2026-02-24 00:08:00');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (13, 'ingreso', 'Pago Pedido #3 - Juan Bravo', 'Ventas - Pago de Pedido', 63000, 'QR', NULL, NULL, '2026-02-24 00:09:57', NULL, '2026-02-24 00:09:57');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (14, 'ingreso', 'Adelanto Pedido #16 - Cliente', 'Ventas - Adelanto', 20000, 'Tarjeta', 16, NULL, '2026-02-24 00:11:48', NULL, '2026-02-24 00:11:48');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (15, 'ingreso', 'Adelanto Pedido #17 - Beto', 'Ventas - Adelanto', 13500, 'Efectivo', 17, NULL, '2026-02-24 00:25:24', NULL, '2026-02-24 00:25:24');
INSERT INTO movimientos_caja (id, tipo, concepto, categoria, monto, metodo_pago, pedido_id, usuario_id, fecha, notas, created_at) VALUES (16, 'egreso', 'Devolución - Pedido #12 Cancelado', 'Devoluciones', 10000, 'Efectivo', 12, NULL, '2026-02-24 00:29:54', NULL, '2026-02-24 00:29:54');

INSERT INTO presupuesto_items (id, presupuesto_id, producto_id, descripcion, cantidad, ancho, alto, precio_unitario, descuento_item, subtotal, fecha_creacion) VALUES (1, 1, 2, 'Lona premium', 1, NULL, NULL, 15000, 0, 15000, '2026-02-22 21:05:20');
INSERT INTO presupuesto_items (id, presupuesto_id, producto_id, descripcion, cantidad, ancho, alto, precio_unitario, descuento_item, subtotal, fecha_creacion) VALUES (2, 2, 3, 'Fotocopia B/N', 100, NULL, NULL, 500, 0, 50000, '2026-02-22 21:31:29');
INSERT INTO presupuesto_items (id, presupuesto_id, producto_id, descripcion, cantidad, ancho, alto, precio_unitario, descuento_item, subtotal, fecha_creacion) VALUES (3, 2, 1, 'Lona estándar', 1.3, NULL, NULL, 10000, 0, 13000, '2026-02-22 21:31:29');
INSERT INTO presupuesto_items (id, presupuesto_id, producto_id, descripcion, cantidad, ancho, alto, precio_unitario, descuento_item, subtotal, fecha_creacion) VALUES (4, 3, 3, 'Fotocopia B/N', 100, NULL, NULL, 500, 0, 50000, '2026-02-22 21:44:45');
INSERT INTO presupuesto_items (id, presupuesto_id, producto_id, descripcion, cantidad, ancho, alto, precio_unitario, descuento_item, subtotal, fecha_creacion) VALUES (5, 3, 1, 'Lona estándar', 1, NULL, NULL, 10000, 0, 10000, '2026-02-22 21:44:45');
INSERT INTO presupuesto_items (id, presupuesto_id, producto_id, descripcion, cantidad, ancho, alto, precio_unitario, descuento_item, subtotal, fecha_creacion) VALUES (8, 4, NULL, 'Impresión digital', 15, NULL, NULL, 5000, 0, 75000, '2026-02-22 22:31:43');
INSERT INTO presupuesto_items (id, presupuesto_id, producto_id, descripcion, cantidad, ancho, alto, precio_unitario, descuento_item, subtotal, fecha_creacion) VALUES (9, 4, NULL, 'Lona premium', 3, NULL, NULL, 15000, 0, 45000, '2026-02-22 22:31:43');
INSERT INTO presupuesto_items (id, presupuesto_id, producto_id, descripcion, cantidad, ancho, alto, precio_unitario, descuento_item, subtotal, fecha_creacion) VALUES (10, 5, 4, 'Fotocopia color', 20, NULL, NULL, 2000, 0, 40000, '2026-02-23 11:26:04');
INSERT INTO presupuesto_items (id, presupuesto_id, producto_id, descripcion, cantidad, ancho, alto, precio_unitario, descuento_item, subtotal, fecha_creacion) VALUES (11, 5, 1, 'Lona estándar', 3, NULL, NULL, 10000, 0, 30000, '2026-02-23 11:26:04');

INSERT INTO clients (id, name, address, phone, email, cuit, created_at) VALUES (1, 'Juan Bravo', '', '3878441387', '', '20-12345678-9', '2026-02-22 20:58:32');
INSERT INTO clients (id, name, address, phone, email, cuit, created_at) VALUES (2, 'Rosana', '', '3878455991', '', '27179131779', '2026-02-22 21:12:22');
INSERT INTO clients (id, name, address, phone, email, cuit, created_at) VALUES (3, 'Gustavo Andres Bravo', 'Pellegrini 128', '3872105905', 'gandresbravo90@gmail.com', '20347213838', '2026-02-22 22:12:19');
INSERT INTO clients (id, name, address, phone, email, cuit, created_at) VALUES (4, 'Pepe', '', '3878455991', '', NULL, '2026-02-22 22:31:48');
INSERT INTO clients (id, name, address, phone, email, cuit, created_at) VALUES (5, 'Beto', '', '3878441387', '', '', '2026-02-24 00:25:24');

INSERT INTO sqlite_sequence (name, seq) VALUES ('users', 6);
INSERT INTO sqlite_sequence (name, seq) VALUES ('catalogo_productos', 78);
INSERT INTO sqlite_sequence (name, seq) VALUES ('clients', 5);
INSERT INTO sqlite_sequence (name, seq) VALUES ('presupuestos', 5);
INSERT INTO sqlite_sequence (name, seq) VALUES ('presupuesto_items', 11);
INSERT INTO sqlite_sequence (name, seq) VALUES ('pedidos', 17);
INSERT INTO sqlite_sequence (name, seq) VALUES ('productos', 29);
INSERT INTO sqlite_sequence (name, seq) VALUES ('movimientos_caja', 16);

