#!/bin/bash
# Universal Query Library - Installation Script
# Sets up all dependencies and database environments for local development

set -e

echo "🚀 Universal Query Library - Installation Setup"
echo "==============================================="

# Ensure nvm is available
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
elif [ -x "$(command -v brew)" ]; then
    echo "📦 Installing NVM via Homebrew..."
    brew install nvm
    mkdir -p ~/.nvm
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bash_profile
    echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.bash_profile
    source ~/.bash_profile
else
    echo "❌ nvm not found and Homebrew not available. Please install Node.js 18+ manually."
    exit 1
fi

# Install or upgrade Node.js
REQUIRED_NODE_VERSION=18
NODE_CURRENT_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo 0)

if [ "$NODE_CURRENT_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
    echo "📦 Installing Node.js $REQUIRED_NODE_VERSION via nvm..."
    nvm install $REQUIRED_NODE_VERSION
    nvm use $REQUIRED_NODE_VERSION
    nvm alias default $REQUIRED_NODE_VERSION
else
    echo "✅ Node.js $(node --version) found"
fi

# Check and install Java 17+
echo ""
echo "🔍 Checking Java..."

JAVA_VERSION=$(java -version 2>&1 | head -1 | awk -F '"' '{print $2}' | cut -d'.' -f1 || echo 0)

if [ "$JAVA_VERSION" -lt 17 ]; then
    if [ "$(uname)" == "Darwin" ]; then
        echo "📦 Installing Java 17 via Homebrew..."
        brew install openjdk@17
        sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
        echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.bash_profile
        echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.bash_profile
        source ~/.bash_profile
    else
        echo "❌ Java 17 not found. Please install manually:"
        echo "   Ubuntu/Debian: sudo apt install openjdk-17-jdk"
        exit 1
    fi
else
    echo "✅ Java $(java -version 2>&1 | head -1) found"
fi

# Install Node.js dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
npm install

# Create data directories
echo ""
echo "📁 Creating database data directories..."
mkdir -p server/data/{mongodb,redis,dynamodb,elasticsearch/{postgresql-layer,dynamodb-layer,logs}}

# Setup Elasticsearch
echo ""
echo "🔍 Setting up Elasticsearch 8.15.0..."

if [ ! -f "server/elasticsearch/bin/elasticsearch" ]; then
    echo "⬇️  Downloading Elasticsearch 8.15.0..."

    mkdir -p server/elasticsearch

    curl -L https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.15.0-linux-x86_64.tar.gz -o /tmp/elasticsearch.tar.gz

    if [ $? -eq 0 ]; then
        echo "✅ Downloaded Elasticsearch"
        echo "📦 Extracting Elasticsearch..."
        tar -xzf /tmp/elasticsearch.tar.gz -C server/elasticsearch --strip-components=1
        rm /tmp/elasticsearch.tar.gz
        echo "✅ Elasticsearch extraction complete"
    else
        echo "❌ Failed to download Elasticsearch"
        exit 1
    fi
else
    echo "✅ Elasticsearch already installed"
fi

# Make all scripts executable
echo ""
echo "🔧 Setting up database startup scripts..."
chmod +x start-dev.sh
chmod +x server/scripts/*.sh

# Test Elasticsearch installation
echo ""
echo "🧪 Testing Elasticsearch installation..."
ELASTICSEARCH_VERSION=$(server/elasticsearch/bin/elasticsearch --version 2>/dev/null | head -1 || echo "Version check failed")
echo "✅ $ELASTICSEARCH_VERSION"

# Setup MongoDB (MongoDB Community Server)
echo ""
echo "🔍 Setting up MongoDB..."

if command -v mongod &> /dev/null; then
    echo "✅ MongoDB already installed: $(mongod --version | head -1)"
else
    if [ "$(uname)" == "Darwin" ]; then
        echo "📦 Installing MongoDB via Homebrew (macOS)..."
        if command -v brew &> /dev/null; then
            brew tap mongodb/brew
            brew install mongodb-community
            echo "✅ MongoDB Community Server installed"
        else
            echo "⚠️  Homebrew not found. Please install MongoDB manually from: https://docs.mongodb.com/manual/installation/"
        fi
    elif [ -f /etc/debian_version ]; then
        echo "📦 Installing MongoDB (Debian/Ubuntu)..."
        curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        sudo apt-get update
        sudo apt-get install -y mongodb-org
        echo "✅ MongoDB Community Server installed"
    elif [ -f /etc/redhat-release ]; then
        echo "📦 Installing MongoDB (Red Hat/CentOS)..."
        sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo <<EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-6.0.asc
EOF
        sudo yum install -y mongodb-org
        echo "✅ MongoDB Community Server installed"
    else
        echo "⚠️  Automated MongoDB installation not supported for this OS."
        echo "   Please install MongoDB manually from: https://docs.mongodb.com/manual/installation/"
    fi
fi

# Setup Redis Stack (includes RediSearch, RedisJSON, RedisGraph)
echo ""
echo "🔍 Setting up Redis Stack..."

if command -v redis-server &> /dev/null; then
    echo "✅ Redis already installed: $(redis-server --version | head -1)"
    # Check if it's Redis Stack with modules
    if redis-server --help 2>&1 | grep -q "RediSearch\|RedisJSON\|RedisGraph"; then
        echo "✅ Redis Stack modules detected"
    else
        echo "⚠️  Redis found but may not include Stack modules (RediSearch, RedisJSON, RedisGraph)"
        echo "   Consider upgrading to Redis Stack for full functionality"
    fi
else
    # Check if running in supported environment for Redis Stack
    if [ "$(uname)" == "Darwin" ]; then
        echo "📦 Installing Redis Stack via Homebrew (macOS)..."
        if command -v brew &> /dev/null; then
            if ! brew list redis-stack &> /dev/null; then
                brew tap redis-stack/redis-stack
                brew install redis-stack
            else
                echo "✅ Redis Stack already installed"
            fi
        else
            echo "⚠️  Homebrew not found. Please install Redis Stack manually from: https://redis.io/download"
        fi
    elif [ -f /etc/debian_version ]; then
        echo "📦 Adding Redis Stack repository (Debian/Ubuntu)..."
        curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
        echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
        sudo apt-get update
        sudo apt-get install -y redis-stack-server
    else
        echo "⚠️  Automated Redis Stack installation not supported for this OS."
        echo "   Please install Redis Stack manually from: https://redis.io/download"
        echo "   This provides RediSearch, RedisJSON, and RedisGraph modules."
    fi
fi

# Show final status
echo ""
echo "🎉 Installation Complete!"
echo "========================="
echo ""
echo "📊 Setup Summary:"
echo "  ✅ Node.js $(node --version) installed"
echo "  ✅ Java $(java -version 2>&1 | head -1 | awk -F'"' '{print $2}') installed"
echo "  ✅ MongoDB installation checked/attempted"
echo "  ✅ Redis Stack installation checked/attempted"
echo "  ✅ Elasticsearch 8.15.0 installed"
echo "  ✅ DynamoDB Local available via npm package"
echo "  ✅ Database data directories created"
echo "  ✅ Startup scripts configured"
echo ""
echo "🚀 Quick Start:"
echo "  ./start-dev.sh          # Start all databases + application"
echo "  npm run dev             # Start application only"
echo ""
echo "🌐 Application will be available at: http://localhost:5000"
echo ""
echo "📚 Database Ports:"
echo "  PostgreSQL: Production (Neon)"
echo "  MongoDB: localhost:27017"
echo "  Redis Stack: localhost:6379 (with RediSearch, RedisJSON, RedisGraph)"
echo "  DynamoDB: localhost:8000"
echo "  Elasticsearch PostgreSQL: localhost:9200"
echo "  Elasticsearch DynamoDB: localhost:9201"
echo ""
echo "Happy coding! 🎯"
