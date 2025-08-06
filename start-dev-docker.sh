#!/bin/bash
# Enhanced development startup script with Docker database management
# Starts Docker containers and application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "🚀 Starting Universal Query Library Application"
echo "=============================================="

# Detect compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    print_error "Docker Compose not found"
    print_info "Please install Docker Desktop or run: ./install-docker.sh"
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running"
    print_info "Please start Docker Desktop"
    exit 1
fi

# Step 1: Start database containers
print_info "Starting database containers..."
$COMPOSE_CMD up -d

# Wait for containers to be ready  
print_info "Waiting for databases to initialize..."
sleep 5

# Wait for specific services to be healthy
print_info "Checking database health..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    ready_count=0
    
    # Check PostgreSQL
    if nc -z localhost 5432 2>/dev/null; then
        ready_count=$((ready_count + 1))
    fi
    
    # Check MongoDB
    if nc -z localhost 27017 2>/dev/null; then
        ready_count=$((ready_count + 1))
    fi
    
    # Check Redis
    if nc -z localhost 6379 2>/dev/null; then
        ready_count=$((ready_count + 1))
    fi
    
    if [ $ready_count -ge 3 ]; then
        print_status "Core databases are ready"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        print_warning "Some databases may not be ready, continuing anyway..."
        break
    fi
    
    sleep 1
    attempt=$((attempt + 1))
done

# Check container status
containers=("uqt-postgresql" "uqt-mongodb" "uqt-redis" "uqt-dynamodb" "uqt-opensearch" "uqt-opensearch-secondary")
all_running=true

for container in "${containers[@]}"; do
    if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
        print_status "$container is running"
    else
        print_warning "$container is not ready"
        all_running=false
    fi
done

if [ "$all_running" = false ]; then
    print_warning "Some containers may still be starting up"
    print_info "Check container logs: $COMPOSE_CMD logs -f [service_name]"
fi

# Step 2: Rebuild and install npm library
print_info "Building universal-query-translator library..."
if [ -d "lib" ]; then
    cd lib
    npm run build
    npm pack
    cd ..
    
    # Install the library
    if [ -f "lib/universal-query-translator-1.0.0.tgz" ]; then
        npm install ./lib/universal-query-translator-1.0.0.tgz
        print_status "Library installed successfully"
    else
        print_warning "Library package not found, using existing installation"
    fi
else
    print_warning "Library directory not found, skipping library build"
fi

# Step 3: Update database configuration for Docker
print_info "Configuring database connections for Docker environment..."

# Set environment variables for Docker database connections
export DOCKER_MODE=true
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=password
export POSTGRES_DB=querybridge_dev

export MONGODB_HOST=localhost
export MONGODB_PORT=27017
export MONGODB_USER=admin
export MONGODB_PASSWORD=password
export MONGODB_DB=analytics

export REDIS_HOST=localhost
export REDIS_PORT=6379

export DYNAMODB_ENDPOINT=http://localhost:8000
export OPENSEARCH_HOST=localhost
export OPENSEARCH_PORT=9200
export OPENSEARCH_SECONDARY_PORT=9201

# Step 4: Check for port conflicts
print_info "Checking for port conflicts..."
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 5000 is in use, killing existing process..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Step 5: Start the application
print_info "Starting development server..."
exec npm run dev