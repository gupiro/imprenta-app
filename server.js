// server.js
require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const cookieParser   = require('cookie-parser');
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
const { calcularFechaVencTarjeta, calcularProximaCuota, diasHasta, calcularPrioridad } = require('./utils/pagosHelper');

const app = express();

// ════════════════════════════════════════════════════════════════
// CONFIGURACIÓN BÁSICA
// ════════════════════════════════════════════════════════════════

// Trust proxy - IMPORTANTE para Render (usa proxy reverso)
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
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
    res.locals.csrfToken   = req.csrfToken ? req.csrfToken() : '';
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
        { name: 'pagos',         label: '💳 Centro Pagos', url: '/pagos',       icon: 'bi-calendar-check', roles: ['admin'] },
        { name: 'gastos',        label: '💰 Gastos',      url: '/gastos',      icon: 'bi-receipt',        roles: ['admin'] },
        { name: 'proveedores',   label: 'Proveedores',  url: '/proveedores',   icon: 'bi-truck',          roles: ['admin'] },
        { name: 'stock',         label: 'Stock',        url: '/stock',         icon: 'bi-boxes',          roles: ['admin'] },
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

// ✅ File download con validación y autenticación
app.get('/pedidos/revision/descargar/:filename', authMiddleware.isAuthenticated, async (req, res) => {
    // Validar que filename solo contiene caracteres seguros (prevenir path traversal)
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return res.status(400).send('❌ Nombre de archivo inválido');
    }

    const filePath = path.join(__dirname, 'public', 'uploads', filename);

    // Verificar que el archivo existe y está dentro de uploads/
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);

    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
        return res.status(403).send('❌ Acceso denegado');
    }

    res.download(filePath, (err) => {
        if (err && err.code === 'ENOENT') {
            res.status(404).send('❌ Archivo no encontrado');
        }
    });
});

// ════════════════════════════════════════════════════════════════
// INICIALIZAR SERVIDOR
// ════════════════════════════════════════════════════════════════

