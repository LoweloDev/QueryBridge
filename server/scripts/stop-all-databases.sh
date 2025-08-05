#!/bin/bash
# Stop all database services

echo "🛑 Stopping all database services..."
echo "====================================="

# Stop application server first
echo "Stopping application server..."
pkill -f "node.*server/index.ts" 2>/dev/null && echo "✅ Application server stopped" || echo "ℹ️  No application server running"

# Stop PostgreSQL
echo "Stopping PostgreSQL..."
PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
PG_DATA_DIR="$PROJECT_ROOT/server/data/postgresql"

# Try graceful shutdown first
if [ -f "$PG_DATA_DIR/postgresql.conf" ]; then
    pg_ctl stop -D "$PG_DATA_DIR" -m fast >/dev/null 2>&1 && echo "✅ PostgreSQL stopped gracefully" || {
        # Force stop postgres processes
        pkill -f postgres >/dev/null 2>&1 && echo "✅ PostgreSQL stopped (forced)" || echo "ℹ️  No PostgreSQL running"
    }
else
    pkill -f postgres >/dev/null 2>&1 && echo "✅ PostgreSQL stopped" || echo "ℹ️  No PostgreSQL running"
fi

# Stop Homebrew PostgreSQL service if running
if command -v brew >/dev/null 2>&1; then
    brew services stop postgresql@15 >/dev/null 2>&1 || brew services stop postgresql >/dev/null 2>&1 || true
fi

# Stop MongoDB
echo "Stopping MongoDB..."
pkill mongod 2>/dev/null && echo "✅ MongoDB stopped" || echo "ℹ️  No MongoDB running"

# Stop Redis
echo "Stopping Redis..."
pkill redis-server 2>/dev/null && echo "✅ Redis stopped" || echo "ℹ️  No Redis running"

# Stop DynamoDB Local
echo "Stopping DynamoDB Local..."
pkill -f DynamoDBLocal 2>/dev/null && echo "✅ DynamoDB Local stopped" || echo "ℹ️  No DynamoDB Local running"

# Stop Elasticsearch
echo "Stopping Elasticsearch..."
pkill -f elasticsearch 2>/dev/null && echo "✅ Elasticsearch stopped" || echo "ℹ️  No Elasticsearch running"

# Clean up ports
./server/scripts/cleanup-ports.sh

echo ""
echo "✅ All database services stopped!"