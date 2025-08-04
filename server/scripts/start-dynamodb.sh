#!/bin/bash
# Start DynamoDB Local for testing

set -e

# Create data directory
mkdir -p server/data/dynamodb

echo "Starting DynamoDB Local..."

# Check if already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ DynamoDB Local is already running on port 8000"
    exit 0
fi

# Clear any lingering processes
if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti:8000 2>/dev/null || echo "")
    if [ -n "$pid" ]; then
        echo "Cleaning up port 8000..."
        kill -TERM $pid 2>/dev/null || true
        sleep 2
    fi
fi

# Create startup script to run in background
cat > server/data/dynamodb/start.js << 'EOF'
const DynamoDbLocal = require('dynamodb-local');

console.log('Launching DynamoDB Local on port 8000...');

DynamoDbLocal.launch(8000, null, ['-inMemory', '-sharedDb'], false, false)
  .then((child) => {
    console.log('✅ DynamoDB Local started (PID: ' + child.pid + ')');
    console.log('Port: 8000');
    console.log('Mode: In-memory with shared database');
    
    // Keep process alive
    process.on('SIGTERM', () => {
      console.log('Shutting down DynamoDB Local...');
      child.kill();
      process.exit(0);
    });
  })
  .catch(err => {
    console.error('❌ Failed to start DynamoDB Local:', err.message);
    process.exit(1);
  });
EOF

# Start DynamoDB Local in background with proper detachment
nohup node server/data/dynamodb/start.js > server/data/dynamodb/dynamodb.log 2>&1 &

# Wait and verify startup
echo "Waiting for DynamoDB Local to start..."
sleep 5

for i in {1..10}; do
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        # Test with simple HTTP request
        if curl -s http://localhost:8000/ >/dev/null 2>&1; then
            echo "✅ DynamoDB Local is running and accessible on port 8000"
            exit 0
        fi
    fi
    echo "Waiting for DynamoDB Local... ($i/10)"
    sleep 2
done

echo "❌ DynamoDB Local failed to start after 30 seconds"
echo "Check log: server/data/dynamodb/dynamodb.log"
exit 1