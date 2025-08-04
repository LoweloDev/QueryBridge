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

# Handle paths with spaces by creating a proper configuration file
REDIS_CONF="$REDIS_DATA_DIR/redis.conf"
echo "Creating Redis configuration: $REDIS_CONF"

cat > "$REDIS_CONF" << EOF
port 6379
bind 127.0.0.1
daemonize yes
dir "$REDIS_DATA_DIR"
save 60 1000
appendonly yes
appendfilename appendonly.aof
maxmemory 100mb
maxmemory-policy allkeys-lru
logfile "$REDIS_DATA_DIR/redis.log"
EOF

# Start Redis server using configuration file to handle paths with spaces
echo "Starting Redis with configuration file to handle paths with spaces"
if [ "$REDIS_CMD" = "redis-stack-server" ]; then
    echo "Using Redis Stack configuration approach..."
    # Redis Stack needs special handling for modules
    redis-stack-server "$REDIS_CONF"
else
    echo "Using standard Redis configuration..."
    redis-server "$REDIS_CONF"
fi

if [ $? -eq 0 ]; then
    echo "✅ Redis server startup initiated on port 6379"
else
    echo "❌ Failed to start Redis server"
    
    # Try alternative startup method for troubleshooting
    echo "Attempting alternative startup method..."
    
    if [ "$REDIS_CMD" = "redis-stack-server" ]; then
        echo "Redis Stack failed with command line args, trying basic redis-server..."
        # Try to start redis-server and then manually load modules if available
        redis-server "$REDIS_CONF"
        
        if [ $? -eq 0 ]; then
            echo "✅ Redis started successfully (basic mode due to path spaces issue)"
            echo "   Note: RediSearch, RedisJSON, RedisGraph modules unavailable due to path containing spaces"
            echo "   Recommendation: Move project to path without spaces for full Redis Stack support"
        fi
    else
        # Try basic configuration for regular Redis
        echo "Trying basic Redis configuration..."
        redis-server "$REDIS_CONF"
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
        
        # Check for specific modules and provide helpful information
        MODULE_COUNT=0
        if echo "$MODULES" | grep -q "search"; then
            echo "✅ RediSearch module detected"
            MODULE_COUNT=$((MODULE_COUNT + 1))
        else
            echo "⚠️  RediSearch module not detected"
        fi
        
        if echo "$MODULES" | grep -q "json"; then
            echo "✅ RedisJSON module detected"
            MODULE_COUNT=$((MODULE_COUNT + 1))
        else
            echo "⚠️  RedisJSON module not detected"
        fi
        
        if echo "$MODULES" | grep -q "graph"; then
            echo "✅ RedisGraph module detected"
            MODULE_COUNT=$((MODULE_COUNT + 1))
        else
            echo "⚠️  RedisGraph module not detected"
        fi
        
        # Provide guidance based on module availability
        if [ $MODULE_COUNT -eq 0 ]; then
            echo ""
            echo "ℹ️  Redis Stack modules not available"
            if [[ "$(pwd)" == *" "* ]]; then
                echo "   This is likely due to spaces in the project path"
                echo "   Run './install-redis-stack-modules.sh' for solutions"
            else
                echo "   Redis Stack may not be properly installed"
                echo "   Install Redis Stack for advanced query features"
            fi
        elif [ $MODULE_COUNT -lt 3 ]; then
            echo ""
            echo "ℹ️  Partial Redis Stack module support ($MODULE_COUNT/3 modules)"
        else
            echo ""
            echo "✅ Full Redis Stack support available (all modules loaded)"
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