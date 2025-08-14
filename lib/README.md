# Universal Query Translator

A powerful TypeScript library that enables you to write database queries once and execute them across multiple database technologies. Translate universal SQL-like syntax to PostgreSQL, MongoDB, Elasticsearch, DynamoDB, and Redis.

[![npm version](https://badge.fury.io/js/universal-query-translator.svg)](https://www.npmjs.com/package/universal-query-translator)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

## 🚀 Quick Start

### Installation

```bash
npm install universal-query-translator
```

### Basic Usage

```typescript
import { ConnectionManager } from 'universal-query-translator'

// Create connection manager
const cm = new ConnectionManager()

// Register your database connections
cm.registerConnection('postgres', pgClient, {
  id: 'postgres',
  name: 'Main PostgreSQL',
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'myapp'
})

// Execute universal queries
const result = await cm.executeQuery('postgres', `
  FIND users 
  WHERE status = "active" AND age > 18
  ORDER BY created_at DESC 
  LIMIT 10
`)

console.log(result.rows) // Your query results
```

## 📖 Universal Query Language (UQL)

### Basic Syntax

UQL uses a SQL-like syntax that works across all supported databases:

```sql
FIND table_name
FIELDS column1, column2, column3
WHERE condition1 AND condition2
ORDER BY column1 DESC
LIMIT 100
```

### Supported Operations

| Operation | Syntax | Example |
|-----------|--------|---------|
| **Table Selection** | `FIND table` | `FIND users` |
| **Schema/Database** | `FIND schema.table` | `FIND public.users` |
| **Field Selection** | `FIELDS a, b, c` | `FIELDS id, name, email` |
| **Filtering** | `WHERE conditions` | `WHERE age > 18 AND status = "active"` |
| **Joins** | `JOIN table ON condition` | `LEFT JOIN orders ON users.id = orders.user_id` |
| **Sorting** | `ORDER BY field ASC/DESC` | `ORDER BY created_at DESC, name ASC` |
| **Limiting** | `LIMIT count` | `LIMIT 50` |
| **Pagination** | `OFFSET count` | `OFFSET 100` |
| **Grouping** | `GROUP BY fields` | `GROUP BY department, role` |
| **Aggregation** | `AGGREGATE functions` | `AGGREGATE total: SUM(amount)` |

### Advanced Examples

#### Field Selection
```sql
-- Select specific fields
FIND users (id, name, email)
WHERE status = "active"

-- Or use FIELDS clause
FIND users
FIELDS id, name, email, created_at
WHERE last_login > "2024-01-01"
```

#### Complex Conditions
```sql
FIND products
WHERE 
  (category = "electronics" OR category = "computers") AND
  price BETWEEN 100 AND 1000 AND
  (rating >= 4.0 OR review_count > 50)
ORDER BY popularity DESC
```

#### Joins
```sql
FIND users
LEFT JOIN orders ON users.id = orders.user_id
LEFT JOIN products ON orders.product_id = products.id
WHERE orders.created_at > "2024-01-01"
GROUP BY users.id, users.name
```

#### Aggregations
```sql
FIND sales
GROUP BY region, product_category
AGGREGATE 
  total_revenue: SUM(amount),
  avg_order: AVG(order_value),
  customer_count: COUNT(DISTINCT customer_id),
  max_sale: MAX(amount)
ORDER BY total_revenue DESC
```

## 🗃️ Database Support

### Translation Targets

| Database | Translation Method | Query Format | Status |
|----------|-------------------|--------------|---------|
| **PostgreSQL** | Direct SQL | Native SQL | ✅ Full Support |
| **MongoDB** | SQL → NoQL | MongoDB Query Object | ✅ Via SQL Translation |
| **Elasticsearch** | SQL Endpoint | SQL String | ✅ SQL API |
| **DynamoDB** | PartiQL | SQL Subset | ✅ PartiQL Compatible |
| **Redis** | Command Planning | Redis Commands | ✅ Structured Plans |

### Database-Specific Behavior

#### PostgreSQL (Primary Target)
```typescript
// Full SQL support with all UQL features
const result = await cm.executeQuery('postgres', `
  FIND users u
  LEFT JOIN orders o ON u.id = o.user_id
  WHERE u.status = "active"
  GROUP BY u.id, u.name
  AGGREGATE order_count: COUNT(o.id)
  ORDER BY order_count DESC
`)
```

#### MongoDB
```typescript
// Translated via SQL → MongoDB query object
const result = await cm.executeQuery('mongodb', `
  FIND users
  WHERE status = "active" AND age > 18
  ORDER BY created_at DESC
  LIMIT 20
`)
// Internally converts to MongoDB aggregation pipeline
```

#### Redis
```typescript
// Returns structured command plan
const result = await cm.executeQuery('redis', `
  FIND users
  WHERE status = "active"
`)
// Executes appropriate SCAN/GET/HGET commands
```

## 🔧 API Reference

### ConnectionManager

The main interface for managing database connections and executing queries.

```typescript
class ConnectionManager {
  // Connection Management
  registerConnection(id: string, client: any, config: DatabaseConnection): void
  unregisterConnection(id: string): void
  listConnections(): DatabaseConnection[]
  getActiveConnections(): ActiveConnection[]
  
  // Query Execution
  executeQuery(connectionId: string, queryString: string): Promise<QueryResult>
  executeQuery(queryString: string): Promise<QueryResult> // Uses first connection
  
  // Translation Only
  translateQuery(queryString: string, targetType: DatabaseType): TranslationResult
}
```

#### Connection Registration

```typescript
// PostgreSQL with pg
import { Pool } from 'pg'
const pgPool = new Pool({ /* config */ })
cm.registerConnection('pg', pgPool, {
  id: 'pg',
  name: 'PostgreSQL',
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'myapp'
})

// MongoDB
import { MongoClient } from 'mongodb'
const mongoClient = new MongoClient('mongodb://localhost:27017')
cm.registerConnection('mongo', mongoClient.db('myapp'), {
  id: 'mongo',
  name: 'MongoDB',
  type: 'mongodb',
  host: 'localhost',
  port: 27017,
  database: 'myapp'
})

// Redis
import Redis from 'ioredis'
const redis = new Redis()
cm.registerConnection('redis', redis, {
  id: 'redis',
  name: 'Redis',
  type: 'redis',
  host: 'localhost',
  port: 6379
})
```

### QueryParser

Parse UQL strings into structured AST objects.

```typescript
import { QueryParser } from 'universal-query-translator'

// Parse query into AST
const ast = QueryParser.parse('FIND users WHERE status = "active"')

// Validate query syntax
const isValid = QueryParser.validate('FIND users WHERE invalid syntax')
```

### QueryTranslator

Translate AST objects to database-specific queries.

```typescript
import { QueryTranslator } from 'universal-query-translator'

const ast = QueryParser.parse('FIND users WHERE status = "active"')

// Generate SQL
const sql = QueryTranslator.toSQL(ast)
// Result: "SELECT * FROM users WHERE status = 'active'"

// Generate Redis commands
const redisCommands = QueryTranslator.toRedis(ast)
// Result: [{ command: 'SCAN', args: ['0', 'MATCH', 'users:*'] }]
```

## 📊 Response Format

### QueryResult

```typescript
interface QueryResult {
  success: boolean
  rows?: any[]           // Query results
  error?: string         // Error message if failed
  metadata?: {
    executionTime: number     // Query execution time (ms)
    rowCount: number         // Number of rows returned
    translatedQuery: string  // Database-specific query used
    database: string         // Database type
    connectionId: string     // Connection used
  }
}
```

### Example Response

```typescript
const result = await cm.executeQuery('postgres', 'FIND users LIMIT 5')

console.log(result)
// {
//   success: true,
//   rows: [
//     { id: 1, name: 'John', email: 'john@example.com' },
//     { id: 2, name: 'Jane', email: 'jane@example.com' }
//   ],
//   metadata: {
//     executionTime: 23,
//     rowCount: 2,
//     translatedQuery: "SELECT * FROM users LIMIT 5",
//     database: "postgresql",
//     connectionId: "postgres"
//   }
// }
```

## 🛠️ Advanced Usage

### Translation Without Execution

```typescript
// Get translated query without executing
const translation = cm.translateQuery(
  'FIND users WHERE status = "active"',
  'postgresql'
)

console.log(translation.query) // "SELECT * FROM users WHERE status = 'active'"
console.log(translation.targetDatabase) // "postgresql"
```

### Multi-Database Applications

```typescript
// Register multiple databases
cm.registerConnection('postgres', pgClient, { /* config */ })
cm.registerConnection('mongodb', mongoDb, { /* config */ })
cm.registerConnection('redis', redisClient, { /* config */ })

// Execute same query across different databases
const postgresResult = await cm.executeQuery('postgres', query)
const mongoResult = await cm.executeQuery('mongodb', query)
const redisResult = await cm.executeQuery('redis', query)
```

### Connection Management

```typescript
// List all registered connections
const connections = cm.listConnections()

// Get active connections with client info
const activeConnections = cm.getActiveConnections()

// Remove connection
cm.unregisterConnection('postgres')
```

### Error Handling

```typescript
try {
  const result = await cm.executeQuery('postgres', 'INVALID QUERY')
} catch (error) {
  if (error.message.includes('parse')) {
    console.log('Query syntax error')
  } else if (error.message.includes('connection')) {
    console.log('Database connection error')
  }
}
```

## 🏗️ Framework Integration

### Express.js

```typescript
import express from 'express'
import { ConnectionManager } from 'universal-query-translator'

const app = express()
const cm = new ConnectionManager()

app.post('/api/query', async (req, res) => {
  try {
    const { query, database = 'postgres' } = req.body
    const result = await cm.executeQuery(database, query)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})
```

### Next.js API Route

```typescript
// pages/api/query.ts
import { ConnectionManager } from 'universal-query-translator'

const cm = new ConnectionManager()
// Initialize connections...

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const result = await cm.executeQuery(req.body.database, req.body.query)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
```

### GraphQL Resolver

```typescript
const resolvers = {
  Query: {
    executeQuery: async (_, { query, database }) => {
      return await cm.executeQuery(database, query)
    }
  }
}
```

## 🔒 Security Considerations

### Input Validation

```typescript
// Always validate input queries
try {
  const isValid = QueryParser.validate(userQuery)
  if (!isValid) {
    throw new Error('Invalid query syntax')
  }
  
  const result = await cm.executeQuery(database, userQuery)
} catch (error) {
  // Handle validation errors
}
```

### Connection Security

- **Never expose database credentials** in client-side code
- **Use connection pooling** for better performance and security
- **Implement query timeouts** to prevent long-running queries
- **Validate database connection configs** before registration

### Query Limits

```typescript
// Implement query limits in your application layer
const MAX_LIMIT = 1000

const query = `FIND users LIMIT ${Math.min(userLimit, MAX_LIMIT)}`
```

## 🐛 Troubleshooting

### Common Issues

#### Query Parsing Errors
```typescript
// Issue: Query syntax not recognized
// Solution: Check UQL syntax documentation
const query = 'FIND users WHERE status = "active"' // Correct
// Not: 'SELECT * FROM users WHERE status = "active"' // SQL syntax
```

#### Connection Errors
```typescript
// Issue: Connection not found
// Solution: Ensure connection is registered
const connections = cm.listConnections()
console.log('Available connections:', connections.map(c => c.id))
```

#### Translation Errors
```typescript
// Issue: Feature not supported in target database
// Solution: Check database compatibility table
try {
  const result = await cm.executeQuery('redis', complexJoinQuery)
} catch (error) {
  // Redis doesn't support complex joins
  // Use simpler query or different database
}
```

### Debugging

```typescript
// Enable debug mode to see translated queries
const result = await cm.executeQuery('postgres', query)
console.log('Translated query:', result.metadata.translatedQuery)

// Test translation without execution
const translation = cm.translateQuery(query, 'postgresql')
console.log('Would execute:', translation.query)
```

## 📚 Examples

### E-commerce Application

```typescript
// Product search with filters
const productQuery = `
  FIND products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE 
    p.price BETWEEN 50 AND 500 AND
    p.in_stock = true AND
    c.name IN ["electronics", "books"]
  ORDER BY p.popularity DESC, p.price ASC
  LIMIT 20
`

// Sales analytics
const salesQuery = `
  FIND orders o
  LEFT JOIN products p ON o.product_id = p.id
  WHERE o.created_at >= "2024-01-01"
  GROUP BY p.category, DATE(o.created_at)
  AGGREGATE 
    daily_revenue: SUM(o.total),
    order_count: COUNT(o.id),
    avg_order: AVG(o.total)
  ORDER BY daily_revenue DESC
`
```

### User Analytics

```typescript
// Active users with engagement metrics
const userMetrics = `
  FIND users u
  LEFT JOIN sessions s ON u.id = s.user_id
  WHERE s.created_at >= "2024-01-01"
  GROUP BY u.id, u.name, u.email
  AGGREGATE 
    session_count: COUNT(s.id),
    total_time: SUM(s.duration),
    last_login: MAX(s.created_at)
  ORDER BY session_count DESC
  LIMIT 100
`
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Developer Guide](./DEVELOPER_GUIDE.md) for detailed information about:

- Setting up the development environment
- Code architecture and standards
- Adding new database support
- Writing tests
- Submitting pull requests

## 🔗 Links

- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Comprehensive development documentation
- **[GitHub Repository](https://github.com/your-org/QueryBridge)** - Source code and issues
- **[npm Package](https://www.npmjs.com/package/universal-query-translator)** - Package page
- **[Playground Demo](https://your-demo-url.com)** - Interactive testing environment

---

**Ready to simplify your multi-database architecture?** Install the library and start writing universal queries today!