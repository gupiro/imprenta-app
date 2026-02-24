// controllers/catalogoController.js - ACTUALIZADO CON BÚSQUEDA POR CÓDIGO

module.exports = (db) => {

    const listarCatalogo = async (req, res) => {
        try {
            const query = req.query.q?.trim().toLowerCase() || '';
            let productos;
            
            if (query) {
                // Búsqueda por nombre o código
                productos = await db.all(
                    'SELECT * FROM catalogo_productos WHERE LOWER(nombre) LIKE ? OR LOWER(codigo) LIKE ? ORDER BY nombre ASC',
                    [`%${query}%`, `%${query}%`]
                );
            } else {
                productos = await db.all(
                    'SELECT * FROM catalogo_productos ORDER BY nombre ASC'
                );
            }
            
            res.render('catalogo/lista', {
                title: 'Catálogo de Productos',
                productos: Array.isArray(productos) ? productos : [],
                busqueda: query,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error cargando catálogo:', err.message);
            res.render('catalogo/lista', {
                title: 'Catálogo de Productos',
                productos: [],
                busqueda: '',
                error: 'Error al cargar productos del catálogo.'
            });
        }
    };

    const formNuevo = (req, res) => {
        res.render('catalogo/nuevo', { title: 'Nuevo Producto del Catálogo' });
    };

    const crearProducto = async (req, res) => {
        const { codigo, nombre, tipo, precio_base, minimo } = req.body;
        try {
            if (!nombre || !tipo) {
                req.flash('error', 'Nombre y tipo son requeridos');
                return res.redirect('/catalogo/nuevo');
            }
            
            await db.run(
                'INSERT INTO catalogo_productos (codigo, nombre, tipo, precio_base, minimo) VALUES (?, ?, ?, ?, ?)',
                codigo || null, 
                nombre.trim(), 
                tipo, 
                parseFloat(precio_base) || 0, 
                parseInt(minimo) || 1
            );
            req.flash('success', 'Producto creado correctamente');
            res.redirect('/catalogo');
        } catch (err) {
            console.error('Error al insertar producto:', err);
            req.flash('error', 'Error al guardar el producto: ' + err.message);
            res.redirect('/catalogo/nuevo');
        }
    };

    const formEditar = async (req, res) => {
        try {
            const producto = await db.get(
                'SELECT * FROM catalogo_productos WHERE id = ?', 
                parseInt(req.params.id)
            );
            if (!producto) {
                req.flash('error', 'Producto no encontrado');
                return res.redirect('/catalogo');
            }
            res.render('catalogo/editar', { 
                title: 'Editar Producto', 
                producto,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error al cargar producto:', err);
            req.flash('error', 'Error al cargar el producto');
            res.redirect('/catalogo');
        }
    };

    const actualizarProducto = async (req, res) => {
        const { codigo, nombre, tipo, precio_base, minimo } = req.body;
        const id = parseInt(req.params.id);
        
        try {
            if (!nombre || !tipo) {
                req.flash('error', 'Nombre y tipo son requeridos');
                return res.redirect(`/catalogo/editar/${id}`);
            }
            
            await db.run(
                'UPDATE catalogo_productos SET codigo = ?, nombre = ?, tipo = ?, precio_base = ?, minimo = ? WHERE id = ?',
                codigo || null,
                nombre.trim(), 
                tipo, 
                parseFloat(precio_base) || 0, 
                parseInt(minimo) || 1, 
                id
            );
            req.flash('success', 'Producto actualizado correctamente');
            res.redirect('/catalogo');
        } catch (err) {
            console.error('Error al actualizar producto:', err);
            req.flash('error', 'Error al actualizar: ' + err.message);
            res.redirect(`/catalogo/editar/${id}`);
        }
    };

    const eliminarProducto = async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.run('DELETE FROM catalogo_productos WHERE id = ?', id);
            req.flash('success', 'Producto eliminado correctamente');
            res.redirect('/catalogo');
        } catch (err) {
            console.error('Error al eliminar producto:', err.message);
            req.flash('error', 'Error al eliminar producto: ' + err.message);
            res.redirect('/catalogo');
        }
    };

    return {
        listarCatalogo,
        formNuevo,
        crearProducto,
        formEditar,
        actualizarProducto,
        eliminarProducto
    };
};
