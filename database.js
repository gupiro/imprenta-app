/**
 * database.js — conexión única a PostgreSQL en Render
 *
 * Todas las rutas siguen usando:
 *   const db = require('./database');
 *   const { rows } = await db.query('SELECT ...');
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }     // Render requiere SSL
});

/**
 * Ejecuta consultas parametrizadas:
 *   const { rows } = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
 */
module.exports = {
  query: (text, params) => pool.query(text, params)
};
