#!/bin/bash
# Redis startup script with comprehensive path handling and error resolution

set -e  # Exit on any error

# Get the project root directory (assumes script is in server/scripts/)
PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
REDIS_DATA_DIR="$PROJECT_ROOT/server/data/redis"

echo "Starting Redis server..."

# Check for spaces in path and handle appropriately
if [[ "$PROJECT_ROOT" == *" "* ]]; then
    echo "⚠️  CRITICAL: Project path contains spaces: $PROJECT_ROOT"
    echo "Redis Stack cannot handle configuration files with spaces in paths."
    echo ""
    echo "This is a fundamental limitation of Redis Stack's configuration parser."
    echo "Redis Stack splits arguments on spaces, breaking paths like:"
    echo "  '/Users/user/My Projects/app' becomes '/Users/user/My' and 'Projects/app'"
    echo ""
    echo "SOLUTIONS:"
    echo "1. Move project to path without spaces (recommended)"
    echo "2. Use symbolic link: ln -s '$PROJECT_ROOT' ~/dev/QueryBridge"
    echo "3. Continue with basic Redis (no RediSearch/RedisJSON/RedisGraph modules)"
    echo ""
    
    read -p "Continue with basic Redis? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled. Please resolve path issue and try again."
        exit 1
    fi
    
    echo "⚠️  Proceeding with basic Redis (Redis Stack modules disabled)"
    FORCE_BASIC_REDIS=true
else
    echo "✅ Project path compatible with Redis Stack: $PROJECT_ROOT"
    FORCE_BASIC_REDIS=false
fi

# Create data directory if it doesn't exist
mkdir -p "$REDIS_DATA_DIR"
echo "Redis data directory: $REDIS_DATA_DIR"

# Stop any existing Redis processes
if pgrep -f "redis.*6379" > /dev/null; then
    echo "⚠️  Stopping existing Redis processes on port 6379..."
    pkill -f "redis.*6379" || true
    sleep 2
fi

# Determine Redis installation and capabilities
if [ "$FORCE_BASIC_REDIS" = "true" ]; then
    echo "🔧 Using basic Redis (forced due to path spaces)"
    REDIS_CMD="redis-server"
    REDIS_HAS_MODULES=false
elif command -v redis-stack-server >/dev/null 2>&1; then
    REDIS_CMD="redis-stack-server"
    REDIS_HAS_MODULES=true
    echo "✅ Redis Stack available (RediSearch, RedisJSON, RedisGraph)"
elif command -v redis-server >/dev/null 2>&1; then
    REDIS_CMD="redis-server"
    REDIS_HAS_MODULES=false
    echo "⚠️  Basic Redis only (install Redis Stack for advanced features)"
else
    echo "❌ No Redis installation found"
    echo "Install Redis: brew install redis-stack (macOS) or apt install redis-stack-server (Linux)"
    exit 1
fi

echo "Redis version: $(redis-server --version | head -1)"

# Create optimized Redis configuration
REDIS_CONF="$REDIS_DATA_DIR/redis.conf"
echo "Creating Redis configuration: $REDIS_CONF"

cat > "$REDIS_CONF" << EOF
# Redis Configuration for Universal Query Translator
port 6379
bind 127.0.0.1
daemonize yes

# Data persistence
dir $REDIS_DATA_DIR
save 60 1000
appendonly yes
appendfilename appendonly.aof

# Memory management
maxmemory 100mb
maxmemory-policy allkeys-lru

# Logging
logfile $REDIS_DATA_DIR/redis.log
loglevel notice

# Security
protected-mode yes

# Performance
tcp-keepalive 300
timeout 0
EOF

# Add module configuration for Redis Stack
if [ "$REDIS_HAS_MODULES" = "true" ]; then
    echo "# Redis Stack modules will be auto-loaded" >> "$REDIS_CONF"
fi

# Start Redis with proper error handling
echo "Starting Redis..."
if [ "$REDIS_HAS_MODULES" = "true" ]; then
    echo "🚀 Starting Redis Stack with modules..."
    if redis-stack-server "$REDIS_CONF"; then
        echo "✅ Redis Stack started successfully"
    else
        echo "❌ Redis Stack failed, falling back to basic Redis"
        redis-server "$REDIS_CONF"
        REDIS_HAS_MODULES=false
    fi
else
    echo "🚀 Starting basic Redis..."
    redis-server "$REDIS_CONF"
fi

# Wait for Redis to start
sleep 3

# Verify Redis is running
echo "Verifying Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis server is running and accessible"
    
    # Test basic operations
    redis-cli set "test:startup" "success" EX 60 > /dev/null 2>&1
    TEST_VALUE=$(redis-cli get "test:startup" 2>/dev/null)
    if [ "$TEST_VALUE" = "success" ]; then
        echo "✅ Basic Redis operations working"
    fi
    
    # Check module availability if Redis Stack
    if [ "$REDIS_HAS_MODULES" = "true" ]; then
        echo "Checking Redis Stack modules..."
        MODULES=$(redis-cli module list 2>/dev/null)
        MODULE_COUNT=0
        
        if echo "$MODULES" | grep -q "search"; then
            echo "✅ RediSearch module loaded"
            MODULE_COUNT=$((MODULE_COUNT + 1))
        fi
        
        if echo "$MODULES" | grep -q "json"; then
            echo "✅ RedisJSON module loaded"
            MODULE_COUNT=$((MODULE_COUNT + 1))
        fi
        
        if echo "$MODULES" | grep -q "graph"; then
            echo "✅ RedisGraph module loaded"
            MODULE_COUNT=$((MODULE_COUNT + 1))
        fi
        
        if [ $MODULE_COUNT -eq 3 ]; then
            echo "🎉 All Redis Stack modules available!"
        elif [ $MODULE_COUNT -gt 0 ]; then
            echo "⚠️  Partial Redis Stack support ($MODULE_COUNT/3 modules)"
        else
            echo "⚠️  Redis Stack modules not loaded (running in basic mode)"
        fi
    else
        echo "ℹ️  Running in basic Redis mode"
        echo "   For advanced features, resolve path issues and install Redis Stack"
    fi
    
    # Display Redis info
    echo ""
    echo "Redis Status:"
    echo "- Version: $(redis-cli info server | grep redis_version | cut -d: -f2 | tr -d '\r')"
    echo "- Port: 6379"
    echo "- Data directory: $REDIS_DATA_DIR"
    echo "- Modules: $([ "$REDIS_HAS_MODULES" = "true" ] && echo "Redis Stack" || echo "Basic Redis")"
    
else
    echo "❌ Redis connection failed"
    echo "Check Redis log: $REDIS_DATA_DIR/redis.log"
    exit 1
fi

echo "✅ Redis startup completed successfully"