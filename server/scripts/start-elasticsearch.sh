#!/bin/bash
# Start Elasticsearch with two instances for PostgreSQL and DynamoDB integration

# Create data directories
mkdir -p server/data/elasticsearch/postgresql-layer
mkdir -p server/data/elasticsearch/dynamodb-layer
mkdir -p server/data/elasticsearch/logs

echo "Starting Elasticsearch instances..."

# Check for Elasticsearch installation
ELASTICSEARCH_BIN=""

# Check for Homebrew installation (macOS)
if [ -f "/opt/homebrew/bin/elasticsearch" ]; then
    ELASTICSEARCH_BIN="/opt/homebrew/bin/elasticsearch"
elif [ -f "/usr/local/bin/elasticsearch" ]; then
    ELASTICSEARCH_BIN="/usr/local/bin/elasticsearch"
elif command -v elasticsearch >/dev/null 2>&1; then
    ELASTICSEARCH_BIN="elasticsearch"
elif [ -f "server/elasticsearch/bin/elasticsearch" ]; then
    ELASTICSEARCH_BIN="server/elasticsearch/bin/elasticsearch"
else
    echo "❌ Elasticsearch not found. Setting up local installation..."
    
    # Detect OS and download appropriate version
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ELASTICSEARCH_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.15.0-darwin-x86_64.tar.gz"
        if [[ $(uname -m) == "arm64" ]]; then
            ELASTICSEARCH_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.15.0-darwin-aarch64.tar.gz"
        fi
    else
        # Linux
        ELASTICSEARCH_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.15.0-linux-x86_64.tar.gz"
    fi
    
    curl -s -L "$ELASTICSEARCH_URL" -o /tmp/elasticsearch.tar.gz
    
    if [ $? -eq 0 ]; then
        echo "✅ Downloaded Elasticsearch"
        mkdir -p server/elasticsearch
        tar -xzf /tmp/elasticsearch.tar.gz -C server/elasticsearch --strip-components=1
        rm /tmp/elasticsearch.tar.gz
        ELASTICSEARCH_BIN="server/elasticsearch/bin/elasticsearch"
    else
        echo "❌ Failed to download Elasticsearch"
        exit 1
    fi
fi

echo "✅ Using Elasticsearch: $ELASTICSEARCH_BIN"
if [ -x "$ELASTICSEARCH_BIN" ]; then
    echo "Elasticsearch version: $($ELASTICSEARCH_BIN --version 2>/dev/null | head -1 || echo 'Version check failed')"
fi

# Configure Java heap size for containerized environment
export ES_JAVA_OPTS="-Xms512m -Xmx512m"

# Start Elasticsearch instance 1: PostgreSQL Layer (port 9200)
echo "Starting Elasticsearch PostgreSQL Layer on port 9200..."
"$ELASTICSEARCH_BIN" \
    -d \
    -E cluster.name=universal-query-postgresql \
    -E node.name=postgresql-layer \
    -E network.host=127.0.0.1 \
    -E http.port=9200 \
    -E discovery.type=single-node \
    -E path.data=./server/data/elasticsearch/postgresql-layer \
    -E path.logs=./server/data/elasticsearch/logs \
    -E xpack.security.enabled=false \
    -E xpack.security.enrollment.enabled=false \
    -E xpack.security.http.ssl.enabled=false \
    -E xpack.security.transport.ssl.enabled=false \
    -E action.auto_create_index=true \
    -E cluster.routing.allocation.disk.threshold_enabled=false

# Start Elasticsearch instance 2: DynamoDB Layer (port 9201)
echo "Starting Elasticsearch DynamoDB Layer on port 9201..."
"$ELASTICSEARCH_BIN" \
    -d \
    -E cluster.name=universal-query-dynamodb \
    -E node.name=dynamodb-layer \
    -E network.host=127.0.0.1 \
    -E http.port=9201 \
    -E discovery.type=single-node \
    -E path.data=./server/data/elasticsearch/dynamodb-layer \
    -E path.logs=./server/data/elasticsearch/logs \
    -E xpack.security.enabled=false \
    -E xpack.security.enrollment.enabled=false \
    -E xpack.security.http.ssl.enabled=false \
    -E xpack.security.transport.ssl.enabled=false \
    -E action.auto_create_index=true \
    -E cluster.routing.allocation.disk.threshold_enabled=false

echo "Elasticsearch instances startup initiated:"
echo "  - PostgreSQL Layer: http://127.0.0.1:9200"
echo "  - DynamoDB Layer: http://127.0.0.1:9201"
echo "Data directories:"
echo "  - PostgreSQL: ./server/data/elasticsearch/postgresql-layer"
echo "  - DynamoDB: ./server/data/elasticsearch/dynamodb-layer"
echo "Logs: ./server/data/elasticsearch/logs"

# Wait for startup
sleep 10

# Test connections
echo "Testing Elasticsearch connections..."

# Test PostgreSQL Layer (port 9200)
echo "Testing PostgreSQL Layer..."
if curl -s http://127.0.0.1:9200/_cluster/health > /dev/null 2>&1; then
    echo "✅ Elasticsearch PostgreSQL Layer is running and accessible"
    CLUSTER_INFO=$(curl -s http://127.0.0.1:9200/ | grep -o '"cluster_name"[^,]*' | cut -d'"' -f4)
    echo "  Cluster: $CLUSTER_INFO"
else
    echo "❌ Elasticsearch PostgreSQL Layer may not be fully started yet"
fi

# Test DynamoDB Layer (port 9201)
echo "Testing DynamoDB Layer..."
if curl -s http://127.0.0.1:9201/_cluster/health > /dev/null 2>&1; then
    echo "✅ Elasticsearch DynamoDB Layer is running and accessible"
    CLUSTER_INFO=$(curl -s http://127.0.0.1:9201/ | grep -o '"cluster_name"[^,]*' | cut -d'"' -f4)
    echo "  Cluster: $CLUSTER_INFO"
else
    echo "❌ Elasticsearch DynamoDB Layer may not be fully started yet"
fi

echo ""
echo "Note: In containerized environments like Replit, the processes may not persist"
echo "but will work correctly when running locally on your machine."
echo ""
echo "Elasticsearch Features Available:"
echo "  - Full-text search and analytics"
echo "  - RESTful API for indexing and querying"
echo "  - JSON-based query DSL"
echo "  - Aggregations and analytics"
echo "  - Real-time search capabilities"
echo "  - Scalable search infrastructure"