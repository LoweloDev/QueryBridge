#!/bin/bash
# Start DynamoDB Local for testing

# Create data directory if it doesn't exist
mkdir -p server/data/dynamodb

echo "Starting DynamoDB Local..."

# Check if port 8000 is already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ DynamoDB Local is already running on port 8000"
    exit 0
fi

# Clear any lingering processes on port 8000
pid=$(lsof -ti:8000 2>/dev/null || echo "")
if [ -n "$pid" ]; then
    echo "⚠️  Cleaning up port 8000..."
    kill -TERM $pid 2>/dev/null || true
    sleep 2
fi

echo "Launching DynamoDB Local on port 8000..."

# Use Node.js to start DynamoDB Local programmatically
# The key is to use nohup to properly detach the process
nohup node -e "
const DynamoDbLocal = require('dynamodb-local');

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
" > server/data/dynamodb/startup.log 2>&1 &

echo "DynamoDB Local startup initiated..."

# Wait briefly and check if it started
sleep 5
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ DynamoDB Local is running on port 8000"
else
    echo "⚠️  DynamoDB Local may need more time to start (check server/data/dynamodb/startup.log)"
fi