#!/bin/bash
# Simplified Universal Query Translator Installation Script
# Focuses on fixing the critical Redis Stack path issue and robust error handling

set -e

echo "🔧 Universal Query Translator - Quick Setup"
echo "=========================================="

# Check for spaces in project path
PROJECT_PATH=$(pwd)
echo "Project path: $PROJECT_PATH"

if [[ "$PROJECT_PATH" == *" "* ]]; then
    echo ""
    echo "❌ CRITICAL ISSUE: Project path contains spaces"
    echo "Redis Stack cannot parse configuration files with spaces in paths."
    echo ""
    echo "SOLUTION OPTIONS:"
    echo "1. Move project to path without spaces (recommended)"
    echo "2. Create symbolic link automatically"
    echo "3. Use basic Redis only (no advanced modules)"
    echo ""
    
    read -p "Choose (1/2/3): " -n 1 -r
    echo ""
    
    case $REPLY in
        1)
            echo "Please move your project to a path without spaces."
            echo "Example: mv '$PROJECT_PATH' ~/dev/QueryBridge"
            exit 0
            ;;
        2)
            SYMLINK_DIR="$HOME/dev"
            mkdir -p "$SYMLINK_DIR"
            SYMLINK_TARGET="$SYMLINK_DIR/QueryBridge"
            
            if [ ! -L "$SYMLINK_TARGET" ]; then
                ln -s "$PROJECT_PATH" "$SYMLINK_TARGET"
                echo "✅ Created symbolic link: $SYMLINK_TARGET"
                echo "Now run: cd $SYMLINK_TARGET && ./install-simple.sh"
                exit 0
            else
                echo "Symbolic link exists: $SYMLINK_TARGET"
                if [ "$(pwd)" != "$SYMLINK_TARGET" ]; then
                    echo "Run: cd $SYMLINK_TARGET && ./install-simple.sh"
                    exit 0
                fi
            fi
            ;;
        3)
            echo "⚠️  Continuing with basic Redis (no Redis Stack modules)"
            USE_BASIC_REDIS=true
            ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
else
    echo "✅ Project path compatible with Redis Stack"
    USE_BASIC_REDIS=false
fi

echo ""
echo "📦 Installing prerequisites..."

# Install npm dependencies
echo "Installing Node.js dependencies..."
npm install
echo "✅ Node.js dependencies installed"

# Create data directories
mkdir -p server/data/{mongodb,redis,elasticsearch/{data1,data2}}
echo "✅ Data directories created"

# Test Redis configuration
echo ""
echo "🔧 Testing Redis configuration..."
REDIS_TEST_DIR="server/data/redis"
REDIS_TEST_CONF="$REDIS_TEST_DIR/test.conf"

cat > "$REDIS_TEST_CONF" << EOF
port 6380
bind 127.0.0.1
daemonize no
timeout 5
save ""
appendonly no
EOF

if [ "$USE_BASIC_REDIS" = "true" ]; then
    echo "Testing basic Redis..."
    if timeout 3s redis-server "$REDIS_TEST_CONF" >/dev/null 2>&1; then
        echo "✅ Basic Redis working"
    else
        echo "⚠️  Redis test failed (may need installation)"
    fi
else
    echo "Testing Redis Stack..."
    if timeout 3s redis-stack-server "$REDIS_TEST_CONF" >/dev/null 2>&1; then
        echo "✅ Redis Stack working with configuration files"
    else
        echo "⚠️  Redis Stack failed, will use basic Redis"
        USE_BASIC_REDIS=true
    fi
fi

# Clean up test
pkill -f "redis.*6380" 2>/dev/null || true
rm -f "$REDIS_TEST_CONF"

echo ""
echo "🎉 Setup completed!"
echo ""
if [ "$USE_BASIC_REDIS" = "true" ]; then
    echo "⚠️  Using basic Redis (Redis Stack modules unavailable)"
    echo "   Advanced query features for Redis will be limited"
else
    echo "✅ Redis Stack configuration compatible"
    echo "   Full Redis module support available"
fi

echo ""
echo "Next steps:"
echo "1. Set up your database credentials in .env"
echo "2. Run: ./start-dev.sh"
echo "3. Visit: http://localhost:5000"

# Create .env if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo ""
    echo "✅ Created .env from .env.example"
    echo "   Edit .env with your database credentials"
fi

echo ""
echo "Installation summary:"
echo "- Node.js dependencies: ✅ Installed"
echo "- Data directories: ✅ Created"
echo "- Redis compatibility: $([ "$USE_BASIC_REDIS" = "true" ] && echo "⚠️  Basic only" || echo "✅ Full Stack")"
echo "- Environment file: $([ -f ".env" ] && echo "✅ Ready" || echo "⚠️  Create .env")"