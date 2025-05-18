const express = require('express'); 
const router = express.Router();
const presupuestosController = require('../controllers/presupuestosController');
const upload = require('../config/multer'); // para manejo de imágenes

// Rutas Externas (para clientes) → deben ir primero
router.get('/publico', presupuestosController.formPresupuestoPublico);
router.post('/publico', upload.single('archivo_imagen'), presupuestosController.recibirPresupuestoPublico);

// Rutas Internas
router.get('/nuevo', presupuestosController.formNuevoPresupuesto);
router.post('/nuevo', upload.single('archivo_imagen'), presupuestosController.crearPresupuesto);
router.get('/', presupuestosController.listarPresupuestos);
router.get('/:id', presupuestosController.verDetallePresupuesto);

// 🔄 Crear pedido desde presupuesto (DEBE IR DESPUÉS de las rutas anteriores)
router.get('/:id/crear-pedido', async (req, res) => {
  const id = req.params.id;
  const db = require('../config/db');

  const presupuesto = db.prepare(`
    SELECT p.*, c.nombre AS producto_nombre, c.tipo, c.minimo
      FROM presupuestos p
 LEFT JOIN catalogo_productos c ON p.producto_id = c.id
     WHERE p.id = ?
  `).get(id);

  if (!presupuesto) {
    req.flash('error', 'Presupuesto no encontrado');
    return res.redirect('/presupuestos');
  }

  // 🔁 Marcar como usado
  db.prepare('UPDATE presupuestos SET usado = 1 WHERE id = ?').run(id);

  res.render('pedidos/nuevo', {
    title: 'Nuevo Pedido desde Presupuesto',
    presupuesto,
    presupuestoId: id, // 👈 esto lo vas a usar en el formulario
    materiales: db.prepare('SELECT * FROM materials ORDER BY name ASC').all(),
    success: [],
    error: []
  });
});

module.exports = router;
