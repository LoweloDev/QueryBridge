#!/bin/bash
# Stop all database services

echo "🛑 Stopping all database services..."
echo "====================================="

# Stop application server first
echo "Stopping application server..."
pkill -f "node.*server/index.ts" 2>/dev/null && echo "✅ Application server stopped" || echo "ℹ️  No application server running"

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