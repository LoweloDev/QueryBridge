#!/bin/bash
# Start DynamoDB Local for testing

# Create data directory if it doesn't exist
mkdir -p server/data/dynamodb

echo "Starting DynamoDB Local using Node.js package..."

# Use Node.js to start DynamoDB Local programmatically
node -e "
const DynamoDbLocal = require('dynamodb-local');
console.log('Launching DynamoDB Local on port 8000...');

DynamoDbLocal.launch(8000, null, ['-inMemory', '-sharedDb'], false, false)
  .then((child) => {
    console.log('✅ DynamoDB Local process started (PID: ' + child.pid + ')');
    console.log('Port: 8000');
    console.log('Mode: In-memory with shared database');
    
    // Test connection after a delay
    setTimeout(() => {
      const http = require('http');
      const req = http.request({
        hostname: 'localhost',
        port: 8000,
        path: '/',
        method: 'GET'
      }, (res) => {
        console.log('✅ DynamoDB Local is responding and ready');
      });
      req.on('error', (err) => {
        console.log('⚠️  DynamoDB Local process started but may need more time to initialize');
      });
      req.timeout = 2000;
      req.end();
    }, 3000);
  })
  .catch(err => {
    console.error('❌ Failed to start DynamoDB Local:', err.message);
    process.exit(1);
  });
" &

echo "DynamoDB Local startup initiated..."
echo "Note: In containerized environments like Replit, the process may not persist"
echo "but will work correctly when running locally on your machine."