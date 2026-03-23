/**
 * Script para preparar la aplicación para despliegue en Render
 * Verifica configuración y sugiere pasos necesarios
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  🚀 VERIFICACIÓN PARA DESPLIEGUE EN RENDER               ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const checks = [];

// 1. Verificar .env
console.log('📋 Verificando archivos de configuración...\n');

if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    if (envContent.includes('sk-ant-')) {
        console.log('❌ ERROR: .env contiene claves API reales (sk-ant-)');
        console.log('   ⚠️  RIESGO DE SEGURIDAD: Nunca subas secretos a GitHub\n');
        checks.push(false);
    } else if (envContent.includes('ANTHROPIC_API_KEY=your_actual')) {
        console.log('✅ .env está configurado correctamente (sin secretos)\n');
        checks.push(true);
    }
} else {
    console.log('⚠️  .env no encontrado (creando desde .env.example...)\n');
    if (fs.existsSync('.env.example')) {
        fs.copyFileSync('.env.example', '.env');
        console.log('✅ .env creado desde .env.example\n');
        checks.push(true);
    }
}

// 2. Verificar .gitignore
if (fs.existsSync('.gitignore')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (gitignore.includes('.env') && gitignore.includes('*.db')) {
        console.log('✅ .gitignore está correctamente configurado\n');
        checks.push(true);
    } else {
        console.log('⚠️  .gitignore podría necesitar ajustes\n');
        checks.push(false);
    }
}

// 3. Verificar render.yaml
if (fs.existsSync('render.yaml')) {
    console.log('✅ render.yaml encontrado\n');
    checks.push(true);
} else {
    console.log('❌ render.yaml no encontrado\n');
    checks.push(false);
}

// 4. Verificar config/db.js
if (fs.existsSync('config/db.js')) {
    const dbContent = fs.readFileSync('config/db.js', 'utf8');
    if (dbContent.includes('DATABASE_URL')) {
        console.log('✅ config/db.js soporta DATABASE_URL (Render compatible)\n');
        checks.push(true);
    } else {
        console.log('⚠️  config/db.js podría no soportar DATABASE_URL completamente\n');
        checks.push(false);
    }
}

// 5. Verificar package.json
if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (pkg.engines && pkg.engines.node) {
        console.log(`✅ Node version especificado: ${pkg.engines.node}\n`);
        checks.push(true);
    } else {
        console.log('⚠️  engines.node no especificado en package.json\n');
        checks.push(false);
    }
    
    if (pkg.scripts && pkg.scripts.start) {
        console.log(`✅ Script start configurado: "${pkg.scripts.start}"\n`);
        checks.push(true);
    } else {
        console.log('❌ Script start no definido en package.json\n');
        checks.push(false);
    }
}

// 6. Generar SESSION_SECRET seguro
console.log('🔐 Generando SESSION_SECRET seguro...\n');
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log(`Nuevo SESSION_SECRET (32 caracteres random):`);
console.log(`  ${sessionSecret}\n`);
console.log('⚠️  IMPORTANTE: Copiar este valor a Render Dashboard:');
console.log('   Dashboard → Servicio → Environment → SESSION_SECRET\n');

// 7. Checklist de pasos
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  📋 CHECKLIST ANTES DE DESPLEGAR EN RENDER               ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const tasks = [
    '[ ] Verificar que .env NO tiene secretos reales (API keys, etc.)',
    '[ ] Commit y push a GitHub: git push origin main',
    '[ ] En Render Dashboard:',
    '    - Crear nuevo Web Service desde GitHub',
    '    - Conectar repositorio: gupiro/imprenta-app',
    '[ ] Configurar Persistent Disk:',
    '    - Mount Path: /opt/render/project/src',
    '    - Size: 1 GB',
    '[ ] Agregar Environment Variables:',
    '    - NODE_ENV=production',
    '    - PORT=3000',
    `    - SESSION_SECRET=${sessionSecret}`,
    '    - DATABASE_URL=/opt/render/project/src/imprenta.db',
    '    - ANTHROPIC_API_KEY=<tu_clave_aqui>',
    '[ ] Crear servicio y esperar a que diga ✅ "live"',
    '[ ] Cargar datos: node export-datos.js && git push',
    '[ ] Acceder a https://tu-servicio.onrender.com',
    '[ ] Probar login y funcionalidades principales'
];

tasks.forEach(task => console.log(task));

// 8. Resumen
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  ✨ RESUMEN                                               ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const passedChecks = checks.filter(c => c).length;
const totalChecks = checks.length;

console.log(`Estado: ${passedChecks}/${totalChecks} verificaciones pasadas\n`);

if (passedChecks === totalChecks) {
    console.log('✅ ¡Listo para desplegar en Render!\n');
} else {
    console.log('⚠️  Revisa los errores arriba antes de desplegar\n');
}

console.log('📚 Documentación: Ver RENDER_DEPLOYMENT.md para instrucciones detalladas\n');
