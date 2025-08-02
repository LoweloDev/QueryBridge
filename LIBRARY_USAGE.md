# Universal Query Translator - Library Usage Example

This demonstrates how the library is properly separated and used by external applications.

## Library Structure (`/lib`)

The standalone library contains:
- `ConnectionManager` - Manages database connections and executes queries
- `QueryParser` - Parses universal query language 
- `QueryTranslator` - Translates to database-specific formats
- `types.ts` - TypeScript definitions

## Test Backend Usage (`/server`)

The test backend demonstrates proper library usage:

```typescript
// 1. Import the library
import { ConnectionManager } from '../lib/src/index';

// 2. Initialize the library
const connectionManager = new ConnectionManager();

// 3. Setup database connections (backend responsibility)
const dbSetup = new DatabaseSetup();
await dbSetup.setupRealDatabases();

// 4. Register connections with the library
const connections = dbSetup.getConnections();
for (const [connectionId, connection] of connections) {
  if (connection.client) {
    connectionManager.registerConnection(connectionId, connection.client, connection.config);
  }
}

// 5. Use library methods
const results = await connectionManager.executeQuery(connectionId, query);
const translation = connectionManager.translateQuery(query, targetType);
```

## Key Separation Points

1. **Database Setup**: Handled by consuming backend, not library
2. **Connection Management**: Library manages connections passed by reference
3. **Query Processing**: Library handles parsing, translation, and execution
4. **REST API**: Exists only in test backend for demonstration
5. **Library Exports**: Clean interface with no REST dependencies

## Next Steps

- Build library as npm package
- Install library in test backend instead of relative imports
- Deploy library to npm registry for external use