#!/bin/bash
# Start Redis server with advanced features for testing

echo "Starting Redis server..."

# Check if Redis is already running
if pgrep redis-server >/dev/null 2>&1 ||
   ps aux 2>/dev/null | grep -q "[r]edis-server"; then
    echo "✅ Redis is already running"
    exit 0
fi

# Create data directory with absolute path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REDIS_DATA_DIR="$PROJECT_ROOT/server/data/redis"

echo "Creating Redis data directory: $REDIS_DATA_DIR"
mkdir -p "$REDIS_DATA_DIR"
chmod 755 "$REDIS_DATA_DIR"

# Check if Redis Stack is available (preferred) or fall back to regular Redis
if command -v redis-stack-server &> /dev/null; then
    REDIS_CMD="redis-stack-server"
    echo "✅ Redis Stack found (includes RediSearch, RedisJSON, RedisGraph)"
elif command -v redis-server &> /dev/null; then
    REDIS_CMD="redis-server"
    echo "⚠️  Basic Redis found (Redis Stack with modules not available)"
    echo "   For full query translation features, install Redis Stack: https://redis.io/download"
else
    echo "❌ Redis server not found. Please install Redis or Redis Stack."
    exit 1
fi

echo "Redis version: $(redis-server --version | head -1)"

# Start Redis server in daemon mode with absolute paths for configuration
echo "Starting Redis with data directory: $REDIS_DATA_DIR"
$REDIS_CMD --daemonize yes \
    --port 6379 \
    --bind 127.0.0.1 \
    --dir "$REDIS_DATA_DIR" \
    --save 60 1000 \
    --appendonly yes \
    --appendfilename "appendonly.aof" \
    --maxmemory 100mb \
    --maxmemory-policy allkeys-lru

if [ $? -eq 0 ]; then
    echo "✅ Redis server startup initiated on port 6379"
else
    echo "❌ Failed to start Redis server"
    
    # Try alternative startup method for troubleshooting
    echo "Attempting alternative startup method..."
    
    if [ "$REDIS_CMD" = "redis-stack-server" ]; then
        # Create a temporary Redis configuration file to avoid path issues
        TEMP_CONF="$REDIS_DATA_DIR/redis-temp.conf"
        echo "Creating temporary Redis configuration: $TEMP_CONF"
        
        cat > "$TEMP_CONF" << EOF
port 6379
bind 127.0.0.1
daemonize yes
dir $REDIS_DATA_DIR
save 60 1000
appendonly yes
appendfilename appendonly.aof
maxmemory 100mb
maxmemory-policy allkeys-lru
EOF
        
        echo "Trying Redis Stack with configuration file..."
        redis-stack-server "$TEMP_CONF"
        
        if [ $? -ne 0 ]; then
            echo "Redis Stack with config failed, trying basic redis-server..."
            redis-server --daemonize yes --port 6379 --bind 127.0.0.1 --dir "$REDIS_DATA_DIR"
        fi
    else
        # Try basic configuration for regular Redis
        echo "Trying basic Redis configuration..."
        redis-server --daemonize yes --port 6379 --bind 127.0.0.1 --dir "$REDIS_DATA_DIR"
    fi
    
    if [ $? -ne 0 ]; then
        echo "❌ All Redis startup methods failed"
        exit 1
    else
        echo "✅ Redis started with fallback configuration"
    fi
fi

echo "Data directory: $REDIS_DATA_DIR"
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
    MODULES=$(redis-cli module list 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "ℹ️  Redis module system available"
        # Check for specific modules
        if echo "$MODULES" | grep -q "search"; then
            echo "✅ RediSearch module detected"
        else
            echo "⚠️  RediSearch module not detected"
        fi
        if echo "$MODULES" | grep -q "graph"; then
            echo "✅ RedisGraph module detected"
        else
            echo "⚠️  RedisGraph module not detected"
        fi
        if echo "$MODULES" | grep -q "json"; then
            echo "✅ RedisJSON module detected"
        else
            echo "⚠️  RedisJSON module not detected"
        fi
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
if [ "$REDIS_CMD" = "redis-stack-server" ]; then
    echo "  - RediSearch: Full-text search and secondary indexing"
    echo "  - RedisJSON: Native JSON data type support"
    echo "  - RedisGraph: Graph database capabilities"
    echo "  - Time Series: Time-series data operations"
fi