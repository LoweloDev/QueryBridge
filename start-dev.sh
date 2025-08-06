#!/bin/bash
# Universal Query Library - Docker-based Development Environment Startup
# Starts all databases via Docker Compose and the application

set -e  # Exit on any error

echo "🚀 Starting Universal Query Library Development Environment (Docker)"
echo "=================================================================="

# Function to check if Docker is running
check_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        echo "❌ Docker not found. Please run ./install.sh first"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again"
        exit 1
    fi
    
    echo "✅ Docker is running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
        echo "✅ Docker Compose v2 available"
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
        echo "✅ Docker Compose v1 available"
    else
        echo "❌ Docker Compose not found. Please run ./install.sh first"
        exit 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=60
    local attempt=1
    
    echo -n "⏳ Waiting for $service (port $port)..."
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null || curl -s --connect-timeout 1 localhost:$port >/dev/null 2>&1; then
            echo " ✅ Ready"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo " ⚠️  Timeout after $((max_attempts * 2)) seconds"
    return 1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
check_docker
check_docker_compose

# Set environment variables for Docker mode
export DOCKER_MODE=true
export NODE_ENV=development

# Check for environment file
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  No .env file found. Run ./install.sh to create one with Docker defaults."
    echo ""
fi

# Clean up any existing containers and start fresh
echo ""
echo "🧹 Cleaning up existing containers..."
$COMPOSE_CMD down --remove-orphans 2>/dev/null || true

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

# Start all database services with Docker Compose
echo ""
echo "🐳 Starting Database Services with Docker..."
echo "============================================"

# Start services in detached mode
echo "Starting all database containers..."
$COMPOSE_CMD up -d

# Check if containers started successfully
echo ""
echo "📊 Container Status:"
$COMPOSE_CMD ps

# Wait for all services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
echo "====================================="

wait_for_service "PostgreSQL" 5432
wait_for_service "MongoDB" 27017
wait_for_service "Redis" 6379
wait_for_service "DynamoDB Local" 8000
wait_for_service "OpenSearch" 9200

# Show service health
echo ""
echo "🏥 Service Health Check:"
echo "========================"

# PostgreSQL health check
if docker exec querybridge-postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo "✅ PostgreSQL: Healthy"
else
    echo "⚠️  PostgreSQL: Not ready"
fi

# MongoDB health check
if docker exec querybridge-mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo "✅ MongoDB: Healthy"
else
    echo "⚠️  MongoDB: Not ready"
fi

# Redis health check
if docker exec querybridge-redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis: Healthy"
else
    echo "⚠️  Redis: Not ready"
fi

# DynamoDB health check
if curl -s http://localhost:8000/ >/dev/null 2>&1; then
    echo "✅ DynamoDB Local: Healthy"
else
    echo "⚠️  DynamoDB Local: Not ready"
fi

# OpenSearch health check
if curl -s http://localhost:9200/_cluster/health >/dev/null 2>&1; then
    echo "✅ OpenSearch: Healthy"
else
    echo "⚠️  OpenSearch: Not ready"
fi

# Show database URLs and access information
echo ""
echo "🔗 Database Connection Information:"
echo "==================================="
echo "PostgreSQL:"
echo "  • Host: localhost:5432"
echo "  • Database: querybridge_dev"
echo "  • Username: postgres"
echo "  • Password: password"
echo ""
echo "MongoDB:"
echo "  • Host: localhost:27017"
echo "  • Database: analytics"
echo "  • Username: admin"
echo "  • Password: password"
echo ""
echo "Redis:"
echo "  • Host: localhost:6379"
echo "  • Web UI: http://localhost:8001 (RedisInsight)"
echo ""
echo "DynamoDB Local:"
echo "  • Endpoint: http://localhost:8000"
echo "  • Region: us-east-1"
echo "  • Access Key: dummy / Secret Key: dummy"
echo ""
echo "OpenSearch:"
echo "  • API: http://localhost:9200"
echo "  • Dashboards: http://localhost:5601"
echo "  • SQL Plugin: http://localhost:9200/_plugins/_sql"
echo ""

# Create cleanup script
cat > stop-dev.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Universal Query Library Development Environment..."

# Determine Docker Compose command
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose not found"
    exit 1
fi

# Stop all services
$COMPOSE_CMD down

echo "✅ All services stopped"
EOF

chmod +x stop-dev.sh
echo "📝 Created stop-dev.sh script to stop all services"

# Start the application
echo ""
echo "🚀 Starting Universal Query Library Application..."
echo "================================================="
echo "Starting development server on http://localhost:5000"
echo ""
echo "📚 Available interfaces:"
echo "  • Main application: http://localhost:5000"
echo "  • RedisInsight: http://localhost:8001"
echo "  • OpenSearch Dashboards: http://localhost:5601"
echo ""
echo "🛑 To stop all services:"
echo "  • Press Ctrl+C to stop the application"
echo "  • Run './stop-dev.sh' to stop Docker containers"
echo ""
echo "🐳 Docker commands:"
echo "  • View logs: docker compose logs -f [service]"
echo "  • Restart service: docker compose restart [service]"
echo "  • Shell access: docker exec -it querybridge-[service] bash"
echo ""

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down development server..."
    echo "   💡 Docker containers are still running. Use './stop-dev.sh' to stop them."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the application
npm run dev