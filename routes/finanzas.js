// routes/finanzas.js - Módulo de Finanzas

const express = require('express');
const checkPermission = require('../middleware/permissions');

module.exports = (db) => {
    const router = express.Router();

    // GET /finanzas - Panel principal
    router.get('/', checkPermission, async (req, res) => {
        try {
            res.render('finanzas/dashboard', {
                title: 'Centro Financiero',
                user: req.session.user
            });
        } catch (error) {
            console.error('Error en finanzas:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};
