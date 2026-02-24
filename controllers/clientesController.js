// controllers/clientesController.js - ACTUALIZADO CON PRESUPUESTOS PENDIENTES

module.exports = (db) => {

    const listarClientes = async (req, res) => {
        try {
            const clients = await db.all('SELECT * FROM clients ORDER BY name ASC');
            
            for (const client of clients) {
                const deuda = await db.get(`
                    SELECT COALESCE(SUM(monto_restante), 0) AS total_deuda
                    FROM pedidos
                    WHERE client_id = ? AND monto_restante > 0
                `, client.id);
                client.deuda_total = deuda?.total_deuda || 0;
                
                // Agregar presupuestos pendientes
                const presupuestosPendientes = await db.all(`
                    SELECT id, fecha_creacion, precio_estimado, estado
                    FROM presupuestos
                    WHERE cliente_id = ? AND estado IN ('PENDIENTE', 'ACEPTADO')
                    ORDER BY fecha_creacion DESC
                `, client.id);
                client.presupuestos_pendientes = presupuestosPendientes || [];
                client.cant_presupuestos = client.presupuestos_pendientes.length;
            }
            
            res.render('clientes/list', {
                title: 'Clientes',
                clients,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error al listar clientes:', err);
            req.flash('error', 'Error al cargar los clientes.');
            res.redirect('/');
        }
    };

    const formNuevoCliente = (req, res) => {
        res.render('clientes/form', {
            title: 'Nuevo Cliente',
            client: {},
            success: req.flash('success'),
            error: req.flash('error')
        });
    };

    const crearCliente = async (req, res) => {
        try {
            const { name, address, phone, email, cuit } = req.body;
            if (!name?.trim() || !phone?.trim()) {
                req.flash('error', 'El nombre y el teléfono son obligatorios.');
                return res.redirect('/clientes/nuevo');
            }
            await db.run(
                'INSERT INTO clients (name, address, phone, email, cuit) VALUES (?, ?, ?, ?, ?)',
                [name.trim(), address || '', phone.trim(), email || '', cuit || '']
            );
            req.flash('success', 'Cliente creado exitosamente.');
            res.redirect('/clientes');
        } catch (err) {
            console.error('Error al crear cliente:', err);
            req.flash('error', 'Error al crear el cliente.');
            res.redirect('/clientes/nuevo');
        }
    };

    const formEditarCliente = async (req, res) => {
        try {
            const client = await db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
            if (!client) {
                req.flash('error', 'Cliente no encontrado.');
                return res.redirect('/clientes');
            }
            res.render('clientes/form', {
                title: 'Editar Cliente',
                client,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error al cargar formulario:', err);
            req.flash('error', 'Error al cargar el cliente.');
            res.redirect('/clientes');
        }
    };

    const editarCliente = async (req, res) => {
        try {
            const { name, address, phone, email, cuit } = req.body;
            if (!name?.trim() || !phone?.trim()) {
                req.flash('error', 'El nombre y el teléfono son obligatorios.');
                return res.redirect(`/clientes/editar/${req.params.id}`);
            }
            await db.run(
                'UPDATE clients SET name = ?, address = ?, phone = ?, email = ?, cuit = ? WHERE id = ?',
                [name.trim(), address || '', phone.trim(), email || '', cuit || '', req.params.id]
            );
            req.flash('success', 'Cliente actualizado correctamente.');
            res.redirect('/clientes');
        } catch (err) {
            console.error('Error al editar cliente:', err);
            req.flash('error', 'Error al actualizar el cliente.');
            res.redirect('/clientes');
        }
    };

    const eliminarCliente = async (req, res) => {
        try {
            const { clave } = req.body;
            if (clave !== 'admin') {
                req.flash('error', 'Clave incorrecta. No se eliminó el cliente.');
                return res.redirect('/clientes');
            }
            await db.run('DELETE FROM clients WHERE id = ?', [req.params.id]);
            req.flash('success', 'Cliente eliminado correctamente.');
            res.redirect('/clientes');
        } catch (err) {
            console.error('Error al eliminar cliente:', err);
            req.flash('error', 'Error al eliminar el cliente.');
            res.redirect('/clientes');
        }
    };

    const historialCliente = async (req, res) => {
        try {
            const { id } = req.params;
            const cliente = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
            if (!cliente) {
                req.flash('error', 'Cliente no encontrado.');
                return res.redirect('/clientes');
            }
            
            const deudaTotal = await db.get(`
                SELECT COALESCE(SUM(monto_restante), 0) AS total_deuda
                FROM pedidos
                WHERE client_id = ? AND monto_restante > 0
            `, id);
            cliente.deuda_total = deudaTotal?.total_deuda || 0;
            
            const pedidos = await db.all(
                `SELECT p.id, p.fecha, p.precio, p.estado, p.monto_entregado, p.monto_restante
                 FROM pedidos p WHERE p.client_id = ? ORDER BY p.fecha DESC`,
                [id]
            );
            for (const p of pedidos) {
                p.productos = await db.all(
                    'SELECT material, ancho, alto FROM productos WHERE pedido_id = ?', [p.id]
                );
            }
            res.render('clientes/historial', {
                title: `Historial de ${cliente.name}`,
                cliente,
                pedidos,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error al cargar historial:', err);
            req.flash('error', 'Error al cargar el historial.');
            res.redirect('/clientes');
        }
    };

    const crearClienteDesdeModal = async (req, res) => {
        try {
            console.log('📝 Recibiendo datos:', req.body);
            
            const { name, phone, address, email, cuit } = req.body;
            
            if (!name || !phone) {
                console.error('❌ Faltan datos:', { name, phone });
                return res.status(400).json({ 
                    error: 'Faltan nombre o teléfono',
                    datos: { name, phone }
                });
            }
            
            console.log('✅ Validación OK. Insertando...');
            
            const result = await db.run(
                'INSERT INTO clients (name, address, phone, email, cuit) VALUES (?, ?, ?, ?, ?)',
                [name.trim(), address || '', phone.trim(), email || '', cuit || '']
            );
            
            console.log('📊 Cliente insertado con ID:', result.lastID);
            
            const clienteCreado = await db.get(
                'SELECT id, name, phone, address, email, cuit FROM clients WHERE id = ?',
                [result.lastID]
            );
            
            console.log('✅ Cliente creado:', clienteCreado);
            
            return res.json(clienteCreado);
        } catch (err) {
            console.error('❌ Error al crear cliente desde modal:', err);
            return res.status(500).json({ 
                error: 'Error interno al crear cliente',
                detalle: err.message
            });
        }
    };

    const buscarClientes = async (req, res) => {
        try {
            const q = req.query.q?.trim();
            if (!q) return res.json([]);
            const resultados = await db.all(
                'SELECT id, name, phone FROM clients WHERE name LIKE ? ORDER BY name ASC LIMIT 10',
                [`%${q}%`]
            );
            res.json(resultados);
        } catch (err) {
            console.error('Error al buscar clientes:', err);
            res.json([]);
        }
    };

    return {
        listarClientes,
        formNuevoCliente,
        crearCliente,
        formEditarCliente,
        editarCliente,
        eliminarCliente,
        historialCliente,
        crearClienteDesdeModal,
        buscarClientes
    };
};
