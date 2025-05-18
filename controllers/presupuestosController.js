const db = require('../config/db');

exports.formNuevoPresupuesto = (req, res) => {
  let productos = [];
  try {
    productos = db.prepare('SELECT * FROM catalogo_productos ORDER BY nombre ASC').all();
    if (!Array.isArray(productos)) productos = [];
    console.log("✅ Productos cargados para presupuesto interno:", productos);
  } catch (err) {
    console.error('❌ Error cargando productos para presupuesto:', err);
    productos = [];
  }

  res.render('presupuestos/nuevo', {
    title: 'Nuevo Presupuesto (Interno)',
    productos
  });
};

// Crear presupuesto interno
exports.crearPresupuesto = (req, res) => {
  const {
    cliente_id,
    nombre_cliente,
    email_cliente,
    telefono_cliente,
    detalle,
    precio_estimado,
    producto_id,
    ancho,
    alto,
    cantidad
  } = req.body;

  const archivo_imagen = req.file ? req.file.filename : null;

  const producto = producto_id ? db.prepare('SELECT * FROM catalogo_productos WHERE id = ?').get(producto_id) : null;

  let precio_final = parseFloat(precio_estimado) || 0;
  if (producto) {
    const base = producto.precio_base;
    const min = producto.minimo || 1;

    if (producto.tipo === 'metro_cuadrado') {
      const m2 = Math.max((parseFloat(ancho) || 0) * (parseFloat(alto) || 0), min);
      precio_final = base * m2;
    } else if (producto.tipo === 'unidad' || producto.tipo === 'hoja') {
      const cant = Math.max(parseInt(cantidad) || 0, min);
      precio_final = base * cant;
    }
  }

  const stmt = `
    INSERT INTO presupuestos
    (cliente_id, nombre_cliente, email_cliente, telefono_cliente, detalle, precio_estimado, archivo_imagen, producto_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(stmt, [
    cliente_id || null,
    nombre_cliente,
    email_cliente,
    telefono_cliente,
    detalle,
    precio_final,
    archivo_imagen,
    producto ? producto.id : null
  ], function(err) {
    if (err) return res.status(500).send("Error en base de datos");
    res.redirect('/presupuestos/' + this.lastID);
  });
};

// Listar presupuestos
exports.listarPresupuestos = (req, res) => {
  try {
    const query = `
      SELECT p.*, c.nombre AS producto_nombre
      FROM presupuestos p
      LEFT JOIN catalogo_productos c ON p.producto_id = c.id
      ORDER BY p.id DESC
    `;
    const presupuestos = db.prepare(query).all() || [];
    res.render('presupuestos/lista', {
      title: 'Listado de Presupuestos',
      presupuestos: Array.isArray(presupuestos) ? presupuestos : []
    });
  } catch (err) {
    console.error('Error al listar presupuestos:', err);
    res.render('presupuestos/lista', {
      title: 'Listado de Presupuestos',
      presupuestos: [],
      error: 'Hubo un error al cargar los presupuestos.'
    });
  }
};

// Ver detalle de un presupuesto
exports.verDetallePresupuesto = (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM presupuestos WHERE id = ?', [id], (err, presupuesto) => {
    if (err || !presupuesto) return res.status(404).send("Presupuesto no encontrado");
    res.render('presupuestos/detalle', { title: 'Detalle del Presupuesto', presupuesto });
  });
};

// Formulario público
exports.formPresupuestoPublico = (req, res) => {
  let productos = [];
  try {
    productos = db.prepare('SELECT * FROM catalogo_productos ORDER BY nombre ASC').all();
    if (!Array.isArray(productos)) productos = [];
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

// Procesar presupuesto público corregido
exports.recibirPresupuestoPublico = (req, res) => {
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

  const producto = db.prepare('SELECT * FROM catalogo_productos WHERE id = ?').get(producto_id);
  if (!producto) {
    return res.status(400).send("Producto no válido.");
  }

  let precio_estimado = 0;
  const base = producto.precio_base;
  const min = producto.minimo || 1;

  if (producto.tipo === 'metro_cuadrado') {
    const m2 = Math.max((parseFloat(ancho) || 0) * (parseFloat(alto) || 0), min);
    precio_estimado = base * m2;
  } else if (producto.tipo === 'unidad' || producto.tipo === 'hoja') {
    const cant = Math.max(parseInt(cantidad) || 0, min);
    precio_estimado = base * cant;
  }

  const stmt = `
    INSERT INTO presupuestos
    (nombre_cliente, email_cliente, telefono_cliente, detalle, archivo_imagen, producto_id, precio_estimado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    stmt,
    [
      nombre_cliente,
      email_cliente,
      telefono_cliente,
      detalle,
      archivo_imagen,
      producto.id,
      precio_estimado
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send("Error en base de datos");
      }

      // 🔄 Recargar productos para mostrar el formulario otra vez correctamente
      let productos = [];
      try {
        productos = db.prepare('SELECT * FROM catalogo_productos ORDER BY nombre ASC').all();
      } catch (e) {
        console.error("Error al recargar productos luego del insert:", e.message);
        productos = [];
      }

      res.render('presupuestos/publico', {
        title: 'Presupuesto Enviado',
        mensaje: '✅ Tu presupuesto fue enviado correctamente. ¡Te contactaremos pronto!',
        productos
      });
    }
  );
};