async function startServer() {
    // ✅ Validar SESSION_SECRET antes de cualquier otra cosa
    const SESSION_SECRET = process.env.SESSION_SECRET;
    if (!SESSION_SECRET || SESSION_SECRET === 'default_unsafe_secret_change_env') {
        console.error(
            '\n❌ ═══════════════════════════════════════════════════════════════════\n' +
            '   FATAL ERROR: SESSION_SECRET no configurado correctamente\n' +
            '═══════════════════════════════════════════════════════════════════\n' +
            '   El servidor no puede iniciarse de forma segura sin un SESSION_SECRET\n' +
            '   configurado en las variables de entorno.\n\n' +
            '   Acciones:\n' +
            '   1. En producción (Render): Establecer SESSION_SECRET en env variables\n' +
            '   2. En desarrollo: Crear .env con SESSION_SECRET=<valor_seguro>\n' +
            '   3. Usar una cadena aleatoria de 32+ caracteres\n' +
            '═══════════════════════════════════════════════════════════════════\n'
        );
        process.exit(1);
    }
    console.log("✅ SESSION_SECRET validado correctamente");

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
    const iaApiRouterConfigured        = require('./routes/api/ia')(dbInstance);
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
    const pagosRouterConfigured        = require('./routes/pagos')(dbInstance);
    const finanzasRouterConfigured     = require('./routes/finanzas')(dbInstance);
    const guiaRouterConfigured         = require('./routes/guia')(dbInstance);

    // ────────────────────────────────────────────────────────────────────
    // APIS INTERNAS (Autocomplete, etc)
    // ────────────────────────────────────────────────────────────────────

    app.use('/api/clientes',     apiClientesRouterConfigured);
    app.use('/api/productos',    apiProductosRouterConfigured);
    app.use('/api/autocomplete', apiAutocompleteConfigured);
    app.use('/api/pedidos',      apiPedidosRouterConfigured);
    app.use('/api/ia',           authMiddleware.isAuthenticated, iaApiRouterConfigured);

    // ════════════════════════════════════════════════════════════════
    // SEMÁFORO FINANCIERO
    // ════════════════════════════════════════════════════════════════
    app.get('/api/semaforo', authMiddleware.isAuthenticated, async (req, res) => {
        const rol = req.session.user?.rol;
        if (!['admin', 'vendedor'].includes(rol)) return res.json({ mostrar: false });
        try {
            const now = new Date();
            const fechaInicio = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

            const ingresos = (await dbInstance.get(
                "SELECT COALESCE(SUM(monto),0) AS total FROM movimientos_caja WHERE tipo='ingreso' AND SUBSTR(fecha,1,10) >= ?",
                [fechaInicio]
            ))?.total || 0;

            const gastos = (await dbInstance.get(
                `SELECT COALESCE(SUM(monto),0) AS total FROM (
                   SELECT monto FROM movimientos_caja WHERE tipo='egreso' AND SUBSTR(fecha,1,10) >= ?
                   UNION ALL
                   SELECT monto FROM gastos WHERE SUBSTR(fecha,1,10) >= ?
                 )`, [fechaInicio, fechaInicio]
            ))?.total || 0;

            const diferencia = ingresos - gastos;
            const porcentaje = ingresos > 0 ? Math.abs(diferencia / ingresos) * 100 : 0;

            let color = 'success';
            if (diferencia < 0) color = 'danger';
            else if (porcentaje <= 15) color = 'warning';

            const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
            const tooltip = diferencia >= 0
                ? `Ingresos: ${fmt(ingresos)} · Gastos: ${fmt(gastos)} · Ganancia: ${fmt(diferencia)}`
                : `Ingresos: ${fmt(ingresos)} · Gastos: ${fmt(gastos)} · Pérdida: ${fmt(Math.abs(diferencia))}`;

            res.json({ mostrar: true, color, tooltip });
        } catch(e) {
            console.error('Error en /api/semaforo:', e.message);
            res.json({ mostrar: false });
        }
    });

    // GET /api/caja-movimientos - Obtener movimientos del día (con zona horaria correcta)
    app.get('/api/caja-movimientos', authMiddleware.isAuthenticated, async (req, res) => {
        try {
            const { obtenerFechaLocal } = require('./utils/dateHelper');
            const hoy = obtenerFechaLocal().fecha;
            const movimientos = await dbInstance.all(
                `SELECT id, tipo, concepto, monto, metodo_pago, turno, fecha, categoria
                 FROM movimientos_caja
                 WHERE (
                    DATE(fecha) = ? OR
                    DATE(fecha, 'localtime') = ? OR
                    SUBSTR(fecha, 1, 10) = ?
                 )
                 ORDER BY fecha DESC`,
                [hoy, hoy, hoy]
            ) || [];

            res.json(movimientos);
        } catch(e) {
            console.error('Error en /api/caja-movimientos:', e.message);
            res.status(500).json({ error: e.message });
        }
    });

    // GET /caja-diaria/exportar - Exportar movimientos a CSV
    app.get('/caja-diaria/exportar', authMiddleware.isAuthenticated, async (req, res) => {
        try {
            const { obtenerFechaLocal } = require('./utils/dateHelper');
            const fecha = req.query.fecha || obtenerFechaLocal().fecha;
            const turno = req.query.turno || ''; // 'mañana', 'tarde', o vacío para ambos

            console.log('📥 Exportando Caja:', { fecha, turno });

            let query = `
                SELECT tipo, concepto, monto, metodo_pago, turno, fecha, categoria
                FROM movimientos_caja
                WHERE (
                    DATE(fecha) = ? OR
                    DATE(fecha, 'localtime') = ? OR
                    SUBSTR(fecha, 1, 10) = ?
                )
            `;
            const params = [fecha, fecha, fecha];

            if (turno) {
                query += ' AND turno = ?';
                params.push(turno);
            }

            query += ' ORDER BY fecha DESC';

            const movimientos = await dbInstance.all(query, params) || [];
            console.log(`📊 Encontrados ${movimientos.length} movimientos`);

            if (movimientos.length === 0) {
                // Si no encuentra con esa query, intentar más simple
                console.log('⚠️ No hay movimientos, intentando query alternativa...');
                const movimientosAlt = await dbInstance.all(
                    `SELECT tipo, concepto, monto, metodo_pago, turno, fecha, categoria
                     FROM movimientos_caja
                     WHERE SUBSTR(fecha, 1, 10) = ?
                     ${turno ? 'AND turno = ?' : ''}
                     ORDER BY fecha DESC`,
                    turno ? [fecha, turno] : [fecha]
                ) || [];
                console.log(`📊 Consulta alternativa: ${movimientosAlt.length} movimientos`);
                if (movimientosAlt.length > 0) {
                    movimientos.push(...movimientosAlt);
                }
            }

            // Calcular totales
            let totalIngresos = 0, totalEgresos = 0;
            movimientos.forEach(m => {
                if (m.tipo === 'ingreso') totalIngresos += m.monto;
                else totalEgresos += m.monto;
            });

            // Generar CSV
            const headers = ['Tipo', 'Concepto', 'Monto', 'Método de Pago', 'Turno', 'Fecha', 'Categoría'];
            const rows = movimientos.map(m => [
                m.tipo.toUpperCase(),
                m.concepto,
                m.monto.toFixed(2),
                m.metodo_pago || '-',
                m.turno || '-',
                new Date(m.fecha).toLocaleString('es-AR'),
                m.categoria || '-'
            ]);

            // Agregar totales
            rows.push([]);
            rows.push(['INGRESOS', '', totalIngresos.toFixed(2)]);
            rows.push(['EGRESOS', '', totalEgresos.toFixed(2)]);
            rows.push(['SALDO', '', (totalIngresos - totalEgresos).toFixed(2)]);

            const csv = [headers, ...rows].map(row =>
                row.map(cell => `"${cell}"`).join(',')
            ).join('\n');

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="Caja-${fecha}${turno ? '-' + turno : ''}.csv"`);
            res.send('\uFEFF' + csv); // BOM para Excel con UTF-8
        } catch(e) {
            console.error('Error en exportar caja:', e.message);
            res.status(500).json({ error: e.message });
        }
    });

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
    app.post('/presupuestos/publico', upload.single('archivo_imagen'), presupuestosControllerPublico.recibirPresupuestoPublico);

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
    app.use('/reportes',     permitirRoles('admin'),                       reportesRouterConfigured);
    app.use('/deudas',       permitirRoles('admin'),                       deudasRouterConfigured);
    app.use('/pagos',        permitirRoles('admin'),                       pagosRouterConfigured);
    app.use('/finanzas',     permitirRoles('admin'),                       finanzasRouterConfigured);
    app.use('/guia',         permitirRoles('admin','vendedor'),            guiaRouterConfigured);

    // ────────────────────────────────────────────────────────────────────
    // ADMIN - IMPORTACIÓN DE DATOS
    // ────────────────────────────────────────────────────────────────────
    const adminImportRouterConfigured = require('./routes/admin-import')(dbInstance);
    app.use('/', authMiddleware.isAuthenticated, adminImportRouterConfigured);

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

    app.post('/caja-diaria/cerrar-turno',
        authMiddleware.isAuthenticated,
        permitirRoles('admin','vendedor','empleado','recepcionista','operador'),
        async (req, res, next) => {
            return cajaController.cerrarTurno(req, res);
        }
    );

    app.post('/caja-diaria/reabrir-turno',
        authMiddleware.isAuthenticated,
        permitirRoles('admin'),
        async (req, res, next) => {
            return cajaController.reabrirTurno(req, res);
        }
    );

    app.use('/caja-diaria',
        authMiddleware.isAuthenticated,
        permitirRoles('admin','vendedor','empleado','recepcionista','operador'),
        async (req, res, next) => {
            // Flag para mostrar/ocultar números contables: únicamente admin ve totales/desglose
            res.locals.puedeVerNumeros = req.session.user?.rol === 'admin';
            res.locals.user = req.session.user;
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

            // Próximos 5 vencimientos (solo admin)
            let proximos5Vencimientos = [];
            if (req.session.user?.rol === 'admin') {
                // Cheques pendientes
                const cheques = await dbInstance.all(`
                    SELECT 'cheque' AS source_tipo, id, numero_cheque AS titulo,
                           monto, fecha_vencimiento, banco AS subtitulo, estado
                    FROM deudas_cheques
                    WHERE estado = 'pendiente'
                `) || [];

                // Proveedores pendientes
                const proveedores = await dbInstance.all(`
                    SELECT 'proveedor' AS source_tipo, dp.id,
                           COALESCE(p.nombre, 'Sin proveedor') || ' - ' || dp.concepto AS titulo,
                           (dp.monto_total - dp.monto_pagado) AS monto,
                           dp.fecha_vencimiento, dp.concepto AS subtitulo, dp.estado
                    FROM deudas_proveedores dp
                    LEFT JOIN proveedores p ON dp.proveedor_id = p.id
                    WHERE dp.estado != 'pagado'
                `) || [];

                // Préstamos activos
                const prestamosRaw = await dbInstance.all(`
                    SELECT 'prestamo' AS source_tipo, id, descripcion AS titulo,
                           cuota_mensual AS monto, dia_vencimiento_mensual,
                           entidad AS subtitulo, estado
                    FROM deudas_prestamos
                    WHERE estado = 'activo'
                `) || [];

                // Tarjetas activas
                const tarjetasRaw = await dbInstance.all(`
                    SELECT 'tarjeta' AS source_tipo, id, nombre_tarjeta AS titulo,
                           monto_minimo AS monto, fecha_vencimiento,
                           'Tarjeta' AS subtitulo, estado
                    FROM deudas_tarjetas
                    WHERE estado = 'activa'
                `) || [];

                // Enriquecer cheques y proveedores (ya tienen fecha completa)
                const chequesMejorados = cheques.map(c => ({
                    ...c,
                    fecha_calculada: c.fecha_vencimiento ? new Date(c.fecha_vencimiento) : null,
                    dias_restantes: diasHasta(c.fecha_vencimiento),
                    prioridad: calcularPrioridad(diasHasta(c.fecha_vencimiento))
                }));

                const proveedoresMejorados = proveedores.map(p => ({
                    ...p,
                    fecha_calculada: p.fecha_vencimiento ? new Date(p.fecha_vencimiento) : null,
                    dias_restantes: diasHasta(p.fecha_vencimiento),
                    prioridad: calcularPrioridad(diasHasta(p.fecha_vencimiento))
                }));

                // Enriquecer préstamos (tienen día del mes)
                const prestamosMejorados = prestamosRaw.map(p => ({
                    ...p,
                    fecha_calculada: calcularProximaCuota(p.dia_vencimiento_mensual),
                    dias_restantes: diasHasta(calcularProximaCuota(p.dia_vencimiento_mensual)),
                    prioridad: calcularPrioridad(diasHasta(calcularProximaCuota(p.dia_vencimiento_mensual)))
                }));

                // Enriquecer tarjetas (tienen día del mes)
                const tarjetasMejoradas = tarjetasRaw.map(t => ({
                    ...t,
                    fecha_calculada: calcularFechaVencTarjeta(t.fecha_vencimiento),
                    dias_restantes: diasHasta(calcularFechaVencTarjeta(t.fecha_vencimiento)),
                    prioridad: calcularPrioridad(diasHasta(calcularFechaVencTarjeta(t.fecha_vencimiento)))
                }));

                // Consolidar todos
                const todos = [
                    ...chequesMejorados,
                    ...proveedoresMejorados,
                    ...prestamosMejorados,
                    ...tarjetasMejoradas
                ];

                // Ordenar por dias_restantes y agrupar por urgencia
                todos.sort((a, b) => {
                    if (a.dias_restantes === null && b.dias_restantes === null) return 0;
                    if (a.dias_restantes === null) return 1;
                    if (b.dias_restantes === null) return -1;
                    return a.dias_restantes - b.dias_restantes;
                });

                proximos5Vencimientos = todos.slice(0, 5);
            }

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
                proximos5Vencimientos,
                deudasVencidas,
                deudasProximas,
                isEmpleado,
                isRecepcionista
            });
        } catch (err) {
            console.error('❌ Error en dashboard:', err.message);
            const isEmpleado = req.session.user?.rol === 'empleado';
            const isRecepcionista = req.session.user?.rol === 'recepcionista';

            // Intentar recuperar al menos los counts
            const counts = {
                pendientes:    (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'PENDIENTE'"))?.c || 0,
                en_produccion: (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'EN_PRODUCCION'"))?.c || 0,
                listos:        (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'LISTO'"))?.c || 0,
                entregados:    (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'ENTREGADO'"))?.c || 0,
                presupuestos:  (await dbInstance.get("SELECT COUNT(*) AS c FROM presupuestos WHERE estado = 'PENDIENTE'"))?.c || 0,
                clientes:      (await dbInstance.get("SELECT COUNT(*) AS c FROM clients"))?.c || 0,
            };

            res.render('home', {
                title: 'Panel Principal',
                counts,
                ingresosHoy: 0,
                ingresosMes: 0,
                deudores: [],
                stockBajo: [],
                ultimosPedidos: [],
                proximos5Vencimientos: [],
                deudasVencidas: [],
                deudasProximas: [],
                isEmpleado,
                isRecepcionista
            });
        }
    });

    // ────────────────────────────────────────────────────────────────────
    // DEBUG: Ver conteos en consola
    // ────────────────────────────────────────────────────────────────────

    // ✅ DEBUG endpoint protegido por autenticación
    app.get('/debug/counts', authMiddleware.isAuthenticated, permitirRoles('admin'), async (_, res) => {
        const counts = {
            pendientes:    (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'PENDIENTE'"))?.c || 0,
            en_produccion: (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'EN_PRODUCCION'"))?.c || 0,
            listos:        (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'LISTO'"))?.c || 0,
            entregados:    (await dbInstance.get("SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'ENTREGADO'"))?.c || 0,
        };
        const allEstados = await dbInstance.all("SELECT DISTINCT estado FROM pedidos");
        res.json({ counts, allEstados });
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



