#!/bin/bash
# Start DynamoDB Local for testing

# Create data directory
mkdir -p server/data/dynamodb

echo "Starting DynamoDB Local..."

# Check if already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ DynamoDB Local is already running on port 8000"
    exit 0
fi

# Clear any lingering processes
pid=$(lsof -ti:8000 2>/dev/null || echo "")
if [ -n "$pid" ]; then
    echo "Cleaning up port 8000..."
    kill -TERM $pid 2>/dev/null || true
    sleep 2
fi

# Start DynamoDB Local in background - simpler approach
node -e "
const DynamoDbLocal = require('dynamodb-local');

console.log('Launching DynamoDB Local on port 8000...');

DynamoDbLocal.launch(8000, null, ['-inMemory', '-sharedDb'], false, false)
  .then((child) => {
    console.log('✅ DynamoDB Local started successfully');
    console.log('Port: 8000 | Mode: In-memory with shared database');
    
    // Exit parent process but let DynamoDB continue
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed to start DynamoDB Local:', err.message);
    process.exit(1);
  });
" > /dev/null 2>&1 &

# Brief wait for startup
sleep 3

# Simple verification
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ DynamoDB Local is running on port 8000"
else
    echo "⚠️  DynamoDB Local startup initiated (may need a few more seconds)"
fi