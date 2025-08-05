# Database Setup Scripts

This directory contains startup scripts for all database services required by the Universal Query Library.

## Overview

The Universal Query Library supports multiple database technologies with separate startup scripts for local development:

- **PostgreSQL**: Primary relational database (uses Neon serverless in production)
- **MongoDB**: Document database for analytics and flexible data storage
- **Redis**: In-memory cache and advanced data structures
- **DynamoDB**: NoSQL database with local DynamoDB instance
- **Elasticsearch**: Search and analytics engine with dual configuration

## Quick Start

### Individual Database Setup

```bash
# PostgreSQL (already configured via Neon)
# No manual setup required - uses environment variables

# MongoDB
chmod +x server/scripts/start-mongodb.sh
./server/scripts/start-mongodb.sh

# Redis
chmod +x server/scripts/start-redis.sh
./server/scripts/start-redis.sh

# DynamoDB
chmod +x server/scripts/start-dynamodb.sh
./server/scripts/start-dynamodb.sh

# Elasticsearch (dual instance)
chmod +x server/scripts/start-elasticsearch.sh
./server/scripts/start-elasticsearch.sh
```

### Full Local Development Setup

```bash
# Start all local databases
./server/scripts/start-mongodb.sh
./server/scripts/start-redis.sh  
./server/scripts/start-dynamodb.sh
./server/scripts/start-elasticsearch.sh

# Then start the application
npm run dev
```

## Database Configurations

### PostgreSQL
- **Port**: 5432 (via Neon serverless)
- **Connection**: Uses DATABASE_URL environment variable
- **Features**: Full SQL support, ACID compliance, complex queries

### MongoDB 
- **Port**: 27017
- **Database**: `analytics`
- **Features**: Document storage, flexible schemas, aggregation pipeline

### Redis
- **Port**: 6379
- **Features**: 
  - Standard Redis operations (GET, SET, HASH, LIST, SET, ZSET)
  - Advanced data structures
  - Pub/Sub messaging
  - Lua scripting
  - Module system (ready for RedisSearch/RedisGraph)
  - LRU eviction policy with persistence

### DynamoDB
- **Port**: 8000
- **Features**: 
  - NoSQL key-value and document store
  - Local DynamoDB instance for testing
  - AWS SDK compatibility
  - Requires Java/OpenJDK 17

### Elasticsearch
- **PostgreSQL Layer**: Port 9200
  - Cluster: `universal-query-postgresql`
  - Purpose: Search layer over PostgreSQL data
- **DynamoDB Layer**: Port 9201  
  - Cluster: `universal-query-dynamodb`
  - Purpose: Search layer over DynamoDB data
- **Features**:
  - Full-text search and analytics
  - RESTful API for indexing and querying
  - JSON-based query DSL
  - Aggregations and analytics
  - Real-time search capabilities

## Environment Limitations

### Replit/Containerized Environments
- ✅ All databases start successfully
- ✅ Connections work during startup
- ❌ Daemon processes don't persist after startup script ends
- ⚠️ This is expected behavior in containerized environments

### Local Development
- ✅ All databases start and persist correctly
- ✅ Full functionality available
- ✅ Production-ready configurations
- ✅ Advanced features enabled

## Data Directories

All databases store data in `server/data/` subdirectories:
- `server/data/mongodb/` - MongoDB data files
- `server/data/redis/` - Redis persistence files
- `server/data/dynamodb/` - DynamoDB Local data
- `server/data/elasticsearch/postgresql-layer/` - Elasticsearch PostgreSQL data
- `server/data/elasticsearch/dynamodb-layer/` - Elasticsearch DynamoDB data
- `server/data/elasticsearch/logs/` - Elasticsearch logs

## Dependencies

### System Requirements
- **Java/OpenJDK 17+** (for DynamoDB and Elasticsearch)
- **Node.js** (for the application)

### Installed Packages
- `mongodb` - MongoDB server
- `redis` - Redis server  
- `dynamodb-local` - DynamoDB Local via npm
- `elasticsearch` - Downloaded automatically (8.15.0)

## Testing Connections

Each startup script includes connection testing to verify the database is accessible:

```bash
# Test individual services
redis-cli ping                              # Redis
mongosh --eval "db.adminCommand('ping')"   # MongoDB
curl http://localhost:8000/                # DynamoDB
curl http://localhost:9200/_cluster/health # Elasticsearch PostgreSQL
curl http://localhost:9201/_cluster/health # Elasticsearch DynamoDB
```

## Library Integration

The Universal Query Library connects to these databases via the `DatabaseSetup` class in `server/services/database-setup.ts`:

- PostgreSQL: `@neondatabase/serverless` with WebSocket support
- MongoDB: `mongodb` native driver
- Redis: `ioredis` client with advanced features
- DynamoDB: `@aws-sdk/client-dynamodb` 
- Elasticsearch: `@elastic/elasticsearch` official client

## Advanced Features

### Redis
- Module system ready for RedisSearch and RedisGraph
- Pub/Sub messaging for real-time applications
- Lua scripting for complex operations
- Memory optimization with LRU eviction

### Elasticsearch  
- Dual-layer architecture for PostgreSQL and DynamoDB integration
- Full-text search capabilities
- Real-time indexing and search
- Advanced aggregations and analytics

### DynamoDB
- Local development instance with AWS compatibility
- NoSQL flexibility with document and key-value support
- Auto-scaling ready configuration

This setup provides a complete multi-database development environment that mirrors production capabilities while remaining lightweight for local development.