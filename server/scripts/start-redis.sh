#!/bin/bash
# Start Redis server with advanced features for testing

# Create data directory
mkdir -p server/data/redis

echo "Starting Redis server..."

# Check if Redis is available
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis server not found. Make sure Redis is installed."
    exit 1
fi

echo "Redis version: $(redis-server --version | head -1)"

# Start Redis server in daemon mode (basic configuration for broad compatibility)
redis-server --daemonize yes \
    --port 6379 \
    --bind 127.0.0.1 \
    --dir ./server/data/redis \
    --save 60 1000 \
    --appendonly yes \
    --appendfilename "appendonly.aof" \
    --maxmemory 100mb \
    --maxmemory-policy allkeys-lru

if [ $? -eq 0 ]; then
    echo "✅ Redis server startup initiated on port 6379"
else
    echo "❌ Failed to start Redis server"
    exit 1
fi

echo "Data directory: ./server/data/redis"
echo "Configuration: In-memory cache with persistence"

# Wait for startup
sleep 3

# Test connection
echo "Testing Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis server is running and accessible"
    
    # Test basic operations
    redis-cli set "test:connection" "success" EX 60 > /dev/null 2>&1
    TEST_VALUE=$(redis-cli get "test:connection" 2>/dev/null)
    if [ "$TEST_VALUE" = "success" ]; then
        echo "✅ Basic Redis operations working"
    fi
    
    # Check for modules (Redis Stack features)
    echo "Checking Redis capabilities..."
    redis-cli module list > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "ℹ️  Redis module system available"
    fi
    
    # Show Redis info
    echo "Redis info:"
    redis-cli info server | grep -E "redis_version|process_id|tcp_port" | head -3
else
    echo "❌ Redis server may not be fully started yet"
fi

echo ""
echo "Note: In containerized environments like Replit, the daemon process may not persist"
echo "but will work correctly when running locally on your machine."
echo "For local development, this setup supports:"
echo "  - Standard Redis operations (GET, SET, etc.)"
echo "  - Advanced data structures (Lists, Sets, Hashes, etc.)"
echo "  - Pub/Sub messaging"
echo "  - Lua scripting"
echo "  - Memory-efficient operations with LRU eviction"