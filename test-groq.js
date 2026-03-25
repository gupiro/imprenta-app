/**
 * Test script para verificar que el endpoint de Groq funciona
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/ia/consejo-tesoreria',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS:`, JSON.stringify(res.headers));

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('RESPONSE:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('PARSED:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Failed to parse JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(JSON.stringify({}));
req.end();
