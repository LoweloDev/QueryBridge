#!/bin/bash
# Start MongoDB locally for testing

# Check if MongoDB is installed
if ! command -v mongod >/dev/null 2>&1; then
    echo "❌ MongoDB (mongod) not found in PATH"
    echo "   Please install MongoDB or ensure it's in your PATH"
    echo "   On macOS: brew install mongodb-community"
    echo "   On Ubuntu: sudo apt install mongodb"
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p server/data/mongodb

echo "Starting MongoDB..."

# Check if MongoDB is already running
if pgrep mongod >/dev/null 2>&1; then
    echo "✅ MongoDB is already running"
    exit 0
fi

# Check if port 27017 is in use
if lsof -Pi :27017 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 27017 is already in use"
    pid=$(lsof -ti:27017 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "   Killing process $pid on port 27017..."
        kill -TERM $pid 2>/dev/null
        sleep 2
    fi
fi

# Set proper permissions on data directory
chmod 755 server/data/mongodb

# Try to start MongoDB with better error handling
echo "Launching mongod process..."
if mongod --dbpath ./server/data/mongodb --port 27017 --bind_ip 127.0.0.1 --logpath ./server/data/mongodb/mongod.log --fork 2>&1; then
    echo "✅ MongoDB started successfully on port 27017"
    echo "   Data directory: ./server/data/mongodb"
    echo "   Log file: ./server/data/mongodb/mongod.log"
    
    # Wait a moment and verify it's running
    sleep 2
    if pgrep mongod >/dev/null 2>&1; then
        echo "✅ MongoDB process confirmed running"
        exit 0
    else
        echo "❌ MongoDB process failed to start properly"
        echo "   Check log file: ./server/data/mongodb/mongod.log"
        exit 1
    fi
else
    echo "❌ MongoDB failed to start"
    echo "   Check log file: ./server/data/mongodb/mongod.log"
    
    # Show the last few lines of the log if it exists
    if [ -f "./server/data/mongodb/mongod.log" ]; then
        echo "   Last few lines from log:"
        tail -5 ./server/data/mongodb/mongod.log | sed 's/^/   /'
    fi
    
    exit 1
fi