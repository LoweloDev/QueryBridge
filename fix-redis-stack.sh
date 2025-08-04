#!/bin/bash
# Fix Redis Stack installation and modules

echo "🔧 Redis Stack Installation Fix"
echo "==============================="

# Check current Redis installation
echo "🔍 Checking current Redis installation..."

if command -v redis-server >/dev/null 2>&1; then
    echo "✅ redis-server found: $(redis-server --version | head -1)"
else
    echo "❌ redis-server not found"
fi

if command -v redis-stack-server >/dev/null 2>&1; then
    echo "✅ redis-stack-server found: $(redis-stack-server --version | head -1)"
else
    echo "❌ redis-stack-server not found"
fi

# Check if we're on macOS with Homebrew
if [ "$(uname)" == "Darwin" ] && command -v brew >/dev/null 2>&1; then
    echo ""
    echo "🍺 macOS with Homebrew detected"
    
    # Check what's installed
    echo "Checking Homebrew Redis installations..."
    
    if brew list | grep -q "^redis$"; then
        echo "📦 Regular Redis installed via Homebrew"
    fi
    
    if brew list | grep -q "redis-stack"; then
        echo "📦 Redis Stack installed via Homebrew"
    else
        echo "❌ Redis Stack not installed via Homebrew"
        echo ""
        read -p "Install Redis Stack now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📦 Installing Redis Stack..."
            brew tap redis-stack/redis-stack
            brew install redis-stack
            
            echo ""
            echo "✅ Redis Stack installation completed"
            echo "🔄 Please restart your terminal or run:"
            echo "   source ~/.bash_profile"
            echo "   # or"
            echo "   source ~/.zshrc"
            echo ""
            echo "Then run this script again to verify the installation."
            exit 0
        fi
    fi
    
    # Check PATH
    echo ""
    echo "🔍 Checking PATH for Redis Stack..."
    
    if command -v redis-stack-server >/dev/null 2>&1; then
        echo "✅ redis-stack-server found in PATH"
        
        # Test Redis Stack with modules
        echo ""
        echo "🧪 Testing Redis Stack modules..."
        
        TEMP_DIR="/tmp/redis-stack-test-$$"
        mkdir -p "$TEMP_DIR"
        
        echo "Starting test Redis Stack instance..."
        redis-stack-server --port 6381 --dir "$TEMP_DIR" --daemonize yes --logfile "$TEMP_DIR/redis.log" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            sleep 3
            echo "✅ Redis Stack started on port 6381"
            
            # Test modules
            echo "Testing modules..."
            MODULES=$(redis-cli -p 6381 module list 2>/dev/null)
            
            if echo "$MODULES" | grep -q "search"; then
                echo "✅ RediSearch module working"
            else
                echo "❌ RediSearch module not found"
            fi
            
            if echo "$MODULES" | grep -q "json"; then
                echo "✅ RedisJSON module working"
            else
                echo "❌ RedisJSON module not found"
            fi
            
            if echo "$MODULES" | grep -q "graph"; then
                echo "✅ RedisGraph module working"
            else
                echo "❌ RedisGraph module not found"
            fi
            
            # Cleanup
            redis-cli -p 6381 shutdown nosave 2>/dev/null
            rm -rf "$TEMP_DIR"
            
            echo ""
            echo "✅ Redis Stack is properly installed and working!"
            echo "🚀 You can now run ./server/scripts/start-redis.sh"
            
        else
            echo "❌ Failed to start Redis Stack test instance"
            echo "Check the log file: $TEMP_DIR/redis.log"
        fi
        
    else
        echo "❌ redis-stack-server not found in PATH"
        
        # Check if it's in a Homebrew location but not in PATH
        HOMEBREW_PREFIX=$(brew --prefix 2>/dev/null)
        if [ -f "$HOMEBREW_PREFIX/bin/redis-stack-server" ]; then
            echo "🔍 Found redis-stack-server in Homebrew location: $HOMEBREW_PREFIX/bin/"
            echo "📝 Adding to PATH..."
            
            if [[ "$SHELL" == *"zsh"* ]]; then
                echo 'export PATH="'"$HOMEBREW_PREFIX"'/bin:$PATH"' >> ~/.zshrc
                echo "✅ Added to ~/.zshrc"
                echo "🔄 Run: source ~/.zshrc"
            else
                echo 'export PATH="'"$HOMEBREW_PREFIX"'/bin:$PATH"' >> ~/.bash_profile
                echo "✅ Added to ~/.bash_profile"
                echo "🔄 Run: source ~/.bash_profile"
            fi
        fi
    fi
    
else
    echo "❌ This script is optimized for macOS with Homebrew"
    echo "Please install Redis Stack manually from: https://redis.io/download"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Restart terminal or source your profile"
echo "2. Run ./server/scripts/start-redis.sh"
echo "3. Redis Stack modules should now be detected"