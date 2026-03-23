/**
 * Script de backup automático para Render
 * Exporta la BD a imprenta.db y la pushea a GitHub
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔄 Iniciando backup automático...\n');

// Rutas
const dbSource = '/opt/render/project/src/imprenta.db';
const dbDest = path.join(__dirname, '../imprenta.db');

try {
    // 1. Copiar BD desde persistent disk
    if (fs.existsSync(dbSource)) {
        fs.copyFileSync(dbSource, dbDest);
        console.log('✅ BD copiada a imprenta.db');
    } else {
        console.log('⚠️  BD no encontrada en persistent disk');
        process.exit(0);
    }

    // 2. Commit y push a GitHub
    console.log('\n📤 Pusheando a GitHub...');
    
    execSync('git add imprenta.db', { cwd: path.join(__dirname, '..') });
    console.log('✅ Archivo staged');

    const fecha = new Date().toISOString().split('T')[0];
    execSync(`git commit -m "backup: datos del ${fecha}"`, { 
        cwd: path.join(__dirname, '..') 
    });
    console.log('✅ Commit creado');

    execSync('git push origin main', { 
        cwd: path.join(__dirname, '..') 
    });
    console.log('✅ Push completado\n');

    console.log('🎉 Backup automático completado exitosamente!\n');

} catch (error) {
    // Git commit falla si no hay cambios - eso es OK
    if (error.message.includes('nothing to commit')) {
        console.log('✅ BD sin cambios, no hay nada que hacer\n');
    } else {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
