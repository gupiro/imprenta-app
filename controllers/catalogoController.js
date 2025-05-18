const db = require('../database'); // ✅ ESTA ES LA CORRECTA

// Mostrar la lista de productos del catálogo
exports.listarCatalogo = (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM catalogo_productos ORDER BY nombre ASC');
    const productos = stmt.all();

    console.log('🧾 Productos en catálogo:', productos);
    console.log('Tipo de datos productos:', typeof productos);
    console.log('¿Es array?', Array.isArray(productos));

    res.render('catalogo/lista', {
      title: 'Catálogo de Productos',
      productos: Array.isArray(productos) ? productos : []
    });

  } catch (err) {
    console.error('❌ Error cargando productos del catálogo:', err.message);
    res.render('catalogo/lista', {
      title: 'Catálogo de Productos',
      productos: [],
      error: 'Error al cargar productos del catálogo.'
    });
  }
};

// Mostrar el formulario para agregar un producto nuevo
exports.formNuevo = (req, res) => {
  res.render('catalogo/nuevo', {
    title: 'Nuevo Producto del Catálogo'
  });
};

// Guardar el nuevo producto en la base
exports.crearProducto = (req, res) => {
  const { nombre, tipo, precio_base, minimo } = req.body;

  console.log('📥 Datos recibidos del formulario:', req.body);

  try {
    db.prepare(`
      INSERT INTO catalogo_productos (nombre, tipo, precio_base, minimo)
      VALUES (?, ?, ?, ?)
    `).run(nombre, tipo, precio_base, minimo || 1);

    console.log('✅ Producto insertado correctamente');
    res.redirect('/catalogo');
  } catch (err) {
    console.error('❌ Error al insertar producto:', err);
    res.status(500).send('Error al guardar el producto en la base de datos.');
  }
};
// Mostrar formulario para editar un producto
exports.formEditar = (req, res) => {
  const producto = db.prepare('SELECT * FROM catalogo_productos WHERE id = ?').get(req.params.id);
  if (!producto) return res.status(404).send('Producto no encontrado');

  res.render('catalogo/editar', {
    title: 'Editar Producto',
    producto
  });
};

// Guardar cambios de edición
exports.actualizarProducto = (req, res) => {
  const { nombre, tipo, precio_base, minimo } = req.body;
  const id = req.params.id;

  db.prepare(`
    UPDATE catalogo_productos
    SET nombre = ?, tipo = ?, precio_base = ?, minimo = ?
    WHERE id = ?
  `).run(nombre, tipo, precio_base, minimo || 1, id);

  res.redirect('/catalogo');
};
// Eliminar producto del catálogo
exports.eliminarProducto = (req, res) => {
  const id = req.params.id;

  try {
    db.prepare('DELETE FROM catalogo_productos WHERE id = ?').run(id);
    console.log(`🗑️ Producto ID ${id} eliminado del catálogo`);
    res.redirect('/catalogo');
  } catch (err) {
    console.error('❌ Error al eliminar producto:', err.message);
    res.status(500).send('Error al eliminar producto');
  }
};
