# Universal Query Library

A universal query abstraction library that translates and optimizes database queries across multiple technologies, providing a seamless multi-database development experience.

## Quick Start

### Option 1: Full Development Environment (Recommended)
```bash
# Start all databases + application
chmod +x start-dev.sh
./start-dev.sh
```

### Option 2: Start Databases Only
```bash
# Start all databases without the application
chmod +x server/scripts/start-all-databases.sh
./server/scripts/start-all-databases.sh

# Then start the application separately
npm run dev
```

### Option 3: Individual Database Control
```bash
# Start individual databases
npm run start:mongodb      # or ./server/scripts/start-mongodb.sh
npm run start:redis        # or ./server/scripts/start-redis.sh  
npm run start:dynamodb     # or ./server/scripts/start-dynamodb.sh
npm run start:elasticsearch # or ./server/scripts/start-elasticsearch.sh

# Then start the application
npm run dev
```

## Supported Databases

### Production Ready
- **PostgreSQL** - Primary relational database (Neon serverless)
- **MongoDB** - Document database for analytics (port 27017)
- **Redis** - In-memory cache with advanced data structures (port 6379)
- **DynamoDB** - NoSQL database with local instance (port 8000)
- **Elasticsearch** - Search and analytics engine
  - PostgreSQL Layer (port 9200)
  - DynamoDB Layer (port 9201)

## Features

### Universal Query Language
- Common syntax across all database types
- Automatic query translation and optimization
- Support for complex joins, aggregations, and filtering

### Advanced Database Features
- **Redis**: Pub/Sub, Lua scripting, advanced data structures
- **Elasticsearch**: Full-text search, real-time analytics, dual-layer architecture
- **DynamoDB**: AWS SDK compatibility, NoSQL flexibility
- **MongoDB**: Aggregation pipelines, flexible schemas

### Development Tools
- Comprehensive startup scripts for all databases
- Health monitoring and connection testing
- Fallback systems for unavailable databases
- Production-ready configurations

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Universal Query Library                  │
├─────────────────────────────────────────────────────────┤
│  Query Parser → Query Translator → Connection Manager  │
├─────────────────────────────────────────────────────────┤
│                Database Connections                     │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│PostgreSQL│ MongoDB  │  Redis   │DynamoDB  │Elasticsearch│
│(Neon)    │(Local)   │(Local)   │(Local)   │(Dual Layer) │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
```

## System Requirements

- **Node.js** 18+ 
- **Java** 17+ (for DynamoDB and Elasticsearch)
- **Operating System**: Linux, macOS, or Windows with WSL

## Environment Notes

### Local Development
All databases start and persist correctly with full functionality.

### Containerized Environments (Replit, etc.)
- Databases start successfully but may not persist after startup scripts complete
- PostgreSQL works normally (uses external Neon service)
- Application includes fallback systems for unavailable local databases

## Database Ports

| Database | Port | Purpose |
|----------|------|---------|
| PostgreSQL | 5432 | Primary database (Neon) |
| MongoDB | 27017 | Document storage |
| Redis | 6379 | Cache and data structures |
| DynamoDB | 8000 | NoSQL operations |
| Elasticsearch PostgreSQL | 9200 | Search over PostgreSQL data |
| Elasticsearch DynamoDB | 9201 | Search over DynamoDB data |

## Documentation

- [Database Setup Guide](server/scripts/README.md)
- [Library Architecture](lib/README.md)
- [API Documentation](docs/api.md)

## Usage Example

```javascript
import { ConnectionManager, QueryTranslator } from './lib/src/index.js';

// Initialize the library
const connectionManager = new ConnectionManager();
const queryTranslator = new QueryTranslator();

// Universal query syntax
const query = `
  FIND users 
  WHERE age > 25 
  AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 10
`;

// Translate to database-specific queries
const sqlQuery = queryTranslator.translateToSQL(query);
const mongoQuery = queryTranslator.translateToMongoDB(query);
const elasticSearchQuery = queryTranslator.translateToElasticsearch(query);
```

## Contributing

1. Clone the repository
2. Run `./start-dev.sh` to start the full development environment
3. The application will be available at `http://localhost:5000`
4. Make your changes and test across all database types

## License

MIT License - see LICENSE file for details