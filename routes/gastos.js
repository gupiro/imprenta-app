// routes/gastos.js - REDISEÑADO CON CATEGORÍAS DINÁMICAS Y CAMPOS MEJORADOS

const express = require('express');
const checkPermission = require('../middleware/permissions');
const { obtenerFechaLocal, turnoByHora } = require('../utils/dateHelper');

module.exports = (db) => {
    const router = express.Router();

    const CATEGORIAS_NEGOCIO = [
        'Materia Prima e Insumos',
        'Sueldos y Personal',
        'Alquiler Local',
        'Servicios (luz/gas/internet negocio)',
        'Mantenimiento de Máquinas',
        'Impuestos y Tasas',
        'Transporte y Fletes',
        'Publicidad',
        'Otros gastos del negocio'
    ];

    const CATEGORIAS_PERSONAL = [
        'Alimentación',
        'Salud',
        'Educación',
        'Hogar (luz/gas/alquiler casa)',
        'Ropa',
        'Transporte personal',
        'Entretenimiento',
        'Otros gastos personales'
    ];

    // 🚀 FORMULARIO PARA GASTO/INGRESO RÁPIDO (ventana nueva)
    router.get('/form-rapido', async (req, res) => {
        const tipo = req.query.tipo || 'gasto'; // 'gasto' o 'ingreso'
        const titulo = tipo === 'gasto' ? '⚡ Gasto Rápido' : '💰 Ingreso Rápido';
        const colorBg = tipo === 'gasto' ? '#ef4444' : '#06b6d4';
        const colorBtn = tipo === 'gasto' ? '#ef4444' : '#06b6d4';
        const categorias = tipo === 'gasto' ? CATEGORIAS_NEGOCIO : [
            'Ventas de Productos',
            'Servicios Prestados',
            'Ingresos por Comisiones',
            'Devoluciones de Pagos',
            'Otros Ingresos'
        ];

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <style>
        body {
            background: #f5f5f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 0;
            margin: 0;
        }
        .container-form {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            margin: 20px;
            overflow: hidden;
        }
        .form-header {
            background: ${colorBg};
            color: white;
            padding: 20px;
            text-align: center;
            border-bottom: 3px solid rgba(0,0,0,0.1);
        }
        .form-header h2 {
            margin: 0;
            font-weight: 700;
            font-size: 1.5rem;
        }
        .form-body {
            padding: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            display: block;
            font-size: 0.95rem;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.2s;
            font-family: inherit;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: ${colorBtn};
            box-shadow: 0 0 0 3px ${colorBtn}20;
        }
        .input-monto {
            font-size: 1.3rem;
            font-weight: 700;
        }
        .form-buttons {
            display: flex;
            gap: 10px;
            margin-top: 30px;
        }
        .btn-cancel {
            flex: 1;
            padding: 12px;
            border: 2px solid #e0e0e0;
            background: white;
            color: #666;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 1rem;
        }
        .btn-cancel:hover {
            background: #f5f5f5;
            border-color: #ccc;
        }
        .btn-submit {
            flex: 1;
            padding: 12px;
            border: none;
            background: ${colorBtn};
            color: white;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 1rem;
        }
        .btn-submit:hover {
            background: ${colorBtn};
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px ${colorBtn}40;
        }
        .btn-submit:active {
            transform: translateY(0);
        }
        .btn-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .alert {
            margin-bottom: 20px;
            padding: 12px 16px;
            border-radius: 8px;
            display: none;
        }
        .alert.show {
            display: block;
        }
        .alert-error {
            background: #fee;
            color: #c33;
            border: 1px solid #fcc;
        }
    </style>
</head>
<body>
    <div class="container-form">
        <div class="form-header">
            <h2>${titulo}</h2>
            <small style="opacity: 0.9;">Registra en tiempo real</small>
        </div>

        <div class="form-body">
            <div class="alert alert-error" id="errorAlert"></div>

            <form id="formRapido" method="POST" action="/gastos/${tipo === 'gasto' ? 'rapido' : 'ingreso-rapido'}">
                <input type="hidden" name="tipo" value="${tipo}">

                <!-- Monto -->
                <div class="form-group">
                    <label for="monto">💵 Monto *</label>
                    <input type="number" id="monto" name="monto" step="0.01" min="0.01" 
                           placeholder="Ej: 1500.50" required class="input-monto">
                </div>

                <!-- Categoría -->
                <div class="form-group">
                    <label for="categoria">📁 Categoría *</label>
                    <select id="categoria" name="categoria" required>
                        <option value="">-- Seleccionar categoría --</option>
                        ${categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                </div>

                <!-- Descripción -->
                <div class="form-group">
                    <label for="descripcion">📝 Descripción (opcional)</label>
                    <textarea id="descripcion" name="descripcion" rows="3" 
                              placeholder="Ej: Gasto en papel A4 de 75g"></textarea>
                </div>

                <!-- Botones -->
                <div class="form-buttons">
                    <button type="button" class="btn-cancel" onclick="window.close()">❌ Cancelar</button>
                    <button type="submit" class="btn-submit" id="btnSubmit">
                        ${tipo === 'gasto' ? '⚡ Registrar Gasto' : '💰 Registrar Ingreso'}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const form = document.getElementById('formRapido');
        const btnSubmit = document.getElementById('btnSubmit');
        const alertBox = document.getElementById('errorAlert');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const monto = parseFloat(document.getElementById('monto').value);
            const categoria = document.getElementById('categoria').value;
            const descripcion = document.getElementById('descripcion').value || '(sin descripción)';

            // Validaciones
            if (!monto || monto <= 0) {
                showError('⚠️ Ingresa un monto válido');
                return;
            }
            if (!categoria.trim()) {
                showError('⚠️ Selecciona una categoría');
                return;
            }

            btnSubmit.disabled = true;
            const textOriginal = btnSubmit.textContent;
            btnSubmit.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';

            try {
                const endpoint = '${tipo === 'gasto' ? '/gastos/rapido' : '/gastos/ingreso-rapido'}';
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monto, categoria, descripcion })
                });

                const data = await response.json();

                if (data.ok) {
                    // ✅ Éxito - cerrar ventana y volver a principal
                    setTimeout(() => {
                        window.opener.location.reload();
                        window.close();
                    }, 500);
                } else {
                    showError('❌ Error: ' + (data.error || 'No se pudo registrar'));
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = textOriginal;
                }
            } catch (error) {
                console.error(error);
                showError('❌ Error de conexión: ' + error.message);
                btnSubmit.disabled = false;
                btnSubmit.textContent = textOriginal;
            }
        });

        function showError(message) {
            alertBox.textContent = message;
            alertBox.classList.add('show');
            setTimeout(() => {
                alertBox.classList.remove('show');
            }, 5000);
        }

        // Focus en monto al cargar
        document.getElementById('monto').focus();
    </script>
