const initDb = require('./config/db');

async function check() {
    const db = await initDb;
    const users = await db.all('SELECT id, username, rol FROM users');
    console.log('Usuarios en BD:', users);
    process.exit(0);
}

check().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
