#!/bin/bash
# Simple MongoDB startup with better error handling

echo "Starting MongoDB..."

# Clean up any stale lock files
rm -f server/data/mongodb/mongod.lock

# Create data directory
mkdir -p server/data/mongodb

# Try starting MongoDB in foreground mode (non-forking)
echo "Attempting to start MongoDB without forking..."
mongod --dbpath ./server/data/mongodb --port 27017 --bind_ip 127.0.0.1 --logpath ./server/data/mongodb/mongod.log --nojournal --quiet &

# Store the PID
MONGO_PID=$!
echo "MongoDB started with PID: $MONGO_PID"

# Wait a moment and check if it's still running
sleep 3
if kill -0 $MONGO_PID 2>/dev/null; then
    echo "MongoDB is running successfully on port 27017"
    echo "Log file: ./server/data/mongodb/mongod.log"
else
    echo "MongoDB failed to start or exited unexpectedly"
    echo "Check log file: ./server/data/mongodb/mongod.log"
    exit 1
fi