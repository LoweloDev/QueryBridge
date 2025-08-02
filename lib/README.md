# Universal Query Translator

A universal database query abstraction library that translates common query language to multiple database formats (SQL, MongoDB, DynamoDB, Elasticsearch, Redis).

## Installation

```bash
npm install universal-query-translator
```

## Usage

```typescript
import { ConnectionManager, QueryParser, QueryTranslator } from 'universal-query-translator';

// Initialize the connection manager
const connectionManager = new ConnectionManager();

// Register your database connections
connectionManager.registerConnection('my-postgres', postgresClient, {
  id: 'my-postgres',
  name: 'My PostgreSQL DB',
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'mydb'
});

// Execute queries using universal syntax
const results = await connectionManager.executeQuery('my-postgres', `
  FIND users 
  WHERE age > 25 AND status = "active"
  ORDER BY created_at DESC
  LIMIT 10
`);

// Or translate queries without executing
const sqlQuery = connectionManager.translateQuery(query, 'postgresql');
```

## Query Language Features

- Universal syntax that works across database types
- Support for filtering, joins, aggregation, and sorting  
- Automatic translation to SQL, MongoDB, DynamoDB, Elasticsearch queries
- Type-safe query parsing and validation

## Supported Databases

- PostgreSQL
- MongoDB  
- DynamoDB
- Elasticsearch
- Redis