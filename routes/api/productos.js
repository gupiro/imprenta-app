const express = require('express');
const router  = express.Router();

// Este router ahora exporta una función que recibe la instancia de la DB
module.exports = (db) => { // Recibe 'db' como argumento

    // GET /api/productos — Listar productos (JSON)
    router.get('/', (req, res) => {
        try {
            const rows = db.prepare('SELECT * FROM productos ORDER BY id ASC').all(); // Usa el 'db' pasado
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/productos — Crear producto (JSON)
    router.post('/', (req, res) => {
        const {
            pedido_id,
            material,
            ancho,
            alto,
            cantidad,
            precio_unitario
        } = req.body;

        if (!material || !material.trim()) {
            return res.status(400).json({ error: 'El campo material es obligatorio.' });
        }

        try {
            const info = db.prepare(`
                INSERT INTO productos
                (pedido_id, material, ancho, alto, cantidad, precio_unitario)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                pedido_id || null,
                material.trim(),
                parseFloat(ancho)           || 0,
                parseFloat(alto)            || 0,
                parseFloat(cantidad)        || 1,
                parseFloat(precio_unitario) || 0
            );

            res.status(201).json({
                id: info.lastInsertRowid,
                pedido_id: pedido_id || null,
                material: material.trim(),
                ancho: parseFloat(ancho)            || 0,
                alto: parseFloat(alto)              || 0,
                cantidad: parseFloat(cantidad)      || 1,
                precio_unitario: parseFloat(precio_unitario) || 0
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router; // Retornamos el router configurado
};
