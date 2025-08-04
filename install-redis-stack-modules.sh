#!/bin/bash
# Additional script to help with Redis Stack module installation

echo "🔧 Redis Stack Module Installation Helper"
echo "========================================="

# Check if Redis Stack is installed
if command -v redis-stack-server >/dev/null 2>&1; then
    echo "✅ Redis Stack found"
    
    # Check if project path contains spaces
    PROJECT_PATH=$(pwd)
    if [[ "$PROJECT_PATH" == *" "* ]]; then
        echo ""
        echo "⚠️  WARNING: Project path contains spaces"
        echo "   Current path: $PROJECT_PATH"
        echo ""
        echo "Redis Stack modules (RediSearch, RedisJSON, RedisGraph) may not work"
        echo "properly with paths containing spaces due to configuration parsing issues."
        echo ""
        echo "Recommendations:"
        echo "1. Move project to a path without spaces (e.g., /Users/yourname/projects/QueryBridge)"
        echo "2. Or use symbolic links to create a space-free path"
        echo "3. Or accept basic Redis functionality without advanced modules"
        echo ""
        
        # Offer to create a symbolic link
        read -p "Would you like to create a symbolic link? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            SYMLINK_DIR="$HOME/redis-projects"
            mkdir -p "$SYMLINK_DIR"
            PROJECT_NAME=$(basename "$PROJECT_PATH")
            CLEAN_NAME=$(echo "$PROJECT_NAME" | tr ' ' '-')
            SYMLINK_TARGET="$SYMLINK_DIR/$CLEAN_NAME"
            
            if [ ! -L "$SYMLINK_TARGET" ]; then
                ln -s "$PROJECT_PATH" "$SYMLINK_TARGET"
                echo "✅ Created symbolic link: $SYMLINK_TARGET"
                echo "   You can now work from: $SYMLINK_TARGET"
                echo "   Redis Stack modules should work from the symlinked path"
            else
                echo "Symbolic link already exists: $SYMLINK_TARGET"
            fi
        fi
    else
        echo "✅ Project path looks good for Redis Stack modules"
        
        # Test Redis Stack modules
        echo ""
        echo "Testing Redis Stack installation..."
        
        # Start a temporary Redis Stack instance to test modules
        TEMP_DIR="/tmp/redis-test-$$"
        mkdir -p "$TEMP_DIR"
        
        redis-stack-server --port 6380 --dir "$TEMP_DIR" --daemonize yes --logfile "$TEMP_DIR/redis.log" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            sleep 2
            echo "✅ Redis Stack test instance started on port 6380"
            
            # Test modules
            MODULES=$(redis-cli -p 6380 module list 2>/dev/null)
            if echo "$MODULES" | grep -q "search"; then
                echo "✅ RediSearch module working"
            else
                echo "❌ RediSearch module not detected"
            fi
            
            if echo "$MODULES" | grep -q "json"; then
                echo "✅ RedisJSON module working"
            else
                echo "❌ RedisJSON module not detected"
            fi
            
            if echo "$MODULES" | grep -q "graph"; then
                echo "✅ RedisGraph module working"
            else
                echo "❌ RedisGraph module not detected"
            fi
            
            # Cleanup test instance
            redis-cli -p 6380 shutdown nosave 2>/dev/null
            rm -rf "$TEMP_DIR"
        else
            echo "❌ Redis Stack test failed"
        fi
    fi
else
    echo "❌ Redis Stack not found"
    echo ""
    echo "To install Redis Stack with full module support:"
    echo ""
    echo "macOS (Homebrew):"
    echo "  brew install redis-stack"
    echo ""
    echo "Linux:"
    echo "  curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg"
    echo "  echo \"deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb \$(lsb_release -cs) main\" | sudo tee /etc/apt/sources.list.d/redis.list"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install redis-stack-server"
fi

echo ""
echo "For more information: https://redis.io/docs/stack/"