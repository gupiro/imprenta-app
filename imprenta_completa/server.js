const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./config/db');
const authMiddleware = require('./middleware/authMiddleware');
const rolesMiddleware = require('./middleware/roles');

const app = express();

// Configuración
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'tu_secreto_super_seguro',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Inicializar BD
db.initDB();

// Rutas públicas
app.use('/auth', require('./routes/auth'));

// Rutas protegidas
app.use(authMiddleware);

app.use('/dashboard', rolesMiddleware(['admin', 'gerente']), require('./routes/dashboard'));
app.use('/presupuestos', rolesMiddleware(['admin', 'operario', 'gerente']), require('./routes/presupuestos'));
app.use('/pedidos', rolesMiddleware(['admin', 'operario', 'gerente']), require('./routes/pedidos'));
app.use('/caja', rolesMiddleware(['admin', 'gerente']), require('./routes/caja'));
app.use('/productos', rolesMiddleware(['admin', 'gerente']), require('./routes/productos'));
app.use('/clientes', rolesMiddleware(['admin', 'operario', 'gerente']), require('./routes/clientes'));
app.use('/stock', rolesMiddleware(['admin', 'gerente']), require('./routes/stock'));
app.use('/reportes', rolesMiddleware(['admin', 'gerente']), require('./routes/reportes'));

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
