/**
 * API de Inteligencia Artificial para análisis y categorización
 * Utiliza Claude API (Anthropic) para análisis financiero y categorización automática
 */

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const Groq = require('groq-sdk');

module.exports = (db) => {
    const router = express.Router();

    // Inicializar cliente de Anthropic
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || ''
    });

    // Inicializar cliente de Groq
    const groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY || ''
    });

    // Verificar que la API key de Anthropic esté configurada
    const apiKeyConfigured = !!process.env.ANTHROPIC_API_KEY?.trim();

    // Verificar que la API key de Groq esté configurada
    const groqKeyConfigured = !!process.env.GROQ_API_KEY?.trim();

    // Categorías válidas de gastos (basadas en gastos.js)
    const CATEGORIAS_VALIDAS = [
        'Servicios',
        'Proveedores',
        'Impuestos',
        'Salarios',
        'Transporte',
        'Alquiler',
        'Servicios Básicos',
        'Marketing',
        'Insumos papel',
        'Insumos tinta/toner',
        'Otros'
    ];

    /**
     * POST /api/ia/analizar
     * Análisis financiero de la situación actual del negocio
     * Requiere: rol admin, API key configurada
     */
    router.post('/analizar', async (req, res) => {
        try {
            if (!apiKeyConfigured) {
                return res.status(400).json({
                    ok: false,
                    error: 'API key de Anthropic no configurada'
                });
            }

            if (!req.session.user || req.session.user.rol !== 'admin') {
                return res.status(403).json({
                    ok: false,
                    error: 'No autorizado'
                });
            }

            // Obtener datos financieros actuales
            const hoy = new Date().toISOString().slice(0, 10);
            const inicioMes = new Date();
            inicioMes.setDate(1);
            const fechaInicio = inicioMes.toISOString().slice(0, 10);

            // Ingresos mes
            const ingresosMes = (await db.get(
                "SELECT COALESCE(SUM(monto),0) AS total FROM movimientos_caja WHERE tipo = 'ingreso' AND DATE(fecha) >= ?",
                fechaInicio
            ))?.total || 0;

            // Gastos negocio mes
            const gastosMes = (await db.get(
                "SELECT COALESCE(SUM(monto),0) AS total FROM gastos WHERE tipo = 'negocio' AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')"
            ))?.total || 0;

            // Saldo neto
            const saldoNeto = ingresosMes - gastosMes;

            // Deudas pendientes
            const deudaPendiente = (await db.get(`
                SELECT COALESCE(SUM(monto_total - monto_pagado), 0) AS total
                FROM deudas_proveedores
                WHERE estado != 'pagado'
            `))?.total || 0;

            // Pedidos pendientes
            const pedidosPendientes = (await db.get(
                "SELECT COUNT(*) AS c FROM pedidos WHERE estado = 'PENDIENTE'"
            ))?.c || 0;

            // Preprar prompt para Claude
            const prompt = `Eres un asesor financiero para una imprenta. Analiza la siguiente situación y proporciona recomendaciones concisas:

**SITUACIÓN FINANCIERA ACTUAL:**
- Ingresos este mes: $${ingresosMes.toLocaleString('es-AR')}
- Gastos negocio este mes: $${gastosMes.toLocaleString('es-AR')}
- Saldo neto: $${saldoNeto.toLocaleString('es-AR')}
- Deuda pendiente a proveedores: $${deudaPendiente.toLocaleString('es-AR')}
- Pedidos pendientes: ${pedidosPendientes}

Proporciona un análisis breve (3-5 puntos) con recomendaciones accionables para mejorar la salud financiera.`;

            // Llamar a Claude API
            const message = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 800,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const analisis = message.content[0]?.text || 'No se pudo generar análisis';

            return res.json({
                ok: true,
                analisis
            });

        } catch (err) {
            console.error('Error en /api/ia/analizar:', err);
            return res.status(500).json({
                ok: false,
                error: err.message || 'Error al generar análisis'
            });
        }
    });

    /**
     * POST /api/ia/sugerir-precio
     * Sugiere un precio para un pedido basado en historial de pedidos similares
     * Body: { pedido_id: number }
     * Requiere: API key configurada
     */
    router.post('/sugerir-precio', async (req, res) => {
        try {
            if (!apiKeyConfigured) {
                return res.status(400).json({
                    ok: false,
                    error: 'API key de Anthropic no configurada'
                });
            }

            const { pedido_id } = req.body;

            if (!pedido_id) {
                return res.status(400).json({
                    ok: false,
                    error: 'pedido_id requerido'
                });
            }

            // Obtener datos del pedido actual
            const pedido = await db.get(
                `SELECT p.*, c.name AS cliente_nombre
                 FROM pedidos p
                 LEFT JOIN clients c ON p.client_id = c.id
                 WHERE p.id = ?`,
                pedido_id
            );

            if (!pedido) {
                return res.status(404).json({
                    ok: false,
                    error: 'Pedido no encontrado'
                });
            }

            // Obtener productos del pedido actual
            const productosActuales = await db.all(
                `SELECT * FROM productos WHERE pedido_id = ?`,
                pedido_id
            );

            // Obtener historial de precios para productos similares
            let historialPrecios = [];
            for (const prod of productosActuales) {
                const similares = await db.all(
                    `SELECT p.precio, pr.material, pr.cantidad, pr.ancho, pr.alto, pr.precio
                     FROM productos pr
                     JOIN pedidos p ON pr.pedido_id = p.id
                     WHERE LOWER(pr.material) LIKE LOWER(?)
                     AND p.estado IN ('LISTO', 'ENTREGADO')
                     ORDER BY p.fecha DESC
                     LIMIT 5`,
                    `%${prod.material}%`
                );

                if (similares.length > 0) {
                    const promedio = similares.reduce((sum, s) => sum + parseFloat(s.precio || 0), 0) / similares.length;
                    historialPrecios.push({
                        material: prod.material,
                        cantidad: prod.cantidad,
                        medidas: `${prod.ancho}m × ${prod.alto}m`,
                        precioActual: parseFloat(prod.precio || 0),
                        precioPromedio: Math.round(promedio),
                        ejemplos: similares.slice(0, 3).map(s => parseFloat(s.precio || 0))
                    });
                }
            }

            // Construir prompt para Claude
            let detallesProductos = historialPrecios.map(h =>
                `- ${h.material} (${h.cantidad}x, medidas: ${h.medidas}): Precio actual: $${h.precioActual}, Promedio histórico: $${h.precioPromedio}, Ejemplos: [${h.ejemplos.join(', ')}]`
            ).join('\n');

            if (!detallesProductos) {
                detallesProductos = productosActuales.map(p =>
                    `- ${p.material} (${p.cantidad}x, medidas: ${p.ancho}m × ${p.alto}m): Precio actual: $${p.precio}`
                ).join('\n');
            }

            const prompt = `Eres un asesor de precios para una imprenta. Analiza los precios históricos y sugiere un precio justo para el siguiente pedido:

**PRODUCTOS EN EL PEDIDO:**
${detallesProductos}

**INFORMACIÓN DEL PEDIDO:**
- Total actual: $${pedido.precio || 0}
- Cliente: ${pedido.cliente_nombre}

Basándote en el historial de precios similares, sugiere un precio justo en pesos argentinos.
Responde en formato:
PRECIO SUGERIDO: $[número]
JUSTIFICACIÓN: [1-2 líneas explicando por qué]`;

            // Llamar a Claude API
            const message = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 200,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const respuesta = message.content[0]?.text || '';

            // Extraer precio sugerido
            const precioMatch = respuesta.match(/PRECIO SUGERIDO:\s*\$?([\d,\.]+)/);
            const precioSugerido = precioMatch ? parseInt(precioMatch[1].replace(/[,\.]/g, '')) : pedido.precio;

            return res.json({
                ok: true,
                precioSugerido,
                respuesta: respuesta.trim(),
                historialPrecios: historialPrecios.length > 0 ? historialPrecios : null
            });

        } catch (err) {
            console.error('Error en /api/ia/sugerir-precio:', err);
            return res.status(500).json({
                ok: false,
                error: err.message || 'Error al sugerir precio'
            });
        }
    });

    /**
     * POST /api/ia/estimar-ganancia
     * Estima ganancia para un presupuesto basada en costos y precios de mercado
     * Body: { presupuesto_id: number }
     * Requiere: API key configurada
     */
    router.post('/estimar-ganancia', async (req, res) => {
        try {
            if (!apiKeyConfigured) {
                return res.status(400).json({
                    ok: false,
                    error: 'API key de Anthropic no configurada'
                });
            }

            const { presupuesto_id } = req.body;

            if (!presupuesto_id) {
                return res.status(400).json({
                    ok: false,
                    error: 'presupuesto_id requerido'
                });
            }

            // Obtener presupuesto
            const presupuesto = await db.get(
                `SELECT p.*, c.name AS cliente_nombre
                 FROM presupuestos p
                 LEFT JOIN clients c ON p.client_id = c.id
                 WHERE p.id = ?`,
                presupuesto_id
            );

            if (!presupuesto) {
                return res.status(404).json({
                    ok: false,
                    error: 'Presupuesto no encontrado'
                });
            }

            // Obtener productos del presupuesto
            const productos = await db.all(
                `SELECT * FROM productos_presupuesto WHERE presupuesto_id = ?`,
                presupuesto_id
            );

            // Obtener costos promedio de materiales
            const costosPromedio = {};
            for (const prod of productos) {
                if (prod.material && prod.material.trim()) {
                    const costo = await db.get(
                        `SELECT AVG(monto) as costo_promedio FROM gastos
                         WHERE LOWER(descripcion) LIKE LOWER(?)
                         AND tipo = 'negocio'
                         AND strftime('%Y-%m', fecha) >= date('now', '-3 months')
                         LIMIT 1`,
                        `%${prod.material}%`
                    );
                    costosPromedio[prod.material] = costo?.costo_promedio || 0;
                }
            }

            // Calcular costo total estimado
            let costoTotal = 0;
            const detallesCosto = [];
            for (const prod of productos) {
                const costo = costosPromedio[prod.material] || 0;
                const costoItem = (costo * (prod.cantidad || 1)) * 0.1; // Estimación simple
                costoTotal += costoItem;
                detallesCosto.push({
                    material: prod.material,
                    cantidad: prod.cantidad,
                    costoEstimado: Math.round(costoItem)
                });
            }

            // Estimar precio de venta actual y máximo
            const precioVentaActual = parseFloat(presupuesto.total_final || presupuesto.total || 0);
            const gananciaBruta = precioVentaActual - costoTotal;
            const margenActual = costoTotal > 0 ? ((gananciaBruta / precioVentaActual) * 100).toFixed(1) : 0;

            // Obtener promedio de márgenes de ganancias recientes
            const margenPromedio = await db.get(
                `SELECT AVG((p.precio - (p.precio * 0.3)) / p.precio * 100) as margen
                 FROM pedidos p
                 WHERE p.estado IN ('LISTO', 'ENTREGADO')
                 AND p.fecha >= date('now', '-2 months')`
            );

            const margenRecomendado = margenPromedio?.margen || 35;
            const precioRecomendado = costoTotal > 0
                ? Math.round(costoTotal / (1 - margenRecomendado / 100))
                : precioVentaActual;

            // Construir prompt para Claude
            const prompt = `Eres un asesor de negocios para una imprenta. Analiza la siguiente estimación de ganancia para un presupuesto:

**INFORMACIÓN DEL PRESUPUESTO:**
- Cliente: ${presupuesto.cliente_nombre || 'Sin especificar'}
- Precio de venta actual: $${precioVentaActual}
- Costo estimado: $${Math.round(costoTotal)}
- Ganancia bruta: $${Math.round(gananciaBruta)}
- Margen actual: ${margenActual}%
- Margen recomendado: ${margenRecomendado.toFixed(1)}%
- Precio recomendado para margen: $${precioRecomendado}

**DESGLOSE DE COSTOS:**
${detallesCosto.map(d => `- ${d.material} (${d.cantidad}): $${d.costoEstimado}`).join('\n')}

Proporciona un análisis breve con recomendaciones sobre si el precio actual es competitivo y si debería ajustarse.`;

            // Llamar a Claude API
            const message = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const analisis = message.content[0]?.text || '';

            return res.json({
                ok: true,
                precioActual: precioVentaActual,
                costoEstimado: Math.round(costoTotal),
                gananciaBruta: Math.round(gananciaBruta),
                margenActual: parseFloat(margenActual),
                margenRecomendado: margenRecomendado,
                precioRecomendado,
                analisis: analisis.trim(),
                detallesCosto
            });

        } catch (err) {
            console.error('Error en /api/ia/estimar-ganancia:', err);
            return res.status(500).json({
                ok: false,
                error: err.message || 'Error al estimar ganancia'
            });
        }
    });

    /**
     * POST /api/ia/predicciones
     * Predice ingresos, gastos y flujo de caja para los próximos 30 días
     * Requiere: API key configurada, rol admin
     */
    router.post('/predicciones', async (req, res) => {
        try {
            if (!apiKeyConfigured) {
                return res.status(400).json({
                    ok: false,
                    error: 'API key de Anthropic no configurada'
                });
            }

            if (!req.session.user || req.session.user.rol !== 'admin') {
                return res.status(403).json({
                    ok: false,
                    error: 'No autorizado'
                });
            }

            // Obtener pedidos pendientes y en producción (ingresos futuros)
            const pedidosPendientes = await db.all(
                `SELECT precio, fecha_entrega FROM pedidos
                 WHERE estado IN ('PENDIENTE', 'EN_PRODUCCION', 'LISTO')
                 AND (fecha_entrega IS NULL OR DATE(fecha_entrega) <= DATE('now', '+30 days'))`
            );

            const ingresosPredichosTotal = pedidosPendientes.reduce((sum, p) => sum + (parseFloat(p.precio) || 0), 0);

            // Obtener gastos históricos para promediar
            const gastosHistorico = await db.all(
                `SELECT monto, fecha FROM gastos
                 WHERE tipo = 'negocio'
                 AND strftime('%Y-%m', fecha) >= date('now', '-3 months')
                 ORDER BY fecha ASC`
            );

            const gastoPromedioDiario = gastosHistorico.length > 0
                ? gastosHistorico.reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0) / 90
                : 0;
            const gastosProdichos30 = Math.round(gastoPromedioDiario * 30);

            // Obtener deudas activas (movimientos de caja de los últimos 30 días)
            const ingresosMesActual = (await db.get(
                `SELECT COALESCE(SUM(monto), 0) AS total FROM movimientos_caja
                 WHERE tipo = 'ingreso'
                 AND strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`
            ))?.total || 0;

            const gastosPromedioMensual = (await db.get(
                `SELECT COALESCE(AVG(total), 0) AS avg FROM (
                    SELECT SUM(monto) as total FROM gastos
                    WHERE tipo = 'negocio'
                    GROUP BY strftime('%Y-%m', fecha)
                    ORDER BY fecha DESC
                    LIMIT 3
                )`
            ))?.avg || 0;

            const saldoProyectado = ingresosPredichosTotal - gastosProdichos30;

            // Datos diarios para gráfico (últimos 30 días + próximos 30)
            const datosGrafico = [];
            for (let i = -30; i <= 30; i++) {
                const fecha = new Date();
                fecha.setDate(fecha.getDate() + i);
                const fechaStr = fecha.toISOString().slice(0, 10);

                let ingreso = 0;
                let gasto = 0;

                if (i <= 0) {
                    // Datos históricos
                    const movimientos = await db.all(
                        `SELECT tipo, SUM(monto) as total FROM movimientos_caja
                         WHERE DATE(fecha) = ?
                         GROUP BY tipo`,
                        fechaStr
                    );
                    movimientos.forEach(m => {
                        if (m.tipo === 'ingreso') ingreso = parseFloat(m.total) || 0;
                    });

                    const gastosDelDia = await db.get(
                        `SELECT COALESCE(SUM(monto), 0) as total FROM gastos
                         WHERE tipo = 'negocio' AND DATE(fecha) = ?`,
                        fechaStr
                    );
                    gasto = parseFloat(gastosDelDia.total) || 0;
                } else {
                    // Estimaciones futuras
                    ingreso = Math.round(ingresosPredichosTotal / 30);
                    gasto = Math.round(gastoPromedioDiario);
                }

                datosGrafico.push({
                    fecha: fechaStr,
                    ingreso,
                    gasto,
                    saldo: ingreso - gasto,
                    esFuturo: i > 0
                });
            }

            // Construir prompt para Claude
            const prompt = `Eres un analista financiero para una imprenta. Basándote en las predicciones de los próximos 30 días, proporciona un análisis breve:

**PROYECCIÓN PRÓXIMOS 30 DÍAS:**
- Ingresos predichos: $${ingresosPredichosTotal.toLocaleString('es-AR')}
- Gastos estimados: $${gastosProdichos30.toLocaleString('es-AR')}
- Saldo proyectado: $${saldoProyectado.toLocaleString('es-AR')}
- Gasto promedio histórico mensual: $${Math.round(gastosPromedioMensual).toLocaleString('es-AR')}

**RECOMENDACIONES:**
Proporciona 2-3 recomendaciones clave basadas en estas proyecciones.`;

            // Llamar a Claude API
            const message = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 250,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const analisisPredicciones = message.content[0]?.text || '';

            return res.json({
                ok: true,
                resumen: {
                    ingresosPredichosTotal,
                    gastosProdichos30,
                    saldoProyectado,
                    gastoPromedioDiario: Math.round(gastoPromedioDiario)
                },
                datosGrafico,
                analisisPredicciones: analisisPredicciones.trim()
            });

        } catch (err) {
            console.error('Error en /api/ia/predicciones:', err);
            return res.status(500).json({
                ok: false,
                error: err.message || 'Error al generar predicciones'
            });
        }
    });

    /**
     * POST /api/ia/perfil-cliente
     * Analiza el perfil de riesgo de un cliente
     * Body: { cliente_id: number }
     * Requiere: API key configurada
     */
    router.post('/perfil-cliente', async (req, res) => {
        try {
            if (!apiKeyConfigured) {
                return res.status(400).json({
                    ok: false,
                    error: 'API key de Anthropic no configurada'
                });
            }

            const { cliente_id } = req.body;

            if (!cliente_id) {
                return res.status(400).json({
                    ok: false,
                    error: 'cliente_id requerido'
                });
            }

            // Obtener información del cliente
            const cliente = await db.get(
                `SELECT * FROM clients WHERE id = ?`,
                cliente_id
            );

            if (!cliente) {
                return res.status(404).json({
                    ok: false,
                    error: 'Cliente no encontrado'
                });
            }

            // Obtener total de deuda pendiente
            const deudaTotal = (await db.get(
                `SELECT COALESCE(SUM(monto_restante), 0) AS total FROM pedidos
                 WHERE client_id = ? AND monto_restante > 0`,
                cliente_id
            ))?.total || 0;

            // Obtener cantidad de pedidos
            const pedidosTotales = (await db.get(
                `SELECT COUNT(*) AS c FROM pedidos WHERE client_id = ?`,
                cliente_id
            ))?.c || 0;

            // Obtener promedio de tiempo de pago
            const tiempoPromedioPago = await db.get(
                `SELECT AVG(CAST((julianday(fecha_pago) - julianday(fecha)) AS INTEGER)) as dias
                 FROM pedidos
                 WHERE client_id = ? AND fecha_pago IS NOT NULL`,
                cliente_id
            );

            const diasPromedio = tiempoPromedioPago?.dias ? Math.round(tiempoPromedioPago.dias) : null;

            // Obtener pedidos vencidos sin pagar
            const pedidosVencidos = (await db.get(
                `SELECT COUNT(*) AS c FROM pedidos
                 WHERE client_id = ? AND monto_restante > 0 AND fecha < date('now', '-30 days')`,
                cliente_id
            ))?.c || 0;

            // Calcular score de riesgo (0-100)
            let riesgoScore = 0;
            let factoresRiesgo = [];

            if (deudaTotal > 100000) {
                riesgoScore += 30;
                factoresRiesgo.push('Deuda acumulada muy alta');
            } else if (deudaTotal > 50000) {
                riesgoScore += 20;
                factoresRiesgo.push('Deuda acumulada elevada');
            } else if (deudaTotal > 10000) {
                riesgoScore += 10;
                factoresRiesgo.push('Deuda acumulada moderada');
            }

            if (pedidosVencidos > 3) {
                riesgoScore += 25;
                factoresRiesgo.push('Múltiples pedidos vencidos');
            } else if (pedidosVencidos > 1) {
                riesgoScore += 15;
                factoresRiesgo.push('Algunos pedidos con retraso');
            }

            if (diasPromedio && diasPromedio > 60) {
                riesgoScore += 20;
                factoresRiesgo.push('Tiempo de pago muy lento');
            } else if (diasPromedio && diasPromedio > 30) {
                riesgoScore += 10;
                factoresRiesgo.push('Tiempo de pago algo lento');
            }

            // Categoría de riesgo
            let nivelRiesgo = 'BAJO';
            if (riesgoScore > 70) {
                nivelRiesgo = 'MUY ALTO';
            } else if (riesgoScore > 50) {
                nivelRiesgo = 'ALTO';
            } else if (riesgoScore > 25) {
                nivelRiesgo = 'MEDIO';
            }

            // Prompt para Claude
            const prompt = `Eres un analista de crédito. Analiza el perfil de riesgo del siguiente cliente:

**INFORMACIÓN DEL CLIENTE:**
- Nombre: ${cliente.name}
- Deuda total pendiente: $${deudaTotal.toLocaleString('es-AR')}
- Total de pedidos: ${pedidosTotales}
- Días promedio de pago: ${diasPromedio || 'Sin historial'}
- Pedidos vencidos (>30 días): ${pedidosVencidos}
- Nivel de riesgo: ${nivelRiesgo}
- Score de riesgo: ${riesgoScore}/100

Proporciona una evaluación breve con recomendaciones sobre cómo proceder con este cliente.`;

            // Llamar a Claude API
            const message = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 250,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const evaluacion = message.content[0]?.text || '';

            return res.json({
                ok: true,
                cliente: {
                    id: cliente.id,
                    nombre: cliente.name,
                    email: cliente.email,
                    telefono: cliente.telefono,
                    direccion: cliente.direccion,
                    cuit: cliente.cuit
                },
                metricas: {
                    deudaTotal: Math.round(deudaTotal),
                    pedidosTotales,
                    diasPromedioPago: diasPromedio,
                    pedidosVencidos,
                    riesgoScore,
                    nivelRiesgo
                },
                evaluacion: evaluacion.trim()
            });

        } catch (err) {
            console.error('Error en /api/ia/perfil-cliente:', err);
            return res.status(500).json({
                ok: false,
                error: err.message || 'Error al analizar perfil de cliente'
            });
        }
    });

    /**
     * POST /api/ia/analisis-proveedores
     * Analiza y compara precios de proveedores para identificar el mejor
     * Requiere: API key configurada, rol admin
     */
    router.post('/analisis-proveedores', async (req, res) => {
        try {
            if (!apiKeyConfigured) {
                return res.status(400).json({
                    ok: false,
                    error: 'API key de Anthropic no configurada'
                });
            }

            if (!req.session.user || req.session.user.rol !== 'admin') {
                return res.status(403).json({
                    ok: false,
                    error: 'No autorizado'
                });
            }

            // Obtener todos los proveedores
            const proveedores = await db.all(
                `SELECT * FROM proveedores ORDER BY nombre ASC`
            );

            if (!proveedores || proveedores.length === 0) {
                return res.status(404).json({
                    ok: false,
                    error: 'No hay proveedores registrados'
                });
            }

            // Analizar deudas y compras por proveedor
            const analisisProveedores = [];
            let totalDeudas = 0;

            for (const prov of proveedores) {
                const deudasProv = await db.all(
                    `SELECT * FROM deudas_proveedores WHERE proveedor_id = ?`,
                    prov.id
                );

                const totalComprado = deudasProv.reduce((sum, d) => sum + (parseFloat(d.monto_total) || 0), 0);
                const totalPagado = deudasProv.reduce((sum, d) => sum + (parseFloat(d.monto_pagado) || 0), 0);
                const deudaPendiente = totalComprado - totalPagado;
                const porcentajePago = totalComprado > 0 ? ((totalPagado / totalComprado) * 100).toFixed(1) : 0;
                const precioPromedio = deudasProv.length > 0
                    ? (totalComprado / deudasProv.length).toFixed(2)
                    : 0;

                totalDeudas += deudaPendiente;

                analisisProveedores.push({
                    id: prov.id,
                    nombre: prov.nombre,
                    telefono: prov.telefono,
                    email: prov.email,
                    totalComprado: Math.round(totalComprado),
                    totalPagado: Math.round(totalPagado),
                    deudaPendiente: Math.round(deudaPendiente),
                    porcentajePago: parseFloat(porcentajePago),
                    precioPromedio: parseFloat(precioPromedio),
                    cantidadCompras: deudasProv.length,
                    estado: deudaPendiente > 0 ? 'CON_DEUDA' : 'PAGADO'
                });
            }

            // Ordenar por precio promedio (más económicos primero)
            analisisProveedores.sort((a, b) => a.precioPromedio - b.precioPromedio);

            // Calcular diferencia de precios
            const precioMasBarato = analisisProveedores.length > 0 ? analisisProveedores[0].precioPromedio : 0;
            const precioMasCaro = analisisProveedores.length > 0
                ? analisisProveedores[analisisProveedores.length - 1].precioPromedio
                : 0;
            const ahorroPromedio = precioMasCaro - precioMasBarato;

            // Construir prompt para Claude
            const proveedorInfo = analisisProveedores.map(p =>
                `- ${p.nombre}: Precio promedio: $${p.precioPromedio}, Compras: ${p.cantidadCompras}, Deuda: $${p.deudaPendiente}`
            ).join('\n');

            const prompt = `Eres un asesor de compras para una imprenta. Analiza el siguiente resumen de proveedores y proporciona recomendaciones:

**ANÁLISIS DE PROVEEDORES:**
${proveedorInfo}

**RESUMEN:**
- Proveedor más económico: $${precioMasBarato}
- Proveedor más caro: $${precioMasCaro}
- Diferencia promedio: $${ahorroPromedio.toFixed(2)}
- Deuda total: $${totalDeudas.toLocaleString('es-AR')}

Proporciona 2-3 recomendaciones clave para optimizar las compras y reducir costos.`;

            // Llamar a Claude API
            const message = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 250,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const recomendaciones = message.content[0]?.text || '';

            return res.json({
                ok: true,
                resumen: {
                    totalProveedores: analisisProveedores.length,
                    precioMasBarato: Math.round(precioMasBarato),
                    precioMasCaro: Math.round(precioMasCaro),
                    ahorroPromedio: Math.round(ahorroPromedio),
                    totalDeudas: Math.round(totalDeudas)
                },
                proveedores: analisisProveedores,
                recomendaciones: recomendaciones.trim()
            });

        } catch (err) {
            console.error('Error en /api/ia/analisis-proveedores:', err);
            return res.status(500).json({
                ok: false,
                error: err.message || 'Error al analizar proveedores'
            });
        }
    });

    /**
     * POST /api/ia/categorizar
     * Sugiere una categoría para un gasto basado en su descripción
     * Body: { descripcion: string }
     * Requiere: API key configurada
     */
    router.post('/categorizar', async (req, res) => {
        try {
            if (!apiKeyConfigured) {
                return res.status(400).json({
                    ok: false,
                    error: 'API key de Anthropic no configurada'
                });
            }

            const { descripcion } = req.body;

            if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 2) {
                return res.status(400).json({
                    ok: false,
                    error: 'Descripción inválida'
                });
            }

            // Prompt para categorización
            const prompt = `Dado el siguiente gasto de una imprenta, selecciona la categoría más apropiada.

Categorías disponibles: ${CATEGORIAS_VALIDAS.join(', ')}

Gasto: "${descripcion.trim()}"

Responde SOLO con el nombre de la categoría más apropiada, sin explicación adicional.`;

            // Llamar a Claude API
            const message = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 30,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            let categoria = message.content[0]?.text?.trim() || 'Otros';

            // Validar que la categoría sugerida esté en la lista
            const categoriaValida = CATEGORIAS_VALIDAS.find(
                c => c.toLowerCase() === categoria.toLowerCase()
            );

            if (!categoriaValida) {
                categoria = 'Otros'; // Fallback si no es válida
            } else {
                categoria = categoriaValida; // Usar la exacta
            }

            return res.json({
                ok: true,
                categoria
            });

        } catch (err) {
            console.error('Error en /api/ia/categorizar:', err);
            return res.status(500).json({
                ok: false,
                error: err.message || 'Error al categorizar',
                categoria: 'Otros' // Fallback
            });
        }
    });

    /**
     * POST /api/ia/consejo-tesoreria
     * Consejo personalizado sobre gestión de liquidez y próximas obligaciones
     * Requiere: usuario autenticado, API key configurada
     */
    router.post('/consejo-tesoreria', async (req, res) => {
        try {
            if (!groqKeyConfigured) {
                return res.status(400).json({
                    success: false,
                    error: 'API key de Groq no configurada. Por favor, configura GROQ_API_KEY en las variables de entorno.'
                });
            }

            if (!req.session.user) {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado'
                });
            }

            // Calcular saldo y obligaciones (similar a la ruta de tesorería)

            // Saldo real
            const balanceResult = await db.all(`
                SELECT
                  SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) AS total_ingresos,
                  SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) AS total_egresos
                FROM movimientos_caja
            `, []);

            let saldoReal = 0;
            if (balanceResult && balanceResult[0]) {
                const ingresos = balanceResult[0].total_ingresos || 0;
                const egresos = balanceResult[0].total_egresos || 0;
                saldoReal = ingresos - egresos;
            }

            // Obligaciones próximas 30 días
            let obligaciones = [];

            // Facturas recibidas
            const facturas = await db.all(`
                SELECT id, numero_comprobante, razon_social, monto_total, monto_pagado,
                       fecha_vencimiento_pago
                FROM facturas_recibidas
                WHERE estado != 'pagada' AND activo = 1
                ORDER BY fecha_vencimiento_pago ASC
                LIMIT 5
            `, []);

            if (facturas && facturas.length > 0) {
                facturas.forEach(f => {
                    const pendiente = (f.monto_total || 0) - (f.monto_pagado || 0);
                    const daysLeft = f.fecha_vencimiento_pago ?
                      Math.ceil((new Date(f.fecha_vencimiento_pago) - new Date()) / (1000 * 60 * 60 * 24)) :
                      999;
                    if (daysLeft <= 30 && pendiente > 0) {
                        obligaciones.push({
                            tipo: 'Factura recibida',
                            descripcion: `${f.razon_social} - ${f.numero_comprobante}`,
                            monto: pendiente,
                            dias: daysLeft
                        });
                    }
                });
            }

            // Gastos fijos
            const FACTOR_MENSUAL = { semanal: 4.33, quincenal: 2.17, mensual: 1, bimestral: 0.5, trimestral: 1/3, semestral: 1/6, anual: 1/12 };
            const gastosFijos = await db.all(`
                SELECT id, nombre, monto, dia_vencimiento, frecuencia
                FROM gastos_fijos
                WHERE activo = 1
                LIMIT 5
            `, []);

            if (gastosFijos && gastosFijos.length > 0) {
                const hoy = new Date();
                gastosFijos.forEach(gf => {
                    const diaVencimiento = gf.dia_vencimiento || 1;
                    let proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), diaVencimiento);
                    if (hoy.getDate() > diaVencimiento) {
                        proximoVencimiento = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaVencimiento);
                    }
                    const daysLeft = Math.ceil((proximoVencimiento - hoy) / (1000 * 60 * 60 * 24));
                    const monto = (gf.monto || 0) * (FACTOR_MENSUAL[gf.frecuencia] || 1);

                    if (daysLeft <= 30) {
                        obligaciones.push({
                            tipo: 'Gasto fijo',
                            descripcion: gf.nombre,
                            monto: monto,
                            dias: daysLeft
                        });
                    }
                });
            }

            // Vencimientos fiscales
            const vencimientos = await db.all(`
                SELECT descripcion, monto_estimado, fecha_vencimiento
                FROM vencimientos_fiscales
                WHERE estado != 'pagado'
                LIMIT 5
            `, []);

            if (vencimientos && vencimientos.length > 0) {
                vencimientos.forEach(v => {
                    const daysLeft = Math.ceil((new Date(v.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
                    if (daysLeft <= 30 && daysLeft >= 0) {
                        obligaciones.push({
                            tipo: 'Impuesto',
                            descripcion: v.descripcion,
                            monto: v.monto_estimado || 0,
                            dias: daysLeft
                        });
                    }
                });
            }

            // Ordenar por urgencia
            obligaciones.sort((a, b) => a.dias - b.dias);
            obligaciones = obligaciones.slice(0, 10);

            // Construir prompt para Claude
            let obligacionesTexto = obligaciones.map(o =>
                `- ${o.tipo}: ${o.descripcion} ($${o.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}) - vence en ${o.dias} días`
            ).join('\n');

            const prompt = `Sos el asesor financiero de confianza de Imprenta El Gráfico, una imprenta familiar en Orán, Salta.

SITUACIÓN ACTUAL:
- Saldo disponible: $${saldoReal.toLocaleString('es-AR', {minimumFractionDigits: 2})}
- Próximas obligaciones (próximos 30 días):
${obligacionesTexto || '(Sin obligaciones próximas)'}

Tu tarea:
1. Analiza si el saldo es suficiente para las obligaciones próximas
2. Sugiere qué pagar primero y qué puede esperar
3. Identifica si hay riesgo de quedarse sin liquidez
4. Da 1-2 recomendaciones prácticas y concretas

IMPORTANTE:
- Responde en español, con un tono amigable y profesional
- Máximo 150 palabras
- Sé específico con montos y fechas
- Evita tecnicismos innecesarios`;

            const message = await groqClient.chat.completions.create({
                model: 'mixtral-8x7b-32768',
                max_tokens: 250,
                temperature: 0.7,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const consejo = message.choices[0]?.message?.content?.trim() || 'No se pudo generar consejo';

            return res.json({
                success: true,
                consejo
            });

        } catch (err) {
            console.error('Error en /api/ia/consejo-tesoreria:', err);
            return res.status(500).json({
                success: false,
                error: err.message || 'Error al generar consejo'
            });
        }
    });

    return router;
};
