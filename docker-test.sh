#!/bin/bash
# Quick Docker environment test script

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🧪 Docker Environment Test"
echo "=========================="

# Detect compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    print_error "Docker Compose not found"
    exit 1
fi

echo "Using command: $COMPOSE_CMD"

# Check if containers are running
echo ""
echo "📊 Container Status:"
echo "==================="

containers=("uqt-postgresql" "uqt-mongodb" "uqt-redis" "uqt-dynamodb" "uqt-opensearch" "uqt-opensearch-secondary")
running_count=0

for container in "${containers[@]}"; do
    if docker ps --filter "name=$container" --filter "status=running" -q | grep -q .; then
        print_status "$container is running"
        running_count=$((running_count + 1))
    else
        print_warning "$container is not running"
    fi
done

echo ""
echo "📊 Summary: $running_count/6 containers running"

if [ $running_count -eq 0 ]; then
    print_error "No containers running. Try: $COMPOSE_CMD up -d"
    exit 1
fi

# Test database connections
echo ""
echo "🔗 Database Connection Test:"
echo "============================"

# Test PostgreSQL
if nc -z localhost 5432 2>/dev/null; then
    print_status "PostgreSQL (5432) - Available"
else
    print_warning "PostgreSQL (5432) - Not reachable"
fi

# Test MongoDB
if nc -z localhost 27017 2>/dev/null; then
    print_status "MongoDB (27017) - Available"  
else
    print_warning "MongoDB (27017) - Not reachable"
fi

# Test Redis
if nc -z localhost 6379 2>/dev/null; then
    print_status "Redis (6379) - Available"
else
    print_warning "Redis (6379) - Not reachable"
fi

# Test DynamoDB
if nc -z localhost 8000 2>/dev/null; then
    print_status "DynamoDB (8000) - Available"
else
    print_warning "DynamoDB (8000) - Not reachable"
fi

# Test OpenSearch
if nc -z localhost 9200 2>/dev/null; then
    print_status "OpenSearch (9200) - Available"
else
    print_warning "OpenSearch (9200) - Not reachable"
fi

# Test OpenSearch Secondary
if nc -z localhost 9201 2>/dev/null; then
    print_status "OpenSearch Secondary (9201) - Available"
else
    print_warning "OpenSearch Secondary (9201) - Not reachable"
fi

echo ""
echo "🛠️  Useful Commands:"
echo "==================="
echo "  Start all:      $COMPOSE_CMD up -d"
echo "  View logs:      $COMPOSE_CMD logs -f [service_name]"
echo "  Stop all:       $COMPOSE_CMD down"
echo "  Restart:        $COMPOSE_CMD restart [service_name]"
echo "  Clean reset:    $COMPOSE_CMD down -v && $COMPOSE_CMD up -d"
echo ""
echo "🚀 If databases look good, try: ./start-dev-docker.sh"