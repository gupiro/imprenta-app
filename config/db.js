const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../imprenta.db');
console.log('🔍 Usando la base de datos:', dbPath);

const db = new Database(dbPath);

// Verificación: existencia y cantidad de productos
const existe = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='catalogo_productos'").get();
if (existe) {
  const { total } = db.prepare("SELECT COUNT(*) AS total FROM catalogo_productos").get();
  console.log(`✅ La tabla catalogo_productos existe.\n📦 Hay ${total} producto(s) en catálogo.`);
} else {
  console.warn('⚠️ La tabla catalogo_productos NO existe');
}

module.exports = db;
