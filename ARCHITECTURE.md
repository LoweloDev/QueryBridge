# QueryFlow Architecture

## Core Design Principle

QueryFlow is designed as a **library that accepts database connections by reference**. It does NOT create or manage database connections itself - instead, it receives pre-configured database clients from the host application.

## Connection Manager Architecture

### For Library Deployment (NPM Package)

```typescript
import { ConnectionManager } from 'queryflow';
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';

// Host application creates their own database connections
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
const mongoClient = new MongoClient(process.env.MONGO_URL);

// Pass connections by reference to QueryFlow
const connectionManager = new ConnectionManager();

// Register actual database clients
connectionManager.registerConnection('pg-main', pgPool, {
  id: 'pg-main',
  type: 'postgresql',
  name: 'Main Database'
});

connectionManager.registerConnection('mongo-users', mongoClient.db('users'), {
  id: 'mongo-users', 
  type: 'mongodb',
  name: 'User Database'
});

// Execute queries using common syntax
const results = await connectionManager.execute('pg-main', 'FIND users WHERE status = "active"');
```

### For Development/Demo (This Replit)

For demonstration purposes only, we:

1. **Use demonstration data** when no real database clients are provided
2. **Register PostgreSQL with our Neon database** to show real connection capability
3. **Clearly label demonstration vs real data** in console logs

## File Structure

```
server/services/
├── connection-manager.ts     # Core library - accepts external connections
├── queryParser.ts           # Common query language parser
└── queryTranslator.ts       # Multi-database query translator

server/                      # Demo infrastructure (not part of library)
├── storage.ts              # Connection metadata storage
├── db.ts                   # Our demo PostgreSQL connection
└── routes.ts              # API endpoints for testing
```

## Removed Files (Cleanup Completed)

- ❌ `server/services/real-connection-manager.ts` - Replaced with clean ConnectionManager
- ❌ `server/database-manager.ts` - Removed complex database manager
- ❌ `server/config/database-config.ts` - Removed configuration complexity
- ❌ `server/scripts/setup-databases.ts` - Unused setup script

## Key Benefits

1. **Clean Separation**: Library code is separate from demo infrastructure
2. **No Connection Management**: Library doesn't create connections, accepts them by reference
3. **NPM Ready**: Core library can be packaged without database dependencies
4. **Flexible**: Works with any database client the host application provides
5. **Demonstration Fallback**: Shows capability when real connections aren't available

## Console Output

```
Successfully connected to PostgreSQL: PostgreSQL - Production
Failed to setup real database for MongoDB - Analytics: Error: MongoDB connection failed: ECONNREFUSED 127.0.0.1:27017
Connection failed for MongoDB - Analytics, using mock database
```

This clearly shows:
1. Real database connection attempts and their success/failure
2. Mock database fallback with actual query processing (not static data)
3. Proper error handling for real databases

## Production Usage

When deploying as npm package:
1. Host application creates and manages database connections
2. QueryFlow library receives connections by reference
3. No fallback to demonstration data - all queries use actual database clients
4. Host application controls connection lifecycle, pooling, authentication

## Development Usage  

In this Replit environment:
1. PostgreSQL queries use our actual Neon database
2. Other database types show demonstration data
3. System demonstrates real query translation and execution
4. Clear logging shows connection status