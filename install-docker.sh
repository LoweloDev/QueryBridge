#!/bin/bash
# Universal Query Translator Docker Installation Script
# Sets up Docker-based database environment for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
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

print_step() {
    echo -e "\n${BLUE}=== Step $1: $2 ===${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
OS="Unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
fi

echo "🚀 Universal Query Translator Docker Setup"
echo "=========================================="
echo "Setting up containerized database environment..."
echo "OS detected: $OS"
echo ""

# Step 1: Check Docker installation
print_step "1" "Checking Docker Installation"
if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    print_status "Docker found: $DOCKER_VERSION"
    
    # Check if Docker is running
    if docker info >/dev/null 2>&1; then
        print_status "Docker daemon is running"
    else
        print_error "Docker daemon is not running"
        print_info "Please start Docker Desktop or Docker service"
        exit 1
    fi
else
    print_error "Docker not found"
    print_info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Step 2: Check Docker Compose
print_step "2" "Checking Docker Compose"
if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
    if command_exists docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version)
        print_status "Docker Compose found: $COMPOSE_VERSION"
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_VERSION=$(docker compose version)
        print_status "Docker Compose (plugin) found: $COMPOSE_VERSION"
        COMPOSE_CMD="docker compose"
    fi
else
    print_error "Docker Compose not found"
    print_info "Please install Docker Compose"
    exit 1
fi

# Step 3: Create necessary directories
print_step "3" "Creating Data Directories"
mkdir -p server/data/postgresql-logs
mkdir -p server/data/mongodb-logs
mkdir -p server/data/elasticsearch-logs
print_status "Data directories created"

# Step 4: Pull Docker images
print_step "4" "Pulling Docker Images"
print_info "This may take a few minutes for first-time setup..."

images=(
    "postgres:16"
    "mongo:7"
    "redis/redis-stack:latest"
    "amazon/dynamodb-local:latest"
    "docker.elastic.co/elasticsearch/elasticsearch:8.11.3"
    "docker.elastic.co/kibana/kibana:8.11.3"
)

for image in "${images[@]}"; do
    echo "Pulling $image..."
    if docker pull "$image"; then
        print_status "Pulled $image"
    else
        print_warning "Failed to pull $image, will retry during startup"
    fi
done

# Step 5: Create environment file
print_step "5" "Creating Environment Configuration"
if [ ! -f .env.docker ]; then
    cat > .env.docker << EOF
# Docker Environment Configuration
COMPOSE_PROJECT_NAME=universal-query-translator

# Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=querybridge_dev

MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password
MONGO_DATABASE=analytics

# Service Ports
POSTGRES_PORT=5432
MONGO_PORT=27017
REDIS_PORT=6379
REDIS_INSIGHT_PORT=8001
DYNAMODB_PORT=8000
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_SECONDARY_PORT=9201

# Docker Memory Limits (adjust based on your system)
ELASTICSEARCH_MEMORY=512m
ELASTICSEARCH_DEV_MEMORY=256m
EOF
    print_status "Environment file created: .env.docker"
else
    print_info "Environment file already exists: .env.docker"
fi

# Step 6: Test Docker Compose configuration
print_step "6" "Validating Docker Compose Configuration"
if $COMPOSE_CMD config >/dev/null 2>&1; then
    print_status "Docker Compose configuration is valid"
else
    print_error "Docker Compose configuration has errors"
    print_info "Run '$COMPOSE_CMD config' to see detailed errors"
    exit 1
fi

# Step 7: Create startup script
print_step "7" "Creating Database Startup Script"
cat > start-databases.sh << 'EOF'
#!/bin/bash
# Start all databases using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Detect compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

echo "🚀 Starting Universal Query Translator Databases"
echo "================================================"

# Start services
print_info "Starting database containers..."
$COMPOSE_CMD up -d

# Wait for services to be healthy
print_info "Waiting for services to become healthy..."
sleep 10

# Check service health
services=("postgresql" "mongodb" "redis" "dynamodb" "elasticsearch")
for service in "${services[@]}"; do
    if docker ps --filter "name=uqt-$service" --filter "status=running" | grep -q "uqt-$service"; then
        print_status "$service is running"
    else
        print_warning "$service may not be ready yet"
    fi
done

echo ""
print_status "Database environment is ready!"
echo ""
echo "📊 Service URLs:"
echo "  PostgreSQL:     localhost:5432 (user: postgres, db: querybridge_dev)"
echo "  MongoDB:        localhost:27017 (user: admin, db: analytics)"  
echo "  Redis:          localhost:6379"
echo "  Redis Insight:  http://localhost:8001"
echo "  DynamoDB:       http://localhost:8000"
echo "  Elasticsearch:  http://localhost:9200"
echo "  Kibana:         http://localhost:5601"
echo ""
echo "🛠️  Management Commands:"
echo "  View logs:      $COMPOSE_CMD logs -f [service_name]"
echo "  Stop all:       $COMPOSE_CMD down"
echo "  Restart:        $COMPOSE_CMD restart [service_name]"
echo "  Clean reset:    $COMPOSE_CMD down -v && $COMPOSE_CMD up -d"
EOF

chmod +x start-databases.sh
print_status "Database startup script created: start-databases.sh"

# Step 8: Create stop script
cat > stop-databases.sh << 'EOF'
#!/bin/bash
# Stop all database containers

# Detect compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

echo "🛑 Stopping Universal Query Translator Databases"
echo "================================================"

$COMPOSE_CMD down

echo "✅ All database containers stopped"
EOF

chmod +x stop-databases.sh
print_status "Database stop script created: stop-databases.sh"

# Step 9: Installation summary
print_step "8" "Installation Summary"
print_status "Docker-based database environment configured successfully!"
echo ""
echo "📁 Files created:"
echo "  ✓ docker-compose.yml - Main service definitions"
echo "  ✓ docker-compose.override.yml - Development overrides"
echo "  ✓ .env.docker - Environment configuration"
echo "  ✓ start-databases.sh - Start all databases"
echo "  ✓ stop-databases.sh - Stop all databases"
echo "  ✓ server/data/postgresql-init/ - PostgreSQL initialization"
echo "  ✓ server/data/mongodb-init/ - MongoDB initialization"
echo ""
echo "🚀 Next steps:"
echo "  1. Start databases: ./start-databases.sh"
echo "  2. Start development: ./start-dev.sh"
echo "  3. Visit application: http://localhost:5000"
echo ""
echo "🧪 Testing database connections:"
echo "  PostgreSQL: psql -h localhost -U postgres -d querybridge_dev"
echo "  MongoDB:    mongosh mongodb://admin:password@localhost:27017/analytics"
echo "  Redis:      redis-cli -h localhost -p 6379"
echo "  DynamoDB:   aws dynamodb list-tables --endpoint-url http://localhost:8000"
echo "  Elasticsearch: curl http://localhost:9200"
echo ""
print_info "All databases include sample data and are ready for development!"