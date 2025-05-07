// addRevisionColumn.js
const db = require('./database');  // tu módulo de conexión a SQLite

try {
  db.prepare(`
    ALTER TABLE pedidos
      ADD COLUMN revision_archivo TEXT
  `).run();
  console.log('Columna revision_archivo añadida correctamente.');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('La columna ya existe, nada que hacer.');
  } else {
    console.error('Error al añadir la columna:', e);
  }
}