</body>
</html>
        `;

        res.send(html);
    });

    // Listar gastos del mes
    router.get('/', checkPermission, async (req, res) => {
        try {
            const mes = req.query.mes || new Date().toISOString().slice(0, 7);
            const tipo = req.query.tipo || 'todos'; // 'todos', 'negocio', 'personal'

            let query = `
                SELECT g.*, p.nombre AS proveedor_nombre
                FROM gastos g
                LEFT JOIN proveedores p ON g.proveedor_id = p.id
                WHERE strftime('%Y-%m', g.fecha) = ?
            `;
            const params = [mes];

            // Agregar filtro de tipo si no es 'todos'
            if (tipo === 'negocio') {
                query += ` AND g.tipo = 'negocio'`;
            } else if (tipo === 'personal') {
                query += ` AND g.tipo = 'personal'`;
            }

            query += ` ORDER BY g.fecha DESC`;

            const gastos = await db.all(query, ...params) || [];

            const proveedores = await db.all("SELECT id, nombre FROM proveedores ORDER BY nombre ASC") || [];
            const totalMes = gastos.reduce((s, g) => s + (g.monto || 0), 0);
            const totalNegocio = gastos.filter(g => g.tipo === 'negocio').reduce((s, g) => s + (g.monto || 0), 0);
            const totalPersonal = gastos.filter(g => g.tipo === 'personal').reduce((s, g) => s + (g.monto || 0), 0);
            const totalPendiente = gastos.filter(g => g.estado_pago === 'pendiente').reduce((s, g) => s + (g.monto || 0), 0);
            const totalPendienteNegocio = gastos.filter(g => g.tipo === 'negocio' && g.estado_pago === 'pendiente').reduce((s, g) => s + (g.monto || 0), 0);

            res.render('gastos/index', {
                title: 'Gastos',
                gastos,
                proveedores,
                CATEGORIAS_NEGOCIO,
                CATEGORIAS_PERSONAL,
                mes,
                tipo,
                totalMes,
                totalNegocio,
                totalPersonal,
                totalPendiente,
                totalPendienteNegocio,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al cargar gastos: ' + err.message);
            res.render('gastos/index', {
                title: 'Gastos',
                gastos: [],
                proveedores: [],
                CATEGORIAS_NEGOCIO,
                CATEGORIAS_PERSONAL,
                mes: '',
                tipo: 'todos',
                totalMes: 0,
                totalNegocio: 0,
                totalPersonal: 0,
                totalPendiente: 0,
                totalPendienteNegocio: 0
            });
        }
    });

    // Crear nuevo gasto
    router.post('/nuevo', checkPermission, async (req, res) => {
        const { fecha, categoria, descripcion, monto, estado_pago, proveedor_id, tipo, metodo_pago, tiene_factura } = req.body;
        try {
            // Validaciones detalladas y educativas
            if (!fecha) {
                req.flash('error', 'Debes indicar la fecha del gasto.');
                return res.redirect('/gastos');
            }
            if (!tipo) {
                req.flash('error', 'Seleccioná si es un gasto de Negocio o Personal.');
                return res.redirect('/gastos');
            }
            if (!categoria) {
                req.flash('error', 'Seleccioná una categoría para clasificar el gasto correctamente.');
                return res.redirect('/gastos');
            }
            if (!descripcion || descripcion.trim().length === 0) {
                req.flash('error', 'Describí el gasto con detalle. Ejemplo: "Resma papel A4 para trabajos" o "Sueldo completo de Ariel".');
                return res.redirect('/gastos');
            }
            if (!monto) {
                req.flash('error', 'Ingresá el monto que gastaste.');
                return res.redirect('/gastos');
            }

            const montoNum = parseFloat(monto);
            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'El monto debe ser un número mayor a cero. Ejemplo: 1500 o 350.50');
                return res.redirect('/gastos');
            }

            await db.run(
                "INSERT INTO gastos (fecha, categoria, descripcion, monto, estado_pago, proveedor_id, tipo, usuario_id, metodo_pago, tiene_factura) VALUES (?,?,?,?,?,?,?,?,?,?)",
                [fecha, categoria, descripcion.trim(), montoNum, estado_pago || 'pendiente', proveedor_id || null, tipo || 'negocio', req.session.user?.id || null, metodo_pago || 'efectivo', tiene_factura === '1' ? 1 : 0]
            );
            const tipoLabel = tipo === 'negocio' ? 'de Negocio' : 'Personal';
            req.flash('success', `✅ Gasto ${tipoLabel} de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado exitosamente`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al registrar gasto: ' + err.message);
        }
        res.redirect('/gastos');
    });

    // Editar gasto
    router.post('/:id/editar', checkPermission, async (req, res) => {
        const { fecha, categoria, descripcion, monto, estado_pago, proveedor_id, tipo, metodo_pago, tiene_factura } = req.body;
        try {
            const id = parseInt(req.params.id);

            // Mismas validaciones que al crear
            if (!fecha) {
                req.flash('error', 'Debes indicar la fecha del gasto.');
                return res.redirect('/gastos');
            }
            if (!tipo) {
                req.flash('error', 'Seleccioná si es un gasto de Negocio o Personal.');
                return res.redirect('/gastos');
            }
            if (!categoria) {
                req.flash('error', 'Seleccioná una categoría para clasificar el gasto correctamente.');
                return res.redirect('/gastos');
            }
            if (!descripcion || descripcion.trim().length === 0) {
                req.flash('error', 'Describí el gasto con detalle.');
                return res.redirect('/gastos');
            }
            if (!monto) {
                req.flash('error', 'Ingresá el monto que gastaste.');
                return res.redirect('/gastos');
            }

            const montoNum = parseFloat(monto);
            if (isNaN(montoNum) || montoNum <= 0) {
                req.flash('error', 'El monto debe ser un número mayor a cero.');
                return res.redirect('/gastos');
            }

            await db.run(
                "UPDATE gastos SET fecha = ?, categoria = ?, descripcion = ?, monto = ?, estado_pago = ?, proveedor_id = ?, tipo = ?, metodo_pago = ?, tiene_factura = ? WHERE id = ?",
                [fecha, categoria, descripcion.trim(), montoNum, estado_pago || 'pendiente', proveedor_id || null, tipo || 'negocio', metodo_pago || 'efectivo', tiene_factura === '1' ? 1 : 0, id]
            );
            req.flash('success', `✅ Gasto actualizado correctamente`);
        } catch (err) {
            console.error('Error:', err);
            req.flash('error', 'Error al actualizar gasto: ' + err.message);
        }
        res.redirect('/gastos');
    });

    // Marcar gasto como pagado y registrar en caja diaria
    router.post('/:id/pagar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);

            // Obtener datos del gasto
            const gasto = await db.get("SELECT * FROM gastos WHERE id = ?", [id]);
            if (!gasto) {
                req.flash('error', 'Gasto no encontrado');
                return res.redirect('/gastos');
            }

            // Actualizar estado_pago a 'pagado'
            await db.run("UPDATE gastos SET estado_pago = 'pagado' WHERE id = ?", [id]);

            // Registrar el egreso en movimientos_caja
            const fechaLocal = obtenerFechaLocal();
            const turno = turnoByHora(fechaLocal.timestamp);

            await db.run(
                `INSERT INTO movimientos_caja
                 (tipo, concepto, categoria, monto, metodo_pago, fecha, turno)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    'egreso',
                    `Gasto pagado - ${gasto.descripcion || gasto.categoria}`,
                    gasto.categoria,
                    gasto.monto,
                    gasto.metodo_pago || 'manual',
                    fechaLocal.timestamp,
                    turno
                ]
            );

            req.flash('success', '✅ Gasto marcado como pagado y registrado en caja');
        } catch (err) {
            console.error('Error al pagar gasto:', err);
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/gastos');
    });

    // Pago parcial de gasto
    router.post('/:id/pago-parcial', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const { monto_pago, metodo_pago } = req.body;
            const montoPago = parseFloat(monto_pago);

            if (!montoPago || montoPago <= 0) {
                req.flash('error', 'Ingresá un monto válido para el pago');
                return res.redirect('/gastos');
            }

            // Obtener datos del gasto
            const gasto = await db.get("SELECT * FROM gastos WHERE id = ?", id);
            if (!gasto) {
                req.flash('error', 'Gasto no encontrado');
                return res.redirect('/gastos');
            }

            if (montoPago > gasto.monto) {
                req.flash('error', `No podés pagar más de lo que debe ($${gasto.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})})`);
                return res.redirect('/gastos');
            }

            // Restar el pago parcial del monto del gasto
            const nuevoMonto = gasto.monto - montoPago;
            const nuevoEstado = nuevoMonto <= 0 ? 'pagado' : 'pendiente';

            await db.run(
                "UPDATE gastos SET monto = ?, estado_pago = ? WHERE id = ?",
                [nuevoMonto, nuevoEstado, id]
            );

            // Registrar el egreso en movimientos_caja
            const fechaLocal = obtenerFechaLocal();
            const turno = turnoByHora(fechaLocal.timestamp);

            await db.run(
                `INSERT INTO movimientos_caja
                 (tipo, concepto, categoria, monto, metodo_pago, fecha, turno)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    'egreso',
                    `Pago parcial - ${gasto.descripcion || gasto.categoria}`,
                    gasto.categoria,
                    montoPago,
                    metodo_pago || gasto.metodo_pago || 'manual',
                    fechaLocal.timestamp,
                    turno
                ]
            );

            req.flash('success', `✅ Pago parcial de $${montoPago.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado. ${nuevoEstado === 'pagado' ? 'Gasto completamente pagado.' : `Monto pendiente: $${nuevoMonto.toLocaleString('es-AR', {minimumFractionDigits: 2})}`}`);
        } catch (err) {
            console.error('Error al registrar pago parcial:', err);
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/gastos');
    });

    // Eliminar gasto
    router.post('/:id/eliminar', checkPermission, async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await db.run("DELETE FROM gastos WHERE id = ?", id);
            req.flash('success', '✅ Gasto eliminado correctamente');
        } catch (err) {
            req.flash('error', 'Error: ' + err.message);
        }
        res.redirect('/gastos');
    });

    // 🚀 GASTO RÁPIDO (endpoint JSON para botón flotante)
    // ✅ Validación de autenticación con respuesta JSON
    router.post('/rapido', async (req, res) => {
        try {
            // Verificar autenticación y devolver JSON si falla
            if (!req.session || !req.session.user) {
                return res.status(401).json({ ok: false, error: 'Debes iniciar sesión' });
            }

            const { monto, categoria, descripcion } = req.body;

            // Validaciones
            if (!monto || parseFloat(monto) <= 0) {
                return res.json({ ok: false, error: 'Monto inválido' });
            }
            if (!categoria || categoria.trim().length === 0) {
                return res.json({ ok: false, error: 'Categoría requerida' });
            }

            const montoNum = parseFloat(monto);
            const { fecha, timestamp } = obtenerFechaLocal();
            const turno = turnoByHora(timestamp);

            // Insertar egreso en movimientos_caja (para que aparezca en caja diaria)
            await db.run(
                `INSERT INTO movimientos_caja
                 (tipo, concepto, categoria, monto, metodo_pago, fecha, turno)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    'egreso',
                    (descripcion || 'Gasto Rápido').trim(),
                    categoria,
                    montoNum,
                    'manual',
                    timestamp,
                    turno
                ]
            );

            res.json({ ok: true, message: `Gasto de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado` });
        } catch (err) {
            console.error('Error en gasto rápido:', err);
            res.json({ ok: false, error: err.message });
        }
    });

    // 🚀 INGRESO RÁPIDO (endpoint JSON para botón flotante)
    // ✅ Validación de autenticación con respuesta JSON
    router.post('/ingreso-rapido', async (req, res) => {
        try {
            // Verificar autenticación y devolver JSON si falla
            if (!req.session || !req.session.user) {
                return res.status(401).json({ ok: false, error: 'Debes iniciar sesión' });
            }

            const { monto, categoria, descripcion } = req.body;

            // Validaciones
            if (!monto || parseFloat(monto) <= 0) {
                return res.json({ ok: false, error: 'Monto inválido' });
            }
            if (!categoria || categoria.trim().length === 0) {
                return res.json({ ok: false, error: 'Categoría requerida' });
            }

            const montoNum = parseFloat(monto);
            const { fecha, timestamp } = obtenerFechaLocal();
            const turno = turnoByHora(timestamp);

            // Insertar ingreso en movimientos_caja
            await db.run(
                `INSERT INTO movimientos_caja
                 (tipo, concepto, categoria, monto, metodo_pago, fecha, turno)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    'ingreso',
                    (descripcion || 'Ingreso Rápido').trim(),
                    categoria,
                    montoNum,
                    'manual',
                    timestamp,
                    turno
                ]
            );

            res.json({ ok: true, message: `Ingreso de $${montoNum.toLocaleString('es-AR', {minimumFractionDigits: 2})} registrado` });
        } catch (err) {
            console.error('Error en ingreso rápido:', err);
            res.json({ ok: false, error: err.message });
        }
    });

    return router;
};
