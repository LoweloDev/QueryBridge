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

# Check if MongoDB is actually running and accessible
if pgrep mongod >/dev/null 2>&1; then
    # Process exists, but verify it's actually accessible
    if mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
        echo "✅ MongoDB is already running and accessible"
        exit 0
    else
        echo "⚠️  MongoDB process found but not responding, restarting..."
        pkill mongod 2>/dev/null || true
        sleep 3
    fi
fi

# Kill any lingering processes on port 27017
if command -v lsof >/dev/null 2>&1; then
    if lsof -Pi :27017 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Cleaning up port 27017..."
        pid=$(lsof -ti:27017 2>/dev/null)
        if [ -n "$pid" ]; then
            kill -TERM $pid 2>/dev/null
            sleep 2
        fi
    fi
fi

# Set proper permissions on data directory
chmod 755 server/data/mongodb

# Function to attempt MongoDB startup with optional repair
start_mongodb_attempt() {
    local repair_flag="$1"
    local attempt_name="$2"
    
    echo "Attempting $attempt_name..."
    
    if [ "$repair_flag" = "--repair" ]; then
        # Run repair first, then start normally
        echo "Running MongoDB repair..."
        if mongod --dbpath ./server/data/mongodb --repair --quiet 2>/dev/null; then
            echo "✅ MongoDB repair completed"
        else
            echo "⚠️  MongoDB repair had issues, continuing anyway..."
        fi
        
        # Start normally after repair
        mongod --dbpath ./server/data/mongodb --port 27017 --bind_ip 127.0.0.1 --logpath ./server/data/mongodb/mongod.log --fork --quiet 2>&1
    else
        mongod --dbpath ./server/data/mongodb --port 27017 --bind_ip 127.0.0.1 --logpath ./server/data/mongodb/mongod.log --fork --quiet 2>&1
    fi
}

# Try multiple startup strategies
echo "Launching mongod process..."

# Strategy 1: Normal startup
if start_mongodb_attempt "" "normal startup"; then
    echo "✅ MongoDB started successfully on port 27017"
elif grep -q "WiredTiger metadata corruption" ./server/data/mongodb/mongod.log 2>/dev/null; then
    # Strategy 2: Repair and restart
    echo "⚠️  WiredTiger corruption detected, attempting repair..."
    if start_mongodb_attempt "--repair" "repair and restart"; then
        echo "✅ MongoDB started successfully after repair"
    else
        # Strategy 3: Fresh start with clean data directory
        echo "⚠️  Repair failed, creating fresh data directory..."
        rm -rf ./server/data/mongodb/*
        mkdir -p ./server/data/mongodb
        chmod 755 ./server/data/mongodb
        
        if start_mongodb_attempt "" "fresh database startup"; then
            echo "✅ MongoDB started successfully with fresh database"
        else
            echo "❌ All MongoDB startup strategies failed"
            if [ -f "./server/data/mongodb/mongod.log" ]; then
                echo "   Last few lines from log:"
                tail -5 ./server/data/mongodb/mongod.log | sed 's/^/   /'
            fi
            exit 1
        fi
    fi
else
    echo "❌ MongoDB failed to start"
    if [ -f "./server/data/mongodb/mongod.log" ]; then
        echo "   Last few lines from log:"
        tail -5 ./server/data/mongodb/mongod.log | sed 's/^/   /'
    fi
    exit 1
fi

# Verify MongoDB is running and accessible
echo "Verifying MongoDB startup..."
sleep 3

for i in {1..10}; do
    if pgrep mongod >/dev/null 2>&1; then
        # Process exists, test connectivity
        if mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
            echo "✅ MongoDB is running and accessible"
            echo "   Data directory: ./server/data/mongodb"
            echo "   Port: 27017"
            exit 0
        fi
    fi
    echo "Waiting for MongoDB... ($i/10)"
    sleep 2
done

echo "❌ MongoDB failed to start or become accessible"
if [ -f "./server/data/mongodb/mongod.log" ]; then
    echo "Last few lines from log:"
    tail -5 ./server/data/mongodb/mongod.log | sed 's/^/   /'
fi
exit 1