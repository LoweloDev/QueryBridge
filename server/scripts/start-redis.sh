#!/bin/bash
# Redis startup script - simplified and reliable

set -e

# Get the project root directory
PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
REDIS_DATA_DIR="$PROJECT_ROOT/server/data/redis"

echo "Starting Redis server..."

# Create data directory
mkdir -p "$REDIS_DATA_DIR"

# Stop any existing Redis processes
if pgrep -f "redis.*6379" > /dev/null; then
    echo "Stopping existing Redis processes..."
    pkill -f "redis.*6379" || true
    sleep 2
fi

# Determine which Redis to use
if command -v redis-stack-server >/dev/null 2>&1; then
    REDIS_CMD="redis-stack-server"
    REDIS_HAS_MODULES=true
    echo "✅ Using Redis Stack with modules"
elif command -v redis-server >/dev/null 2>&1; then
    REDIS_CMD="redis-server"
    REDIS_HAS_MODULES=false
    echo "⚠️  Using basic Redis only"
else
    echo "❌ No Redis installation found"
    exit 1
fi

# Create Redis configuration
REDIS_CONF="$REDIS_DATA_DIR/redis.conf"
cat > "$REDIS_CONF" << EOF
port 6379
bind 127.0.0.1
daemonize yes
dir $REDIS_DATA_DIR
logfile $REDIS_DATA_DIR/redis.log
loglevel notice
save 60 1000
appendonly yes
EOF

# Start Redis
echo "Starting Redis..."
if [ "$REDIS_HAS_MODULES" = "true" ]; then
    # Use nohup to prevent hanging
    nohup redis-stack-server "$REDIS_CONF" > "$REDIS_DATA_DIR/startup.log" 2>&1 &
else
    redis-server "$REDIS_CONF"
fi

# Wait for Redis to start and verify
echo "Waiting for Redis to start..."
sleep 3

for i in {1..10}; do
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis server is running on port 6379"
        
        # Test basic operations
        redis-cli set "test:startup" "success" EX 60 > /dev/null 2>&1
        if [ "$(redis-cli get test:startup 2>/dev/null)" = "success" ]; then
            echo "✅ Basic Redis operations working"
        fi
        
        # Check modules if Redis Stack
        if [ "$REDIS_HAS_MODULES" = "true" ]; then
            MODULES=$(redis-cli module list 2>/dev/null || echo "")
            if echo "$MODULES" | grep -q "search\|json"; then
                echo "✅ Redis Stack modules loaded"
            else
                echo "⚠️  Redis Stack running in basic mode"
            fi
        fi
        
        echo "✅ Redis startup completed successfully"
        exit 0
    fi
    echo "Waiting for Redis... ($i/10)"
    sleep 2
done

echo "❌ Redis failed to start after 30 seconds"
echo "Check logs: $REDIS_DATA_DIR/redis.log"
exit 1