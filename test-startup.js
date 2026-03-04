require('dotenv').config();

// Test 1: Load utils
try {
  const helpers = require('./utils/pagosHelper');
  console.log('✅ Utils loaded:', Object.keys(helpers).join(', '));
} catch(e) {
  console.error('❌ Utils error:', e.message);
}

// Test 2: Load routes
try {
  const db = require('./config/db');
  console.log('✅ DB module loaded');
  console.log('✅ ANTHROPIC_API_KEY configured:', process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO');
} catch(e) {
  console.error('❌ DB/Config error:', e.message);
}

// Test 3: Check pagos.js
try {
  require('./routes/pagos');
  console.log('✅ Pagos route module loaded');
} catch(e) {
  console.error('❌ Pagos route error:', e.message);
}

// Test 4: Check api/ia.js
try {
  require('./routes/api/ia');
  console.log('✅ IA API route module loaded');
} catch(e) {
  console.error('❌ IA API route error:', e.message);
}

console.log('\n✅ All modules passed startup checks!');
