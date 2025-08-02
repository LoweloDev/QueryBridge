# Database Setup Guide

QueryFlow supports real database connections with intelligent fallback to demonstration data when databases aren't available.

## Real Database Support

### 1. MongoDB
```bash
# Install MongoDB (if not available)
# Start MongoDB locally
mongod --dbpath ./data/mongodb --port 27017 --bind_ip 127.0.0.1
```

### 2. Redis
```bash
# Install Redis (if not available)  
# Start Redis locally
redis-server --port 6379
```

### 3. DynamoDB Local
```bash
# Start DynamoDB Local (already installed via npm)
npx dynamodb-local --port 8000 --inMemory --sharedDb
```

### 4. PostgreSQL
✅ **Already configured** - Using Neon serverless PostgreSQL for application data storage.

### 5. Elasticsearch
⚠️ **Not available in this environment** - Falls back to demonstration data.

## Automated Setup Script

Use the provided setup script to start all local databases:

```bash
# Run the database setup script
npx tsx server/scripts/setup-databases.ts
```

This will attempt to start:
- MongoDB on port 27017
- Redis on port 6379  
- DynamoDB Local on port 8000

## Connection Strategy

The system uses a **smart fallback approach**:

1. **Attempt Real Connection**: First tries to connect to actual database instances
2. **Log Connection Status**: Shows success/failure in console logs
3. **Graceful Fallback**: Uses demonstration data if real databases aren't available
4. **Production Ready**: In your local environment with real databases, queries execute against actual data

## Example Console Output

```
Real database connection failed for mongodb, using demonstration data: ECONNREFUSED 127.0.0.1:27017
Connected to postgresql: PostgreSQL - Production  
Real database connection failed for dynamodb, using demonstration data: ECONNREFUSED 127.0.0.1:8000
```

## Testing Connections

Use the Database Setup UI at `/database-setup` to:
- Test individual database connections
- Monitor connection status
- Add new database configurations

## For Local Development

When you run this locally with real databases:

1. Start your databases using the commands above
2. The system will automatically connect to real instances
3. Queries will execute against your actual data
4. No configuration changes needed - the system detects available databases

The current implementation in Replit demonstrates the working system with intelligent fallbacks.