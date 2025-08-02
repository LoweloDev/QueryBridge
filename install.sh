#!/bin/bash
# Universal Query Library - Installation Script
# Sets up all dependencies and database environments for local development

set -e

echo "🚀 Universal Query Library - Installation Setup"
echo "==============================================="

# Check system requirements
echo "🔍 Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Java (required for DynamoDB and Elasticsearch)
if ! command -v java &> /dev/null; then
    echo "❌ Java not found. Please install Java 17+ first"
    echo "   For Ubuntu/Debian: sudo apt install openjdk-17-jdk"
    echo "   For macOS: brew install openjdk@17"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION found. Please upgrade to Node.js 18+"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "❌ Java version $JAVA_VERSION found. Please upgrade to Java 17+"
    exit 1
fi

echo "✅ Node.js $(node --version) found"
echo "✅ Java $(java -version 2>&1 | head -1) found"

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
    
    # Create elasticsearch directory
    mkdir -p server/elasticsearch
    
    # Download Elasticsearch
    curl -L https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.15.0-linux-x86_64.tar.gz -o /tmp/elasticsearch.tar.gz
    
    if [ $? -eq 0 ]; then
        echo "✅ Downloaded Elasticsearch"
        echo "📦 Extracting Elasticsearch..."
        tar -xzf /tmp/elasticsearch.tar.gz -C server/elasticsearch --strip-components=1
        rm /tmp/elasticsearch.tar.gz
        echo "✅ Elasticsearch extraction complete"
    else
        echo "❌ Failed to download Elasticsearch"
        echo "   Please check your internet connection and try again"
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

# Show final status
echo ""
echo "🎉 Installation Complete!"
echo "========================="
echo ""
echo "📊 Setup Summary:"
echo "  ✅ Node.js dependencies installed"
echo "  ✅ Elasticsearch 8.15.0 installed"
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
echo "  Redis: localhost:6379"
echo "  DynamoDB: localhost:8000"
echo "  Elasticsearch PostgreSQL: localhost:9200"
echo "  Elasticsearch DynamoDB: localhost:9201"
echo ""
echo "Happy coding! 🎯"