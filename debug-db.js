require('dotenv').config();
const Database = require('better-sqlite3');
const db = new Database('./imprenta.db');

console.log('\n🔍 DEBUG DATABASE - PEDIDOS POR ESTADO:\n');

const estados = ['PENDIENTE', 'EN_PRODUCCION', 'LISTO', 'ENTREGADO'];

estados.forEach(estado => {
  const result = db.prepare('SELECT COUNT(*) AS count FROM pedidos WHERE estado = ?').get(estado);
  console.log(`${estado}: ${result.count}`);
});

console.log('\n📋 TODOS LOS ESTADOS ÚNICOS EN BD:\n');
const todos = db.prepare('SELECT DISTINCT estado FROM pedidos').all();
todos.forEach(row => {
  console.log(`- ${row.estado}`);
});

console.log('\n✅ Done\n');
db.close();
