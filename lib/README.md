# Universal Query Translator (Library)

Simple, typed query abstraction that parses a universal SQL-like syntax and translates it to target backends. Today, SQL translation is primary; other targets leverage SQL or provide structured plans when applicable.

## Install

```bash
npm install universal-query-translator
```

## Quick start

```ts
import { ConnectionManager } from 'universal-query-translator';

// Register external DB clients created by your app
const cm = new ConnectionManager();
cm.registerConnection('pg', pgClient, {
  id: 'pg', name: 'Postgres', type: 'postgresql', host: 'localhost', port: 5432, database: 'app'
});

// Execute a universal query
const result = await cm.executeQuery('pg', `FIND users\nWHERE status = "active"\nORDER BY created_at DESC\nLIMIT 5`);

console.log(result.rows);
```

## Universal query syntax

- FIND <table | schema.table>
- FIELDS a, b
- WHERE a = 1 AND b > 2
- JOIN ... ON ...
- GROUP BY ... / AGGREGATE COUNT(*), SUM(x)
- ORDER BY ...
- LIMIT / OFFSET

Example:

```sql
FIND public.users
FIELDS id, name, created_at
WHERE status = "active"
ORDER BY created_at DESC
LIMIT 5
```

## Translation behavior

- postgresql: emits SQL string
- mongodb: converts via SQL and `@synatic/noql` to a Mongo-compatible structure
- elasticsearch: emits SQL string for SQL endpoint
- dynamodb: emits SQL (PartiQL-compatible subset)
- redis: returns a structured plan (SCAN/GET/etc.)

```ts
import { QueryParser, QueryTranslator } from 'universal-query-translator';

const parsed = QueryParser.parse('FIND users WHERE status = "active" LIMIT 5');
const sql = QueryTranslator.toSQL(parsed);
```

## API surface

- ConnectionManager
  - registerConnection(id, client, config)
  - executeQuery(connectionId, queryString)
  - translateQuery(queryString, targetType, connectionId?)
  - listConnections(), getActiveConnections(), getConnectionConfigs()
- QueryParser
  - parse(queryString), validate(queryString)
- QueryTranslator
  - toSQL(query), toRedis(query)

## Types

All input/output types are exported from `universal-query-translator/dist/types`.

## Notes

- JOINs/aggregations fully supported in SQL. For other targets, translation uses SQL where possible or returns a structured plan (e.g., Redis SCAN/GET).


