const http = require('http');

// Bật server bằng cách require index.js
require('./index.js');

setTimeout(() => {
  console.log('Sending POST request to /api/challenge/sync-storage...');
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/challenge/sync-storage',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': 0
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Response:', data);
      process.exit(0); // Thoát tiến trình
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    process.exit(1);
  });

  req.write('');
  req.end();
}, 5000); // Đợi 5 giây để server khởi động hoàn toàn
