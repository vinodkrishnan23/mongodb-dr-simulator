#!/usr/bin/env node
/**
 * MongoDB DR Simulator - Health Check Script
 * Enhanced health check with better error handling and logging
 */

const http = require('http');

const options = {
  hostname: process.env.HOSTNAME || 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',  // Try health endpoint first
  timeout: 5000,
  headers: {
    'User-Agent': 'Docker-Healthcheck/1.0'
  }
};

function checkEndpoint(path, callback) {
  const requestOptions = { ...options, path };
  
  const request = http.request(requestOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`✅ Health check passed: ${path} (${res.statusCode})`);
        callback(null, true);
      } else {
        console.log(`⚠️ Health check warning: ${path} (${res.statusCode})`);
        callback(null, false);
      }
    });
  });

  request.on('timeout', () => {
    console.log(`⏰ Health check timeout: ${path}`);
    request.destroy();
    callback(new Error('Timeout'), false);
  });

  request.on('error', (err) => {
    console.log(`❌ Health check error: ${path} - ${err.message}`);
    callback(err, false);
  });

  request.end();
}

// Try health endpoint first, fallback to root
checkEndpoint('/api/health', (err, success) => {
  if (success) {
    process.exit(0);
  } else {
    // Fallback to root endpoint
    checkEndpoint('/', (err, success) => {
      if (success) {
        console.log('✅ Fallback health check passed');
        process.exit(0);
      } else {
        console.log('❌ All health checks failed');
        process.exit(1);
      }
    });
  }
});

// Timeout safeguard
setTimeout(() => {
  console.log('⏰ Health check script timeout');
  process.exit(1);
}, 8000);