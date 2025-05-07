const express        = require('express');
const basicAuth      = require('express-basic-auth');
const session        = require('express-session');
const flash          = require('connect-flash');
const path           = require('path');
const fs             = require('fs');
const expressLayouts = require('express-ejs-layouts');
const sharp          = require('sharp');

const db             = require('./database');
const authRouter     = require('./routes/auth');
const clientesRouter = require('./routes/clientes');
const pedidosRouter  = require('./routes/pedidos');
const usuariosRouter = require('./routes/usuarios');
const materialesRouter = require('./routes/materiales');

const { permitirRoles } = require('./middleware/roles');
const checkPermission  = require('./middleware/permissions');

const app = express();

// ─── DEBUG: mostrar cada petición en consola ───
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.path);
  next();
});

// ───── Protección básica para historial ─────
app.use(
  '/pedidos/historial',
  basicAuth({ users: { 'admin': 'admin' }, challenge: true, realm: 'Historial Protegido' })
);

// 1. Configuración de vistas (EJS + layouts)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// 2. Rutas absolutas para includes
app.locals.basedir = app.get('views');

// 3. Parseo de formularios
app.use(express.urlencoded({ extended: true }));

// 4. Asegurar carpeta de uploads y thumbs
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const thumbsDir = path.join(uploadsDir, 'thumbs');
if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

// ─── Rutas de imágenes, watermark, etc. (tu código existente) ───
app.get('/pedidos/revision/descargar/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const low = req.query.quality === 'low';
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Archivo no encontrado');
    }

    const inputBuffer = await fs.promises.readFile(filePath);
    let pipeline = sharp(inputBuffer);
    if (low) {
      pipeline = pipeline
        .jpeg({ quality: 50, chromaSubsampling: '4:2:0' })
        .resize({ width: 1200 });
    }
    const processedBuffer = await pipeline.toBuffer();

    const meta = await sharp(processedBuffer).metadata();
    const logoBuf  = await fs.promises.readFile(path.join(__dirname, 'public', 'logo.png'));
    const logoMeta = await sharp(logoBuf).metadata();
    const minSide  = Math.min(meta.width, meta.height);
    const scale    = (minSide / 5) / Math.max(logoMeta.width, logoMeta.height);
    const logoW    = Math.floor(logoMeta.width * scale);
    const logoH    = Math.floor(logoMeta.height * scale);
    const logoRes  = await sharp(logoBuf).resize(logoW, logoH).png().toBuffer();

    const composites = [];
    for (let x = 0; x < meta.width; x += logoW * 2) {
      for (let y = 0; y < meta.height; y += logoH * 2) {
        composites.push({ input: logoRes, left: x, top: y, blend: 'overlay' });
      }
    }

    const outBuf = await sharp(processedBuffer)
      .composite(composites)
      .png()
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${path.parse(filename).name}-watermarked.png"`
    );
    return res.send(outBuf);
  } catch (err) {
    console.error('Error watermark:', err);
    return res.status(500).send('Error al procesar imagen');
  }
});

app.get('/uploads/:filename', async (req, res, next) => {
  const { filename } = req.params;
  const low = req.query.quality === 'low';
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    return next();
  }
  if (low) {
    try {
      const transformer = sharp(filePath)
        .jpeg({ quality: 50, chromaSubsampling: '4:2:0' })
        .resize({ width: 1200 });
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename.replace(/\.(jpe?g)$/i, '-low.$1')}"`
      );
      return transformer.pipe(res);
    } catch (err) {
      console.error('Error low-quality streaming:', err);
      return res.status(500).send('Error al procesar imagen');
    }
  }
  return next();
});

app.get('/uploads/thumbs/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    const origPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(origPath)) return next();

    const thumbBuffer = await sharp(origPath).resize({ width: 150 }).toBuffer();
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png')      res.type('image/png');
    else if (ext === '.gif') res.type('image/gif');
    else                     res.type('image/jpeg');

    return res.send(thumbBuffer);
  } catch (err) {
    console.error('Error al servir miniatura:', err);
    return next(err);
  }
});

// 5. Montar carpetas estáticas
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// 6. Sesiones y flash
app.use(session({ secret: 'cualquier_secreto', resave: false, saveUninitialized: false }));
app.use(flash());

// 7. Variables globales para vistas
app.use((req, res, next) => {
  res.locals.error       = req.flash('error')   || [];
  res.locals.success     = req.flash('success') || [];
  res.locals.user        = req.session.user     || null;
  res.locals.currentPath = req.path;
  next();
});

// 8. Navbar con iconos
app.use((req, res, next) => {
  res.locals.pages = [
    { name: 'home',               label: 'Inicio',        url: '/',                     icon: 'bi-house-fill' },
    { name: 'clientes',           label: 'Clientes',      url: '/clientes',             icon: 'bi-people-fill' },
    { name: 'clientes-nuevo',     label: 'Nuevo Cliente', url: '/clientes/nuevo',       icon: 'bi-person-plus-fill' },
    { name: 'materiales',         label: 'Materiales',    url: '/materiales',           icon: 'bi-box-seam-fill' },
    { name: 'pedidos-nuevo',      label: 'Nuevo Pedido',  url: '/pedidos/nuevo',        icon: 'bi-receipt-cutoff' },
    { name: 'pedidos-pendientes', label: 'Pendientes',     url: '/pedidos/pendientes',   icon: 'bi-clock-fill' },
    { name: 'pedidos-revision',   label: 'Revisión',       url: '/pedidos/revision',     icon: 'bi-pencil-square' },
    { name: 'pedidos-impresiones',label: 'Para Imprimir',  url: '/pedidos/impresiones',  icon: 'bi-printer-fill' },
    { name: 'pedidos-terminados', label: 'Terminados',     url: '/pedidos/terminados',   icon: 'bi-check2-circle' },
    { name: 'pedidos-entregados', label: 'Entregados',     url: '/pedidos/entregados',   icon: 'bi-truck-flatbed' },
    { name: 'pedidos-historial',  label: 'Historial',      url: '/pedidos/historial',    icon: 'bi-clock-history' }
  ];
  res.locals.activePage = req.path === '/'
    ? 'home'
    : req.path.slice(1).replace(/\//g, '-');
  next();
});

// 9. Rutas de autenticación y protegidas
app.use('/auth', authRouter);
app.use('/clientes',            permitirRoles('Admin','Atención'),            checkPermission, clientesRouter);
app.use('/pedidos',             permitirRoles('Admin','Atención','Impresor'), checkPermission, pedidosRouter);
app.use('/usuarios',            permitirRoles('Admin'),                      checkPermission, usuariosRouter);
// Montar rutas de materiales en /materiales
app.use('/materiales',          permitirRoles('Admin','Atención'),            checkPermission, materialesRouter);

// 10. Home y 404
app.get('/', (req, res) => res.render('home', { title: 'Panel Principal' }));
app.use((_, res) => res.status(404).render('404', { title: 'Página no encontrada' }));

// 11. Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
