#!/bin/bash
# Test OpenSearch SQL endpoint functionality

echo "🔍 Testing OpenSearch SQL endpoint functionality..."

# Check if OpenSearch is running
if curl -s "http://localhost:9200" >/dev/null 2>&1; then
    echo "✅ OpenSearch is running on port 9200"
    
    # Test SQL endpoint
    echo "📡 Testing SQL endpoint: POST /_plugins/_sql"
    
    # Simple SQL query to test the endpoint
    RESPONSE=$(curl -s -X POST "http://localhost:9200/_plugins/_sql" \
        -H "Content-Type: application/json" \
        -d '{"query": "SHOW TABLES"}' 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
        echo "✅ SQL endpoint is responding"
        echo "Response preview: $(echo "$RESPONSE" | head -c 200)..."
        
        # Test with a simple SELECT query
        echo "📡 Testing SELECT query..."
        SELECT_RESPONSE=$(curl -s -X POST "http://localhost:9200/_plugins/_sql" \
            -H "Content-Type: application/json" \
            -d '{"query": "SELECT 1 as test_column"}' 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$SELECT_RESPONSE" ]; then
            echo "✅ SQL SELECT queries are working"
            echo "Response: $(echo "$SELECT_RESPONSE" | head -c 200)..."
        else
            echo "⚠️  SQL SELECT queries might have issues"
        fi
    else
        echo "❌ SQL endpoint is not responding"
        echo "This could mean:"
        echo "   1. SQL plugin is not installed/enabled"
        echo "   2. OpenSearch needs to be restarted"
        echo "   3. Plugin configuration issue"
    fi
    
    # List available plugins/endpoints
    echo "📋 Testing plugin discovery..."
    PLUGINS_RESPONSE=$(curl -s "http://localhost:9200/_cat/plugins?v" 2>/dev/null)
    if [ -n "$PLUGINS_RESPONSE" ]; then
        echo "Installed plugins:"
        echo "$PLUGINS_RESPONSE"
    else
        echo "Could not retrieve plugin list"
    fi
    
else
    echo "❌ OpenSearch is not running on port 9200"
    echo "Please start OpenSearch first:"
    echo "   ./server/scripts/start-elasticsearch.sh"
fi

echo ""
echo "🎯 Next steps if SQL endpoint is working:"
echo "1. SQL queries can be sent to: http://localhost:9200/_plugins/_sql"
echo "2. Use POST method with JSON body: {\"query\": \"SELECT * FROM your_index\"}"
echo "3. Consider integrating this directly in your query translator"