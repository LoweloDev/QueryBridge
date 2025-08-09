# Universal Query Translator - Docker Setup

This guide helps you set up the Universal Query Translator with Docker for clean, containerized database management.

## Prerequisites

- Docker Desktop installed and running
- Node.js 18+ installed
- Git

## Quick Start

1. **Install Docker environment:**
   ```bash
   ./install-docker.sh
   ```

2. **Start development server:**
   ```bash
   ./start-dev-docker.sh
   ```

4. **Access the application:**
   - Web Application: http://localhost:5000
   - PostgreSQL: localhost:5432 (user: postgres, db: querybridge_dev)
   - MongoDB: localhost:27017 (user: admin, db: analytics)
   - Redis: localhost:6379
   - Redis Insight: http://localhost:8001
   - DynamoDB: http://localhost:8000
   - OpenSearch: http://localhost:9200
   - OpenSearch Secondary: http://localhost:9201

## Docker Services

### Database Services
- **PostgreSQL 16**: Primary relational database with sample users/orders data
- **MongoDB 7**: Document database with analytics events and user data
- **Redis Stack**: Cache with Redis Search, JSON, and Graph modules
- **DynamoDB Local**: Local NoSQL database for development
- **OpenSearch 2.14.0**: Search engine with built-in SQL plugin
- **OpenSearch Secondary**: Additional OpenSearch instance for multi-database scenarios

### Features
- **Automatic initialization**: All databases include sample data
- **Health checks**: Ensures services are ready before starting application
- **Volume persistence**: Data persists across container restarts
- **Development optimized**: Lower memory usage for development

## Management Commands

### Database Management
```bash
# Start all databases
./start-databases.sh

# Stop all databases
./stop-databases.sh

# View logs for a specific service
docker-compose logs -f postgresql
docker-compose logs -f mongodb
docker-compose logs -f opensearch

# Restart a specific service
docker-compose restart postgresql

# Clean reset (removes all data)
docker-compose down -v && docker-compose up -d
```

### Development Command
```bash
./start-dev-docker.sh
```

## Configuration

### Environment Variables
The Docker setup uses `.env.docker` for configuration:
```bash
# Database credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=querybridge_dev

MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password
MONGO_DATABASE=analytics

# Service ports
POSTGRES_PORT=5432
MONGO_PORT=27017
REDIS_PORT=6379
DYNAMODB_PORT=8000
OPENSEARCH_PORT=9200
```

### Development vs Production
- Development uses `docker-compose.override.yml` for lower memory usage
- Production configuration in `docker-compose.yml` with optimized settings
- Environment detection automatically configures database connections

## Database Testing

### PostgreSQL
```bash
psql -h localhost -U postgres -d querybridge_dev
```

### MongoDB
```bash
mongosh mongodb://admin:password@localhost:27017/analytics
```

### Redis
```bash
redis-cli -h localhost -p 6379
```

### DynamoDB
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### OpenSearch
```bash
# Health check
curl http://localhost:9200/_cluster/health

# SQL query (built-in plugin)
curl -X POST "http://localhost:9200/_plugins/_sql" \
  -H "Content-Type: application/json" \
  -d '{"query": "SHOW TABLES"}'
```

## Troubleshooting

### Docker Issues
```bash
# Check Docker is running
docker info

# Check container status
docker-compose ps

# View container logs
docker-compose logs [service_name]

# Rebuild containers
docker-compose down && docker-compose up --build -d
```

### Port Conflicts
If ports are already in use:
```bash
# Stop all containers
docker-compose down

# Check port usage
lsof -i :5432  # PostgreSQL
lsof -i :27017 # MongoDB
lsof -i :6379  # Redis

# Kill processes using ports
sudo lsof -ti:5432 | xargs kill -9
```

### Memory Issues
If containers fail due to memory:
```bash
# Check Docker memory limits in Docker Desktop settings
# Recommended: 4GB+ RAM for all services

# Or start services individually
docker-compose up -d postgresql mongodb redis
docker-compose up -d opensearch  # Higher memory requirement
```

## Data Initialization

All databases include sample data:

### PostgreSQL
- `users` table with 5 sample users
- `orders` table with purchase history
- `products` table with inventory

### MongoDB
- `events` collection with analytics data
- `users` collection with user profiles
- `products` collection with product catalog

### OpenSearch
- Automatic index creation
- SQL plugin pre-configured
- Ready for document indexing

## Migration from Local Setup

To migrate from local database installations:

1. **Stop local databases:**
   ```bash
   ./stop-all-databases.sh
   ```

2. **Export data** (optional):
   ```bash
   # PostgreSQL
   pg_dump querybridge_dev > backup.sql
   
   # MongoDB
   mongodump --db analytics --out mongodb_backup
   ```

3. **Start Docker environment:**
   ```bash
   ./install-docker.sh
   ./start-databases.sh
   ```

4. **Import data** (if needed):
   ```bash
   # PostgreSQL
   psql -h localhost -U postgres -d querybridge_dev < backup.sql
   
   # MongoDB
   mongorestore --host localhost:27017 --username admin --password password mongodb_backup
   ```

## Benefits of Docker Setup

- **Clean environment**: No local database installations
- **Consistent setup**: Same environment across development machines
- **Easy reset**: Quick data cleanup and fresh start
- **Version control**: Specific database versions for consistency
- **Resource management**: Better memory and CPU allocation
- **Multi-database**: All 5+ databases running simultaneously without conflicts