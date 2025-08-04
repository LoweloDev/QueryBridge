#!/bin/bash
# Universal Query Library - Complete Development Environment Startup
# Starts all databases and the application for local development

set -e  # Exit on any error

echo "🚀 Starting Universal Query Library Development Environment"
echo "=========================================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
        return 1
    fi
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service to be ready on port $port..."
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            echo "✅ $service is ready"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service failed to start on port $port"
    return 1
}

# Create all data directories
echo "📁 Creating data directories..."
mkdir -p server/data/{mongodb,redis,dynamodb,elasticsearch/{postgresql-layer,dynamodb-layer,logs}}

# Check required tools
echo "🔍 Checking system requirements..."

# Check Java (required for DynamoDB and Elasticsearch)
if ! command -v java &> /dev/null; then
    echo "❌ Java not found. Please install Java 17+ for DynamoDB and Elasticsearch"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js"
    exit 1
fi

echo "✅ System requirements met"

# Check for environment file
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  No .env file found. For full functionality, copy .env.example to .env and configure your database connections."
    echo "   PostgreSQL via DATABASE_URL is recommended for production features."
    echo ""
fi

# Build and install the local npm package
echo ""
echo "📦 Building and Installing Local NPM Package..."
echo "==============================================="
echo "Building universal-query-translator library..."
cd lib
npm run build
echo "✅ Library built successfully"

echo "Packaging library for local installation..."
npm pack
echo "✅ Library packaged"

echo "Installing library locally..."
cd ..
mkdir -p node_modules/universal-query-translator
cd node_modules/universal-query-translator
tar -xzf ../../lib/universal-query-translator-1.0.0.tgz --strip-components=1
cd ../..
echo "✅ Library installed locally as npm package"

# Start databases in sequence
echo ""
echo "🗄️  Starting Database Services..."
echo "=================================="

# 1. Start MongoDB
echo "Starting MongoDB..."
if pgrep mongod >/dev/null 2>&1; then
    echo "✅ MongoDB already running"
elif ./server/scripts/start-mongodb.sh; then
    echo "✅ MongoDB startup initiated"
else
    echo "⚠️  MongoDB startup failed (will use fallback in app)"
fi

# 2. Start Redis
echo ""
echo "Starting Redis..."
if pgrep redis-server >/dev/null 2>&1; then
    echo "✅ Redis already running"
elif ./server/scripts/start-redis.sh; then
    echo "✅ Redis startup initiated"
else
    echo "⚠️  Redis startup failed (will use fallback in app)"
fi

# 3. Start DynamoDB
echo ""
echo "Starting DynamoDB Local..."
if pgrep -f DynamoDBLocal >/dev/null 2>&1; then
    echo "✅ DynamoDB already running"
elif ./server/scripts/start-dynamodb.sh; then
    echo "✅ DynamoDB startup initiated"
else
    echo "⚠️  DynamoDB startup failed (will use fallback in app)"
fi

# 4. Start Elasticsearch
echo ""
echo "Starting Elasticsearch (dual configuration)..."
if curl -s http://localhost:9200/_cluster/health >/dev/null 2>&1; then
    echo "✅ Elasticsearch already running on port 9200"
    if curl -s http://localhost:9201/_cluster/health >/dev/null 2>&1; then
        echo "✅ Elasticsearch already running on port 9201"
    else
        echo "⚠️  Starting Elasticsearch on port 9201..."
        ./server/scripts/start-elasticsearch.sh
    fi
elif ./server/scripts/start-elasticsearch.sh; then
    echo "✅ Elasticsearch startup initiated"
else
    echo "⚠️  Elasticsearch startup failed (will use fallback in app)"
fi

# Wait for databases to be ready
echo ""
echo "⏳ Waiting for databases to initialize..."
sleep 10

# Optional: Wait for specific services (comment out if causing issues)
# wait_for_service "MongoDB" 27017 || echo "⚠️  MongoDB may not be fully ready"
# wait_for_service "Redis" 6379 || echo "⚠️  Redis may not be fully ready" 
# wait_for_service "DynamoDB" 8000 || echo "⚠️  DynamoDB may not be fully ready"
# wait_for_service "Elasticsearch PostgreSQL" 9200 || echo "⚠️  Elasticsearch PostgreSQL may not be fully ready"
# wait_for_service "Elasticsearch DynamoDB" 9201 || echo "⚠️  Elasticsearch DynamoDB may not be fully ready"

# Show database status
echo ""
echo "📊 Database Status Summary:"
echo "============================"
echo "PostgreSQL: ✅ (Using Neon serverless)"
echo "MongoDB: $(pgrep mongod >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"
echo "Redis: $(pgrep redis-server >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"
echo "DynamoDB: $(pgrep -f DynamoDBLocal >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"
echo "Elasticsearch PostgreSQL: $(curl -s http://localhost:9200/_cluster/health >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"
echo "Elasticsearch DynamoDB: $(curl -s http://localhost:9201/_cluster/health >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"

# Start the application
echo ""
echo "🚀 Starting Universal Query Library Application..."
echo "================================================="
echo "Starting development server on http://localhost:5000"
echo ""
echo "Available database connections:"
echo "  - PostgreSQL: Production (Neon)"
echo "  - MongoDB: localhost:27017 (analytics)"
echo "  - Redis: localhost:6379 (cache)"  
echo "  - DynamoDB: localhost:8000 (users)"
echo "  - Elasticsearch PostgreSQL: localhost:9200"
echo "  - Elasticsearch DynamoDB: localhost:9201"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start the application
npm run dev