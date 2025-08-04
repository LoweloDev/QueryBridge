#!/bin/bash
# Start DynamoDB Local for testing

# Create data directory if it doesn't exist
mkdir -p server/data/dynamodb

# Check if port 8000 is already in use
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 8000 is already in use. Attempting to clear it..."
    # Try to kill the process using port 8000
    local pid=$(lsof -ti:8000 2>/dev/null)
    if [ -n "$pid" ]; then
        kill -TERM $pid 2>/dev/null
        sleep 3
        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            kill -KILL $pid 2>/dev/null
        fi
        echo "✅ Port 8000 cleared"
    fi
fi

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