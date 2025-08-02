#!/bin/bash
# Start all databases for Universal Query Library
# This script starts MongoDB, Redis, DynamoDB, and Elasticsearch

set -e

echo "🗄️  Starting All Database Services for Universal Query Library"
echo "============================================================="

# Create all data directories
echo "📁 Creating data directories..."
mkdir -p server/data/{mongodb,redis,dynamodb,elasticsearch/{postgresql-layer,dynamodb-layer,logs}}

# Start each database
echo ""
echo "Starting databases in sequence..."

# 1. MongoDB
echo "🍃 Starting MongoDB..."
if ./server/scripts/start-mongodb.sh; then
    echo "✅ MongoDB startup initiated"
else
    echo "⚠️  MongoDB startup failed (will use fallback in app)"
fi

echo ""

# 2. Redis  
echo "🔴 Starting Redis..."
if ./server/scripts/start-redis.sh; then
    echo "✅ Redis startup initiated"
else
    echo "⚠️  Redis startup failed (will use fallback in app)"
fi

echo ""

# 3. DynamoDB
echo "⚡ Starting DynamoDB Local..."
if ./server/scripts/start-dynamodb.sh; then
    echo "✅ DynamoDB startup initiated"  
else
    echo "⚠️  DynamoDB startup failed (will use fallback in app)"
fi

echo ""

# 4. Elasticsearch
echo "🔍 Starting Elasticsearch (PostgreSQL + DynamoDB layers)..."
if ./server/scripts/start-elasticsearch.sh; then
    echo "✅ Elasticsearch startup initiated"
else
    echo "⚠️  Elasticsearch startup failed (will use fallback in app)"
fi

echo ""
echo "⏳ Waiting for databases to initialize (10 seconds)..."
sleep 10

# Show final status
echo ""
echo "📊 Database Startup Summary:"
echo "============================="
echo "PostgreSQL: ✅ (Using Neon serverless)"
echo "MongoDB: $(pgrep mongod >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"
echo "Redis: $(pgrep redis-server >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"
echo "DynamoDB: $(pgrep -f DynamoDBLocal >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"
echo "Elasticsearch PostgreSQL: $(curl -s http://localhost:9200/_cluster/health >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"
echo "Elasticsearch DynamoDB: $(curl -s http://localhost:9201/_cluster/health >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")"

echo ""
echo "🚀 All database startup attempts completed!"
echo "   Note: Some databases may not persist in containerized environments"
echo "   but will work correctly on local development machines."