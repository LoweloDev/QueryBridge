# Universal Query Translator

A powerful TypeScript library that provides a unified query interface for multiple database types including PostgreSQL, MongoDB, DynamoDB, Elasticsearch, and Redis.

## Features

- **Universal Query Language**: Write queries once, execute on multiple database types
- **Complete Database Support**: PostgreSQL, MongoDB, DynamoDB, Elasticsearch, Redis
- **TypeScript First**: Full type safety and IntelliSense support
- **Production Ready**: 100% test coverage across all database implementations
- **Connection Management**: Built-in connection pooling and health monitoring
- **Advanced Query Features**: JOINs, aggregations, filtering, sorting, and more

## Installation

```bash
npm install universal-query-translator
```

## Quick Start

```typescript
import { ConnectionManager, QueryParser, QueryTranslator } from 'universal-query-translator';

// Initialize connection manager
const connectionManager = new ConnectionManager();

// Register database connections
await connectionManager.registerConnection('my-postgres', {
  type: 'postgresql',
  config: { connectionString: 'postgresql://...' }
});

// Parse and execute universal queries
const query = QueryParser.parse(`
FIND users 
WHERE age > 25 
ORDER BY created_at DESC 
LIMIT 10
`);

const results = await connectionManager.executeQuery('my-postgres', query);
console.log(results);
```

## Universal Query Language

The library uses a SQL-like syntax that translates to database-specific queries:

```sql
-- Basic query
FIND users WHERE status = 'active'

-- With JOINs
FIND users 
LEFT JOIN orders ON users.id = orders.user_id
WHERE users.created_at > '2024-01-01'

-- With aggregation
FIND orders
AGGREGATE SUM(amount) as total_revenue
GROUP BY user_id
HAVING total_revenue > 1000

-- Database-specific features
FIND products
WHERE category = 'electronics'
DB_SPECIFIC: {
  "mongodb": {"collection": "products_v2"},
  "elasticsearch": {"index": "products_2024"}
}
```

## Database Support

### PostgreSQL
- Full SQL compatibility
- Complex JOINs and subqueries
- Advanced aggregations

### MongoDB
- Document queries with aggregation pipeline
- Complex lookups and joins
- Full operator support (IN, NOT IN, LIKE)

### DynamoDB
- Single-table design patterns
- Query and Scan optimization
- Comprehensive operator support

### Elasticsearch
- Full-text search capabilities
- Nested queries and aggregations
- Range and term queries

### Redis
- Key-value operations
- RediSearch integration
- RedisGraph support
- Pub/Sub and Streams

## API Reference

### ConnectionManager

```typescript
// Register a connection
await connectionManager.registerConnection(name: string, config: DatabaseConfig);

// Execute query
const results = await connectionManager.executeQuery(connectionName: string, query: QueryLanguage);

// List connections
const connections = connectionManager.listConnections();
```

### QueryParser

```typescript
// Parse universal query string
const query = QueryParser.parse(queryString: string);
```

### QueryTranslator

```typescript
// Translate to specific database format
const sqlQuery = QueryTranslator.toSQL(query);
const mongoQuery = QueryTranslator.toMongoDB(query);
const dynamoQuery = QueryTranslator.toDynamoDB(query);
const elasticQuery = QueryTranslator.toElasticsearch(query);
const redisQuery = QueryTranslator.toRedis(query);
```

## License

MIT

## Contributing

Issues and pull requests are welcome!