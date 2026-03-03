// server.js
require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const flash          = require('connect-flash');
const path           = require('path');
const fs             = require('fs');
const expressLayouts = require('express-ejs-layouts');
const rateLimit      = require('express-rate-limit');
const csrf           = require('csurf');

// Swagger UI deshabilitado (archivo openapi.yaml removido)
// const swaggerUi       = require('swagger-ui-express');
// const YAML            = require('yamljs');
// const swaggerDocument = YAML.load(path.join(__dirname, 'spec/openapi.yaml'));

const initDbPromise      = require('./config/db');
const initCajaController = require('./controllers/cajaController');
const authMiddleware     = require('./middleware/authMiddleware');
const permitirRoles      = require('./middleware/roles');
const checkPermission    = require('./middleware/permissions');

const app = express();

// ════════════════════════════════════════════════════════════════
// CONFIGURACIÓN BÁSICA
// ════════════════════════════════════════════════════════════════

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.locals.basedir = app.get('views');

app.use(session({
    secret: process.env.SESSION_SECRET || 'default_unsafe_secret_change_env',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
    }
}));
app.use(flash());

// CSRF Protection middleware
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);

// ════════════════════════════════════════════════════════════════
// VARIABLES GLOBALES PARA VISTAS
// ════════════════════════════════════════════════════════════════

app.use((req, res, next) => {
    res.locals.error       = req.flash('error')   || [];
    res.locals.success     = req.flash('success') || [];
    res.locals.user        = req.session.user     || null;
    res.locals.currentPath = req.path;
    res.locals.csrfToken   = req.csrfToken();
    res.locals.empresaTel  = '3878224908'; // Teléfono de la empresa
    next();
});

// ════════════════════════════════════════════════════════════════
// NAVBAR DINÁMICO POR ROL
// ════════════════════════════════════════════════════════════════

app.use((req, res, next) => {
    const rol = res.locals.user?.rol || null;

    const allPages = [
        { name: 'home',          label: 'Inicio',       url: '/',              icon: 'bi-house-fill',     roles: ['admin','vendedor','operador','empleado','recepcionista'] },
        { name: 'clientes',      label: 'Clientes',     url: '/clientes',      icon: 'bi-people-fill',    roles: ['admin','vendedor','recepcionista'] },
        { name: 'pedidos',       label: 'Pedidos',      url: '/pedidos',       icon: 'bi-kanban-fill',    roles: ['admin','vendedor','operador','empleado','recepcionista'] },
        { name: 'presupuestos',  label: 'Presupuestos', url: '/presupuestos',  icon: 'bi-calculator',     roles: ['admin','vendedor','empleado','recepcionista'] },
        { name: 'catalogo',      label: 'Catálogo',     url: '/catalogo',      icon: 'bi-card-list',      roles: ['admin','vendedor','operador','empleado','recepcionista'] },
        { name: 'proveedores',   label: 'Proveedores',  url: '/proveedores',   icon: 'bi-truck',          roles: ['admin'] },
        { name: 'stock',         label: 'Stock',        url: '/stock',         icon: 'bi-boxes',          roles: ['admin'] },
        { name: 'gastos',        label: 'Gastos',       url: '/gastos',        icon: 'bi-receipt',        roles: ['admin'] },
        { name: 'caja-diaria',   label: 'Caja',         url: '/caja-diaria',   icon: 'bi-cash-coin',      roles: ['admin','vendedor','empleado','recepcionista'] },
        { name: 'reportes',      label: 'Reportes',     url: '/reportes',      icon: 'bi-bar-chart-fill', roles: ['admin'] },
        { name: 'usuarios',      label: 'Usuarios',     url: '/usuarios',      icon: 'bi-gear-fill',      roles: ['admin'] },
    ];

    res.locals.pages      = rol ? allPages.filter(p => p.roles.includes(rol)) : [];
    res.locals.activePage = req.path === '/' ? 'home' : req.path.slice(1).replace(/\//g, '-');
    next();
});

// ════════════════════════════════════════════════════════════════
// DOCUMENTACIÓN Y ARCHIVOS ESTÁTICOS
// ════════════════════════════════════════════════════════════════

// Swagger UI deshabilitado
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(path.join(uploadsDir, 'thumbs'))) fs.mkdirSync(path.join(uploadsDir, 'thumbs'), { recursive: true });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

