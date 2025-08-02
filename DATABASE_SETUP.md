# Database Infrastructure Setup

QueryFlow now supports both mock connections for development and real database connections for production use.

## Architecture Overview

### Mock Database Layer (Default)
- **Purpose**: Fast development, testing, and demonstrations
- **Storage**: In-memory with realistic mock data
- **Connections**: Simulated connection manager
- **Use Case**: Default mode for the query playground interface

### Real Database Layer (Optional)
- **Purpose**: Production use, real data testing, and npm package deployment
- **Storage**: Actual database instances with real connections
- **Connections**: Full database clients (PostgreSQL, MongoDB, Redis, DynamoDB, Elasticsearch)
- **Use Case**: When deploying as an npm package or testing with real data

## Supported Databases

| Database | Type | Default Port | Connection Status |
|----------|------|--------------|------------------|
| PostgreSQL | SQL | 5432 | ✅ Active (Configured) |
| MongoDB | NoSQL | 27017 | 🔧 Setup Required |
| Redis | Cache/Search | 6379 | 🔧 Setup Required |
| DynamoDB Local | NoSQL | 8000 | 🔧 Setup Required |
| Elasticsearch | Search | 9200 | 🔧 Setup Required |

## Quick Setup Commands

### Test Real Database Connections
```bash
# Check connection status
curl -s http://localhost:5000/api/real-databases/status | jq .

# Initialize real database connections
curl -s -X POST http://localhost:5000/api/real-databases/initialize | jq .
```

### Start Local Databases (Linux/macOS)
```bash
# Start all databases with setup script
tsx server/scripts/setup-databases.ts

# Or start individual databases:
# MongoDB
mongod --dbpath ./data/mongodb --port 27017

# Redis
redis-server --port 6379

# DynamoDB Local  
npx dynamodb-local -port 8000 -dbPath ./data/dynamodb

# Elasticsearch (if installed)
elasticsearch
```

## Configuration

### Environment Variables
```bash
# PostgreSQL (Already configured via Replit)
PGHOST=localhost
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres
PGPASSWORD=

# MongoDB
MONGODB_URL=mongodb://localhost:27017

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
```

### Local Development Config
The `localDatabaseConfig` in `server/config/database-config.ts` contains default settings for all databases.

## Package Deployment

When deploying QueryFlow as an npm package:

1. **Import the Database Manager**:
```javascript
import { RealDatabaseManager } from 'queryflow';

const dbManager = new RealDatabaseManager();
await dbManager.connect(yourDatabaseConfig);
```

2. **Use Your Own Database Connections**:
```javascript
const config = {
  connections: [
    {
      id: 'prod-postgres',
      name: 'Production PostgreSQL',
      type: 'postgresql',
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: true
      }
    }
    // Add your other databases...
  ]
};
```

3. **Clean Architecture Separation**:
- Query abstraction library: `server/services/`
- Database manager: `server/database-manager.ts`
- Configuration: `server/config/database-config.ts`

## API Endpoints

### Real Database Testing
- `GET /api/real-databases/status` - Check connection status
- `POST /api/real-databases/initialize` - Initialize connections

### Mock Database (Default)
- `GET /api/connections` - List mock connections
- `POST /api/query/execute` - Execute queries on mock data

## Development Workflow

1. **Default Mode**: Use mock databases for fast development
2. **Real Testing**: Start local databases and test with real connections
3. **Production**: Deploy with your own database configurations

## Next Steps

- Install and configure local databases for testing
- Test real database connections with sample queries
- Deploy as npm package with clean separation