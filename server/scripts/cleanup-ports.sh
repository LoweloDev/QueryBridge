#!/bin/bash
# Clean up database processes and ports

echo "🧹 Cleaning up database processes and ports..."

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    
    echo "Checking port $port for $service_name..."
    
    # Find process using the port
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pid" ]; then
        echo "  ⚠️  Found process $pid using port $port, terminating..."
        kill -TERM $pid 2>/dev/null
        sleep 2
        
        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            echo "  🔨 Force killing process $pid..."
            kill -KILL $pid 2>/dev/null
        fi
        
        echo "  ✅ Port $port cleared"
    else
        echo "  ✅ Port $port is free"
    fi
}

# Function to kill process by name pattern
kill_process() {
    local pattern=$1
    local service_name=$2
    
    echo "Checking for $service_name processes..."
    
    local pids=$(pgrep -f "$pattern" 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "  ⚠️  Found $service_name processes: $pids"
        echo "  🔨 Terminating $service_name processes..."
        pkill -TERM -f "$pattern" 2>/dev/null
        sleep 2
        
        # Force kill if still running
        local remaining=$(pgrep -f "$pattern" 2>/dev/null)
        if [ -n "$remaining" ]; then
            echo "  🔨 Force killing remaining $service_name processes..."
            pkill -KILL -f "$pattern" 2>/dev/null
        fi
        
        echo "  ✅ $service_name processes cleaned up"
    else
        echo "  ✅ No $service_name processes found"
    fi
}

# Clean up specific ports
kill_port 5000 "Application Server"
kill_port 27017 "MongoDB"
kill_port 6379 "Redis"
kill_port 8000 "DynamoDB Local"
kill_port 9200 "Elasticsearch (PostgreSQL)"
kill_port 9201 "Elasticsearch (DynamoDB)"

# Clean up specific processes
kill_process "mongod" "MongoDB"
kill_process "redis-server" "Redis"
kill_process "DynamoDBLocal" "DynamoDB Local"
kill_process "elasticsearch" "Elasticsearch"

# Clean up data directories that might cause port conflicts
echo ""
echo "🗂️  Cleaning up database data directories..."

# Clean DynamoDB Local data
if [ -d "server/data/dynamodb" ]; then
    rm -rf server/data/dynamodb/*
    echo "  ✅ DynamoDB data directory cleaned"
fi

# Clean Elasticsearch data
if [ -d "server/data/elasticsearch" ]; then
    rm -rf server/data/elasticsearch/data/*
    echo "  ✅ Elasticsearch data directory cleaned"
fi

echo ""
echo "✅ Port cleanup completed!"
echo ""