app.get('/pedidos/revision/descargar/:filename', async (req, res) => {
    const filePath = path.join(__dirname, 'public', 'uploads', req.params.filename);
    res.download(filePath);
});

// ════════════════════════════════════════════════════════════════
// INICIALIZAR SERVIDOR
// ════════════════════════════════════════════════════════════════

async function startServer() {
    let dbInstance;
    try {
        dbInstance = await initDbPromise;
        console.log("✅ Base de datos lista.");
    } catch (error) {
        console.error("❌ Error de base de datos:", error);
        process.exit(1);
    }

    // ────────────────────────────────────────────────────────────────────
    // CARGAR CONTROLADORES Y RUTAS
    // ────────────────────────────────────────────────────────────────────

    const cajaController               = initCajaController(dbInstance);
    const authRouterConfigured         = require('./routes/auth')(dbInstance);
    const clientesRouterConfigured     = require('./routes/clientes')(dbInstance);
    const apiClientesRouterConfigured  = require('./routes/api/clientes')(dbInstance);
    const apiProductosRouterConfigured = require('./routes/api/productos')(dbInstance);
    const apiAutocompleteConfigured    = require('./routes/api/autocomplete')(dbInstance);
    const apiPedidosRouterConfigured   = require('./routes/api/pedidos')(dbInstance);
    const productosRouterConfigured    = require('./routes/productos')(dbInstance);
    const pedidosRouterConfigured      = require('./routes/pedidos')(dbInstance);
    const usuariosRouterConfigured     = require('./routes/usuarios')(dbInstance);
    const presupuestosRouterConfigured = require('./routes/presupuestos')(dbInstance);
    const catalogoRouterConfigured     = require('./routes/catalogo')(dbInstance);
    const proveedoresRouterConfigured  = require('./routes/proveedores')(dbInstance);
    const stockRouterConfigured        = require('./routes/stock')(dbInstance);
    const gastosRouterConfigured       = require('./routes/gastos')(dbInstance);
    const reportesRouterConfigured     = require('./routes/reportes')(dbInstance);
    const dashboardRouterConfigured    = require('./routes/dashboard')(dbInstance);
    const deudasRouterConfigured       = require('./routes/deudas')(dbInstance);

    // ────────────────────────────────────────────────────────────────────
    // APIS INTERNAS (Autocomplete, etc)
    // ────────────────────────────────────────────────────────────────────

    app.use('/api/clientes',     apiClientesRouterConfigured);
    app.use('/api/productos',    apiProductosRouterConfigured);
    app.use('/api/autocomplete', apiAutocompleteConfigured);
    app.use('/api/pedidos',      apiPedidosRouterConfigured);

    // ────────────────────────────────────────────────────────────────────
    // AUTH (Público) - Con protección de rate limiting
    // ────────────────────────────────────────────────────────────────────

    // Rate limiting: máximo 5 intentos de login por 15 minutos
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 5,                    // 5 intentos máximo
        message: 'Demasiados intentos de login. Intenta más tarde.',
        standardHeaders: true,
        legacyHeaders: false,
    });

    app.post('/auth/login', loginLimiter);
    app.use('/auth', authRouterConfigured);

    // ────────────────────────────────────────────────────────────────────
    // RUTAS PÚBLICAS (sin login)
    // ────────────────────────────────────────────────────────────────────

    // Formulario público de presupuesto (para clientes externos)
    const presupuestosControllerPublico = require('./controllers/presupuestosController')(dbInstance);
    const upload = require('./config/multer');
    app.get('/presupuestos/publico', presupuestosControllerPublico.formPresupuestoPublico);
    app.post('/presupuestos/publico', csrfProtection, upload.single('archivo_imagen'), presupuestosControllerPublico.recibirPresupuestoPublico);

    // ────────────────────────────────────────────────────────────────────
    // RUTAS PROTEGIDAS
    // ────────────────────────────────────────────────────────────────────

    app.use('/dashboard', authMiddleware.isAuthenticated, permitirRoles('admin','vendedor'), dashboardRouterConfigured);
    app.use('/clientes',     permitirRoles('admin','vendedor','recepcionista'), clientesRouterConfigured);
    app.use('/pedidos',      permitirRoles('admin','vendedor','operador','empleado','recepcionista'), pedidosRouterConfigured);
    app.use('/usuarios',     permitirRoles('admin'),                       usuariosRouterConfigured);
    app.use('/presupuestos', permitirRoles('admin','vendedor','empleado','recepcionista'), presupuestosRouterConfigured);
    app.use('/catalogo',     permitirRoles('admin','vendedor','operador','empleado','recepcionista'), catalogoRouterConfigured);
    app.use('/productos',    permitirRoles('admin','vendedor'),            productosRouterConfigured);
    app.use('/proveedores',  permitirRoles('admin'),                       proveedoresRouterConfigured);
    app.use('/stock',        permitirRoles('admin'),                       stockRouterConfigured);
    app.use('/gastos',       permitirRoles('admin'),                       gastosRouterConfigured);
    app.use('/reportes',     permitirRoles('admin','vendedor'),                       reportesRouterConfigured);
    app.use('/deudas',       permitirRoles('admin'),                       deudasRouterConfigured);

    // ────────────────────────────────────────────────────────────────────
    // CAJA DIARIA
    // ────────────────────────────────────────────────────────────────────

    // ⚠️ IMPORTANTE: Rutas POST primero, luego el GET (app.use)
    // Si app.use() va primero, intercepta todos los requests y no deja llegar a POST

    app.post('/caja-diaria/agregar',
        authMiddleware.isAuthenticated,
        permitirRoles('admin','vendedor','empleado','recepcionista','operador'),
        async (req, res, next) => {
            return cajaController.agregarMovimiento(req, res);
        }
    );
    app.post('/caja-diaria/eliminar/:id',
        authMiddleware.isAuthenticated,
        permitirRoles('admin'),
        async (req, res, next) => {
            return cajaController.eliminarMovimiento(req, res);
        }
    );
    app.post('/caja-diaria/:id/editar',
        authMiddleware.isAuthenticated,
        permitirRoles('admin','vendedor','empleado','recepcionista','operador'),
        async (req, res, next) => {
            return cajaController.editarMovimiento(req, res);
        }
    );

    app.use('/caja-diaria',
        authMiddleware.isAuthenticated,
        permitirRoles('admin','vendedor','empleado','recepcionista','operador'),
        async (req, res, next) => {
            // Flag para mostrar/ocultar números contables: solo admin ve los números
            res.locals.puedeVerNumeros = req.session.user?.rol === 'admin';
            return cajaController.mostrarCajaDiaria(req, res);
        }
    );

    // ────────────────────────────────────────────────────────────────────
    // DASHBOARD PRINCIPAL
    // ────────────────────────────────────────────────────────────────────

    app.get('/', authMiddleware.isAuthenticated, async (req, res) => {
        try {
            const hoy = new Date().toISOString().slice(0, 10);

            const counts = {
                pendientes:    (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'PENDIENTE'"))?.c || 0,
                en_produccion: (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'EN_PRODUCCION'"))?.c || 0,
                listos:        (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'LISTO'"))?.c || 0,
                entregados:    (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'ENTREGADO'"))?.c || 0,
                presupuestos:  (await dbInstance.get("SELECT COUNT(*) AS c FROM presupuestos WHERE estado = 'PENDIENTE'"))?.c || 0,
                clientes:      (await dbInstance.get("SELECT COUNT(*) AS c FROM clients"))?.c || 0,
            };

            const ingresosHoy = (await dbInstance.get(
                "SELECT COALESCE(SUM(monto),0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) = ?", hoy
            ))?.total || 0;

            const inicioMes = new Date(); inicioMes.setDate(1);
            const ingresosMes = (await dbInstance.get(
                "SELECT COALESCE(SUM(monto),0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) >= ?",
                inicioMes.toISOString().slice(0, 10)
            ))?.total || 0;

            const deudores = await dbInstance.all(`
                SELECT p.id, p.precio, p.monto_restante, p.estado,
                       c.name AS cliente_nombre, c.phone
                FROM pedidos p
                LEFT JOIN clients c ON p.client_id = c.id
                WHERE p.monto_restante > 0
                ORDER BY p.monto_restante DESC LIMIT 5
            `) || [];

            const stockBajo = await dbInstance.all(`
                SELECT s.id, s.nombre, s.cantidad, s.stock_minimo, s.unidad
                FROM stock s
                WHERE s.cantidad <= s.stock_minimo
                ORDER BY s.cantidad ASC LIMIT 5
            `) || [];

            const ultimosPedidos = await dbInstance.all(`
                SELECT p.id, p.precio, p.estado, p.fecha,
                       c.name AS cliente_nombre
                FROM pedidos p
                LEFT JOIN clients c ON p.client_id = c.id
                ORDER BY p.fecha DESC LIMIT 10
            `) || [];

            // Deudas vencidas (solo admin puede verlas)
            let deudasVencidas = [];
            if (req.session.user?.rol === 'admin') {
                deudasVencidas = await dbInstance.all(`
                    SELECT 'cheque' AS tipo, numero_cheque AS descripcion, monto, fecha_vencimiento
                    FROM deudas_cheques
                    WHERE estado = 'pendiente' AND date(fecha_vencimiento) < date('now')
                    UNION ALL
                    SELECT 'proveedor', concepto, (monto_total - monto_pagado), fecha_vencimiento
                    FROM deudas_proveedores
                    WHERE estado != 'pagado' AND fecha_vencimiento IS NOT NULL
                      AND date(fecha_vencimiento) < date('now')
                    ORDER BY fecha_vencimiento ASC
                    LIMIT 5
                `) || [];
            }

            // Deudas próximas (próximos 7 días)
            let deudasProximas = [];
            if (req.session.user?.rol === 'admin') {
                deudasProximas = await dbInstance.all(`
                    SELECT 'cheque' AS tipo, numero_cheque AS descripcion, monto, fecha_vencimiento
                    FROM deudas_cheques
                    WHERE estado = 'pendiente'
                      AND date(fecha_vencimiento) >= date('now')
                      AND date(fecha_vencimiento) <= date('now', '+7 days')
                    UNION ALL
                    SELECT 'proveedor', concepto, (monto_total - monto_pagado), fecha_vencimiento
                    FROM deudas_proveedores
                    WHERE estado != 'pagado' AND fecha_vencimiento IS NOT NULL
                      AND date(fecha_vencimiento) >= date('now')
                      AND date(fecha_vencimiento) <= date('now', '+7 days')
                    ORDER BY fecha_vencimiento ASC
                    LIMIT 5
                `) || [];
            }

            const isEmpleado = req.session.user?.rol === 'empleado';
            const isRecepcionista = req.session.user?.rol === 'recepcionista';
            res.render('home', {
                title: 'Panel Principal',
                counts,
                ingresosHoy,
                ingresosMes,
                deudores,
                stockBajo,
                ultimosPedidos,
                deudasVencidas,
                deudasProximas,
                isEmpleado,
                isRecepcionista
            });
        } catch (err) {
            console.error('Error en dashboard:', err);
            const isEmpleado = req.session.user?.rol === 'empleado';
            const isRecepcionista = req.session.user?.rol === 'recepcionista';
            res.render('home', {
                title: 'Panel Principal',
                counts: {},
                ingresosHoy: 0,
                ingresosMes: 0,
                deudores: [],
                stockBajo: [],
                ultimosPedidos: [],
                isEmpleado,
                isRecepcionista
            });
        }
    });

    // ────────────────────────────────────────────────────────────────────
    // 404
    // ────────────────────────────────────────────────────────────────────

    app.use((_, res) => res.status(404).render('404', { title: 'Página no encontrada' }));

    // ────────────────────────────────────────────────────────────────────
    // INICIAR SERVIDOR
    // ────────────────────────────────────────────────────────────────────

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => console.log(`\n✅ Server corriendo en http://localhost:${PORT}\n`));
}

startServer();



