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

# Clean up any existing database processes first
echo ""
echo "🧹 Cleaning up existing database processes..."
./server/scripts/cleanup-ports.sh

# Start databases using dedicated scripts
echo ""
echo "🗄️  Starting Database Services..."
echo "=================================="

# Function to start a database service
start_database_service() {
    local service_name=$1
    local script_path=$2
    local process_pattern=$3
    
    echo ""
    echo "Starting $service_name..."
    
    if [ -n "$process_pattern" ] && pgrep $process_pattern >/dev/null 2>&1; then
        echo "✅ $service_name already running"
        return 0
    fi
    
    if $script_path; then
        echo "✅ $service_name startup completed"
        return 0
    else
        echo "⚠️  $service_name startup failed (will use fallback in app)"
        return 1
    fi
}

# Start each database service
start_database_service "MongoDB" "./server/scripts/start-mongodb.sh" "mongod"
start_database_service "Redis" "./server/scripts/start-redis.sh" "redis-server" 
start_database_service "DynamoDB Local" "./server/scripts/start-dynamodb.sh" "-f DynamoDBLocal"
start_database_service "Elasticsearch" "./server/scripts/start-elasticsearch.sh" ""

# Function to check if a service is responding
check_service() {
    local service_name=$1
    local port=$2
    local max_attempts=10
    local attempt=1
    
    echo -n "Checking $service_name on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        # Use different methods to check port connectivity depending on available tools
        if command -v nc >/dev/null 2>&1; then
            # Use netcat if available
            if nc -z localhost $port 2>/dev/null; then
                echo " ✅ Ready"
                return 0
            fi
        elif command -v curl >/dev/null 2>&1; then
            # Use curl as fallback for HTTP services
            if [ "$port" = "9200" ] || [ "$port" = "9201" ]; then
                if curl -s --connect-timeout 1 localhost:$port >/dev/null 2>&1; then
                    echo " ✅ Ready"
                    return 0
                fi
            fi
        else
            # Use lsof as last resort
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo " ✅ Ready"
                return 0
            fi
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo " ⚠️  Not responding"
    return 1
}

# Wait for databases to be ready
echo ""
echo "⏳ Verifying Database Connectivity..."
echo "====================================="

check_service "MongoDB" 27017
check_service "Redis" 6379  
check_service "DynamoDB Local" 8000
check_service "Elasticsearch PostgreSQL" 9200
check_service "Elasticsearch DynamoDB" 9201

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