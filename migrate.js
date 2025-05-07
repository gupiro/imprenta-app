const db = require('./database'); // o la ruta a tu módulo de conexión
db.prepare(`
  ALTER TABLE pedidos
  ADD COLUMN revision_archivo TEXT
`).run();
console.log('Columna revision_archivo añadida.');
process.exit();
