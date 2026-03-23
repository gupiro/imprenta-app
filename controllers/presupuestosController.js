// controllers/presupuestosController.js

const { obtenerFechaLocal } = require('../utils/dateHelper');

module.exports = (db) => {

    const formNuevoPresupuesto = async (req, res) => {
        let productos = [];
        let clientes = [];
        try {
            productos = await db.all('SELECT * FROM catalogo_productos ORDER BY nombre ASC');
            if (!Array.isArray(productos)) productos = [];
            clientes = await db.all('SELECT id, name, phone, email FROM clients ORDER BY name ASC');
            if (!Array.isArray(clientes)) clientes = [];
        } catch (err) {
            console.error('❌ Error cargando datos para presupuesto:', err);
        }

        res.render('presupuestos/nuevo', {
            title: 'Nuevo Presupuesto',
            productos,
            clientes,
            csrfToken: 'disabled',
            error: req.flash('error'),
            success: req.flash('success')
        });
    };

    // ✅ NUEVA FUNCIÓN: Crear presupuesto con múltiples items
    const crearPresupuesto = async (req, res) => {
        try {
            const {
                cliente_id,
                nombre_cliente,
                email_cliente,
                telefono_cliente,
                archivo_imagen,
                detalle = '',
                precio_extra = '0',
                descripcion = [],
                producto_id = [],
                cantidad = [],
                precio_unitario = [],
                descuento_item = []
            } = req.body;

            // Validar datos del cliente
            let nombreFinal = nombre_cliente;
            let emailFinal = email_cliente;
            let telefonoFinal = telefono_cliente;
            let clienteIdFinal = cliente_id ? parseInt(cliente_id, 10) : null;

            if (clienteIdFinal) {
                const cl = await db.get('SELECT id, name, phone, email FROM clients WHERE id = ?', clienteIdFinal);
                if (cl) {
                    nombreFinal = nombreFinal || cl.name;
                    telefonoFinal = telefonoFinal || cl.phone;
                    emailFinal = emailFinal || cl.email;
                }
            }

            if (!nombreFinal || !telefonoFinal) {
                req.flash('error', 'Nombre y teléfono del cliente son requeridos.');
                return res.redirect('/presupuestos/nuevo');
            }

            // Validar que haya al menos un item
            const descripciones = Array.isArray(descripcion) ? descripcion : [descripcion];
            if (descripciones.length === 0 || !descripciones[0]) {
                req.flash('error', 'Debes agregar al menos un item.');
                return res.redirect('/presupuestos/nuevo');
            }

            // Calcular total con validaciones
            let totalPresupuesto = 0;
            const cantidades = Array.isArray(cantidad) ? cantidad : [cantidad];
            const preciosUnit = Array.isArray(precio_unitario) ? precio_unitario : [precio_unitario];
            const descuentos = Array.isArray(descuento_item) ? descuento_item : [descuento_item];

            for (let i = 0; i < descripciones.length; i++) {
                if (descripciones[i]) {
                    const cant = parseFloat(cantidades[i]) || 0;
                    const precio = parseFloat(preciosUnit[i]) || 0;
                    const desc = parseFloat(descuentos[i]) || 0;

                    // Validar valores positivos
                    if (cant <= 0) {
                        req.flash('error', `Cantidad debe ser mayor a 0 en item "${descripciones[i]}"`);
                        return res.redirect('/presupuestos/nuevo');
                    }
                    if (precio < 0) {
                        req.flash('error', `Precio no puede ser negativo en item "${descripciones[i]}"`);
                        return res.redirect('/presupuestos/nuevo');
                    }
                    if (desc < 0) {
                        req.flash('error', `Descuento no puede ser negativo en item "${descripciones[i]}"`);
                        return res.redirect('/presupuestos/nuevo');
                    }

                    totalPresupuesto += (cant * precio) - desc;
                }
            }

            // Agregar precio extra
            const precioExtraVal = parseFloat(precio_extra) || 0;
            totalPresupuesto += precioExtraVal;

            // Crear presupuesto
            const { timestamp: fecha } = obtenerFechaLocal();
            const usuarioId = req.session.user?.id || null;

            const presupuestoResult = await db.run(`
                INSERT INTO presupuestos (
                    cliente_id, nombre_cliente, email_cliente, telefono_cliente,
                    precio_estimado, detalle, precio_extra, estado, fecha_creacion, usuario_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?)
            `, [clienteIdFinal || null, nombreFinal, emailFinal, telefonoFinal, totalPresupuesto, detalle, precioExtraVal, fecha, usuarioId]);

            const presupuestoId = presupuestoResult.lastID;

            // Crear items
            for (let i = 0; i < descripciones.length; i++) {
                if (descripciones[i]) {
                    const cant = parseFloat(cantidades[i]) || 1;
                    const precio = parseFloat(preciosUnit[i]) || 0;
                    const desc = parseFloat(descuentos[i]) || 0;
                    const subtotal = (cant * precio) - desc;
                    const prodId = parseInt(producto_id[i]) || null;

                    await db.run(`
                        INSERT INTO presupuesto_items (
                            presupuesto_id, producto_id, descripcion, cantidad,
                            precio_unitario, descuento_item, subtotal
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [presupuestoId, prodId, descripciones[i], cant, precio, desc, subtotal]);
                }
            }

            req.flash('success', 'Presupuesto creado correctamente.');
            res.redirect('/presupuestos/' + presupuestoId);
        } catch (err) {
            console.error('Error al crear presupuesto:', err);
            req.flash('error', 'Error al crear presupuesto: ' + err.message);
            res.redirect('/presupuestos/nuevo');
        }
    };

    const listarPresupuestos = async (req, res) => {
        try {
            const filtroNombre = req.query.nombre?.trim() || '';
            const filtroFecha = req.query.fecha?.trim() || '';
            const filtroBusqueda = req.query.busqueda?.trim() || '';
            
            let query = 'SELECT p.*, u.username FROM presupuestos p LEFT JOIN users u ON p.usuario_id = u.id WHERE 1=1';
            const params = [];
            
            if (filtroNombre) {
                query += ' AND LOWER(p.nombre_cliente) LIKE ?';
                params.push(`%${filtroNombre.toLowerCase()}%`);
            }
            
            if (filtroFecha) {
                query += ' AND DATE(p.fecha_creacion) = ?';
                params.push(filtroFecha);
            }
            
            if (filtroBusqueda) {
                query += ' AND (LOWER(p.nombre_cliente) LIKE ? OR LOWER(p.email_cliente) LIKE ?)';
                params.push(`%${filtroBusqueda.toLowerCase()}%`);
                params.push(`%${filtroBusqueda.toLowerCase()}%`);
            }
            
            query += ' ORDER BY p.id DESC';
            
            const presupuestos = await db.all(query, params) || [];
            
            res.render('presupuestos/lista', {
                title: 'Listado de Presupuestos',
                presupuestos: Array.isArray(presupuestos) ? presupuestos : [],
                filtros: { nombre: filtroNombre, fecha: filtroFecha, busqueda: filtroBusqueda }
            });
        } catch (err) {
            console.error('Error al listar presupuestos:', err);
            res.render('presupuestos/lista', {
                title: 'Listado de Presupuestos',
                presupuestos: [],
                filtros: {},
                error: 'Hubo un error al cargar los presupuestos.'
            });
        }
    };

    const verDetallePresupuesto = async (req, res) => {
        const id = req.params.id;
        try {
            const presupuesto = await db.get('SELECT p.*, u.username FROM presupuestos p LEFT JOIN users u ON p.usuario_id = u.id WHERE p.id = ?', id);
            if (!presupuesto) {
                return res.status(404).send('Presupuesto no encontrado');
            }

            // Cargar items
            const items = await db.all('SELECT * FROM presupuesto_items WHERE presupuesto_id = ?', id);

            res.render('presupuestos/detalle', {
                title: `Detalle del Presupuesto #${id}`,
                presupuesto,
                items: items || [],
                error: req.flash('error'),
                success: req.flash('success')
            });
        } catch (err) {
            console.error('Error al ver detalle:', err);
            res.status(500).send('Error interno del servidor.');
        }
    };

    const formPresupuestoPublico = async (req, res) => {
        let productos = [];
        try {
            productos = await db.all('SELECT * FROM catalogo_productos WHERE publico = 1 ORDER BY nombre ASC');
            if (!Array.isArray(productos)) {
                productos = await db.all('SELECT * FROM catalogo_productos ORDER BY nombre ASC');
            }
        } catch (err) {
            console.error('Error al cargar productos públicos:', err);
            productos = [];
        }

        res.render('presupuestos/publico', {
            title: 'Solicitá tu Presupuesto',
            productos,
            mensaje: null
        });
    };

    const recibirPresupuestoPublico = async (req, res) => {
        const { nombre_cliente, email_cliente, telefono_cliente, detalle, producto_id } = req.body;

        try {
            const producto = await db.get('SELECT * FROM catalogo_productos WHERE id = ?', producto_id);
            if (!producto) {
                return res.status(400).send('Producto no válido.');
            }

            const precio_estimado = producto.precio_base || 0;
            const { timestamp: fecha } = obtenerFechaLocal();

            await db.run(`
                INSERT INTO presupuestos (
                    nombre_cliente, email_cliente, telefono_cliente, detalle,
                    producto_id, precio_estimado, estado, fecha_creacion
                ) VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE', ?)
            `, nombre_cliente, email_cliente, telefono_cliente, detalle, producto_id, precio_estimado, fecha);

            let productos = await db.all('SELECT * FROM catalogo_productos WHERE publico = 1 ORDER BY nombre ASC');
            if (!Array.isArray(productos)) productos = [];

            res.render('presupuestos/publico', {
                title: 'Presupuesto Enviado',
                mensaje: '✅ Tu presupuesto fue enviado correctamente. ¡Te contactaremos pronto!',
                productos
            });
        } catch (err) {
            console.error('Error:', err);
            res.status(500).send('Error al recibir presupuesto');
        }
    };

    return {
        formNuevoPresupuesto,
        crearPresupuesto,
        listarPresupuestos,
        verDetallePresupuesto,
        formPresupuestoPublico,
        recibirPresupuestoPublico
    };
};
