const db = require('../config/db');

// ─────────────────────────────────────────────
// FUNCIONES PARA GESTIÓN DE PRODUCTOS DEL CATÁLOGO
// ─────────────────────────────────────────────
exports.listarProductos = (req, res) => {
  const productos = db.prepare('SELECT * FROM catalogo_productos ORDER BY nombre ASC').all();
  res.render('productos/lista', {
    title: 'Listado de Productos',
    productos: Array.isArray(productos) ? productos : []
  });
};

exports.formNuevoProducto = (req, res) => {
  res.render('productos/nuevo', { title: 'Nuevo Producto' });
};

exports.crearProducto = (req, res) => {
  const { nombre, tipo, precio_base, minimo } = req.body;

  db.prepare(`
    INSERT INTO catalogo_productos (nombre, tipo, precio_base, minimo)
    VALUES (?, ?, ?, ?)
  `).run(nombre, tipo, precio_base, minimo || 1);

  res.redirect('/productos');
};

// ─────────────────────────────────────────────
// FUNCIONES PARA PRESUPUESTOS (ya tenías estas)
// ─────────────────────────────────────────────
exports.formNuevoPresupuesto = (req, res) => {
  let productos = [];
  try {
    productos = db.prepare('SELECT * FROM catalogo_productos ORDER BY nombre ASC').all();
  } catch (err) {
    console.error('Error al cargar productos del catálogo:', err);
    productos = [];
  }

  res.render('presupuestos/nuevo', {
    title: 'Nuevo Presupuesto (Interno)',
    productos,
    error: [],
    success: []
  });
};

exports.formPresupuestoPublico = (req, res) => {
  let productos = [];
  try {
    productos = db.prepare('SELECT * FROM catalogo_productos ORDER BY nombre ASC').all();
  } catch (err) {
    console.error('Error al cargar productos del catálogo:', err);
    productos = [];
  }

  res.render('presupuestos/publico', {
    title: 'Solicitá tu Presupuesto',
    productos,
    mensaje: null
  });
};

exports.crearPresupuesto = (req, res) => {
  const {
    nombre_cliente,
    email_cliente,
    telefono_cliente,
    detalle,
    producto_id,
    ancho,
    alto,
    cantidad
  } = req.body;

  const archivo_imagen = req.file ? req.file.filename : null;

  let producto = null;
  let precio_estimado = 0;

  try {
    producto = db.prepare('SELECT * FROM catalogo_productos WHERE id = ?').get(producto_id);

    if (!producto) {
      req.flash('error', 'Producto no válido');
      return res.redirect('back');
    }

    const base = producto.precio_base;
    const min  = producto.minimo || 1;

    if (producto.tipo === 'metro_cuadrado') {
      const m2 = Math.max((parseFloat(ancho) || 0) * (parseFloat(alto) || 0), min);
      precio_estimado = base * m2;
    } else {
      const cant = Math.max(parseInt(cantidad) || 0, min);
      precio_estimado = base * cant;
    }
  } catch (err) {
    console.error('Error calculando precio estimado:', err);
    req.flash('error', 'Error interno al calcular el presupuesto');
    return res.redirect('back');
  }

  const stmt = `
    INSERT INTO presupuestos
    (nombre_cliente, email_cliente, telefono_cliente, detalle, archivo_imagen, producto_id, precio_estimado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    db.prepare(stmt).run(
      nombre_cliente,
      email_cliente,
      telefono_cliente,
      detalle,
      archivo_imagen,
      producto.id,
      precio_estimado
    );

    const productos = db.prepare('SELECT * FROM catalogo_productos ORDER BY nombre ASC').all();

    res.render('presupuestos/publico', {
      title: 'Presupuesto Enviado',
      mensaje: '✅ Tu presupuesto fue enviado correctamente. ¡Te contactaremos pronto!',
      productos
    });
  } catch (err) {
    console.error('Error al guardar presupuesto:', err);
    req.flash('error', 'Error al guardar el presupuesto');
    res.redirect('back');
  }
};
