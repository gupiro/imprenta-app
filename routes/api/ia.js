/**
 * API de Inteligencia Artificial para análisis y categorización
 * Utiliza Claude API (Anthropic) para análisis financiero y categorización automática
 */

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = (db) => {
    const router = express.Router();

    // Inicializar cliente de Anthropic
    const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || ''
    });

    // Verificar que la API key esté configurada
    const apiKeyConfigured = !!process.env.ANTHROPIC_API_KEY?.trim();

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

    return router;
};
