#!/bin/bash
# Start Elasticsearch with two instances for PostgreSQL and DynamoDB integration

# Create data directories
mkdir -p server/data/elasticsearch/postgresql-layer
mkdir -p server/data/elasticsearch/dynamodb-layer
mkdir -p server/data/elasticsearch/logs

echo "Starting Elasticsearch instances..."

# Check for Elasticsearch installation
ELASTICSEARCH_BIN=""

# Check for Elasticsearch installation in multiple locations
if [ -f "/opt/homebrew/bin/elasticsearch" ]; then
    ELASTICSEARCH_BIN="/opt/homebrew/bin/elasticsearch"
elif [ -f "/usr/local/bin/elasticsearch" ]; then
    ELASTICSEARCH_BIN="/usr/local/bin/elasticsearch"
elif [ -f "/opt/homebrew/bin/opensearch" ]; then
    ELASTICSEARCH_BIN="/opt/homebrew/bin/opensearch"
    USING_OPENSEARCH=1
    echo "ℹ️  Using OpenSearch as Elasticsearch alternative"
elif [ -f "/usr/local/bin/opensearch" ]; then
    ELASTICSEARCH_BIN="/usr/local/bin/opensearch"
    USING_OPENSEARCH=1
    echo "ℹ️  Using OpenSearch as Elasticsearch alternative"
elif command -v elasticsearch >/dev/null 2>&1; then
    ELASTICSEARCH_BIN="elasticsearch"
elif command -v opensearch >/dev/null 2>&1; then
    ELASTICSEARCH_BIN="opensearch"
    USING_OPENSEARCH=1
    echo "ℹ️  Using OpenSearch as Elasticsearch alternative"
elif [ -f "server/elasticsearch/bin/elasticsearch" ]; then
    ELASTICSEARCH_BIN="server/elasticsearch/bin/elasticsearch"
else
    echo "❌ Elasticsearch not found. Setting up local installation..."
    
    # Detect environment and download appropriate version
    if [ -n "$REPLIT_DEPLOYMENT" ] || [ -n "$REPL_ID" ] || [ -f "/.replit" ]; then
        # Replit environment - always use Linux
        ELASTICSEARCH_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.15.0-linux-x86_64.tar.gz"
        echo "🔍 Detected Replit environment - using Linux version"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Local macOS
        ELASTICSEARCH_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.15.0-darwin-x86_64.tar.gz"
        if [[ $(uname -m) == "arm64" ]]; then
            ELASTICSEARCH_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.15.0-darwin-aarch64.tar.gz"
        fi
        echo "🔍 Detected local macOS - using Darwin version"
    else
        # Linux
        ELASTICSEARCH_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.15.0-linux-x86_64.tar.gz"
        echo "🔍 Detected Linux environment"
    fi
    
    echo "📥 Downloading Elasticsearch from: $ELASTICSEARCH_URL"
    curl -s -L "$ELASTICSEARCH_URL" -o /tmp/elasticsearch.tar.gz
    
    if [ $? -eq 0 ]; then
        echo "✅ Downloaded Elasticsearch"
        mkdir -p server/elasticsearch
        tar -xzf /tmp/elasticsearch.tar.gz -C server/elasticsearch --strip-components=1
        rm /tmp/elasticsearch.tar.gz
        ELASTICSEARCH_BIN="server/elasticsearch/bin/elasticsearch"
        
        # Validate JDK bundle
        JDK_PATH="server/elasticsearch/jdk/bin/java"
        if [ ! -f "$JDK_PATH" ]; then
            echo "⚠️  Bundled JDK not found at $JDK_PATH"
            echo "🔧 Checking alternative JDK locations..."
            
            # Check alternative JDK paths
            for alt_jdk in "server/elasticsearch/jdk.app/Contents/Home/bin/java" \
                           "server/elasticsearch/jdk/Contents/Home/bin/java"; do
                if [ -f "$alt_jdk" ]; then
                    echo "✅ Found JDK at: $alt_jdk"
                    break
                fi
            done
            
            # If no JDK found, use system Java
            if ! [ -f "$alt_jdk" ]; then
                echo "🔄 Using system Java instead of bundled JDK"
                export ES_JAVA_HOME=""
                export JAVA_HOME=""
            fi
        else
            echo "✅ Bundled JDK validated at: $JDK_PATH"
        fi
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

# Clear problematic JAVA_HOME if it points to non-existent paths
if [ -n "$JAVA_HOME" ] && [ ! -f "$JAVA_HOME/bin/java" ]; then
    echo "⚠️  Clearing invalid JAVA_HOME: $JAVA_HOME"
    unset JAVA_HOME
fi

# For Replit environment, ensure we use system Java
if [ -n "$REPLIT_DEPLOYMENT" ] || [ -n "$REPL_ID" ] || [ -f "/.replit" ]; then
    unset JAVA_HOME
    export ES_JAVA_HOME=""
fi

# Start Elasticsearch instance 1: PostgreSQL Layer (port 9200)
echo "Starting Elasticsearch PostgreSQL Layer on port 9200..."

if [ "$USING_OPENSEARCH" = "1" ]; then
    # Create OpenSearch configuration directory and files
    mkdir -p ./server/data/opensearch-config
    
    # Create opensearch.yml with security disabled
    cat > ./server/data/opensearch-config/opensearch.yml << 'EOF'
# OpenSearch Configuration - Security Disabled
cluster.name: universal-query-postgresql
node.name: postgresql-layer
network.host: 127.0.0.1
http.port: 9200
discovery.type: single-node
path.data: ./server/data/elasticsearch/postgresql-layer
path.logs: ./server/data/elasticsearch/logs
action.auto_create_index: true
cluster.routing.allocation.disk.threshold_enabled: false

# Disable security plugin
plugins.security.disabled: true
EOF

    # Create jvm.options file
    cat > ./server/data/opensearch-config/jvm.options << 'EOF'
## JVM configuration for OpenSearch

################################################################
## IMPORTANT: JVM heap size
################################################################
##
## The heap size is automatically configured by OpenSearch
## based on the available memory in your system and the roles
## each node will fulfill. If you find the automatically-
## configured heap size inappropriate for your environment,
## uncomment the settings below to set the heap size manually.
##
## Xms represents the initial size of total heap space
## Xmx represents the maximum size of total heap space

-Xms512m
-Xmx512m

################################################################
## Expert settings
################################################################
##
## All settings below here are expert settings. Do not change
## them unless you understand what you are doing. In other words,
## do not blame us if you change these and bad things happen.

## GC configuration
8-13:-XX:+UseConcMarkSweepGC
8-13:-XX:CMSInitiatingOccupancyFraction=75
8-13:-XX:+UseCMSInitiatingOccupancyOnly

## G1GC Configuration
14-:-XX:+UseG1GC

## optimizations

# pre-touch memory pages used by the JVM during initialization
-XX:+AlwaysPreTouch

## basic

# explicitly set the stack size
-Xss1m

# set to headless, just in case
-Djava.awt.headless=true

# ensure UTF-8 encoding by default (e.g. filenames)
-Dfile.encoding=UTF-8

# use our provided JNA always versus the system one
-Djna.nosys=true

# turn off a JDK optimization that throws away stack traces for common
# exceptions because stack traces are important for debugging
-XX:-OmitStackTraceInFastThrow

# flags to configure Netty
-Dio.netty.noUnsafe=true
-Dio.netty.noKeySetOptimization=true
-Dio.netty.recycler.maxCapacityPerThread=0

# log4j 2
-Dlog4j.shutdownHookEnabled=false
-Dlog4j2.disable.jmx=true

-Djava.locale.providers=SPI,COMPAT

## heap dumps

# generate a heap dump when an allocation from the Java heap fails
# heap dumps are created in the working directory of the JVM
-XX:+HeapDumpOnOutOfMemoryError

# specify an alternative path for heap dumps; ensure the directory exists and
# has sufficient space
-XX:HeapDumpPath=data

# specify an alternative path for JVM fatal error logs
-XX:ErrorFile=./server/data/elasticsearch/logs/hs_err_pid%p.log

## JDK 8 GC logging
8:-XX:+PrintGCDetails
8:-XX:+PrintGCTimeStamps
8:-XX:+PrintGCDateStamps
8:-XX:+PrintClassHistogram
8:-XX:+PrintTenuringDistribution
8:-XX:+PrintGCApplicationStoppedTime
8:-Xloggc:./server/data/elasticsearch/logs/gc.log
8:-XX:+UseGCLogFileRotation
8:-XX:NumberOfGCLogFiles=32
8:-XX:GCLogFileSize=64m

# JDK 9+ GC logging
9-:-Xlog:gc*,gc+age=trace,safepoint:./server/data/elasticsearch/logs/gc.log:utctime,pid,tid,level
EOF

    # Create log4j2.properties file
    cat > ./server/data/opensearch-config/log4j2.properties << 'EOF'
status = error

appender.console.type = Console
appender.console.name = console
appender.console.layout.type = PatternLayout
appender.console.layout.pattern = [%d{ISO8601}][%-5p][%-25c{1.}] [%node_name]%marker %m%n

rootLogger.level = info
rootLogger.appenderRef.console.ref = console
EOF
    
    # Ensure log directories exist
    mkdir -p ./server/data/elasticsearch/logs
    mkdir -p ./server/data/elasticsearch/postgresql-layer
    
    # Start OpenSearch with custom configuration
    OPENSEARCH_PATH_CONF=./server/data/opensearch-config "$ELASTICSEARCH_BIN" -d
else
    # Elasticsearch configuration
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
fi

# Start Elasticsearch instance 2: DynamoDB Layer (port 9201)
echo "Starting Elasticsearch DynamoDB Layer on port 9201..."

if [ "$USING_OPENSEARCH" = "1" ]; then
    # Create separate config directory for DynamoDB layer
    mkdir -p ./server/data/opensearch-config-dynamo
    
    # Copy jvm.options and log4j2.properties to dynamo config dir
    cp ./server/data/opensearch-config/jvm.options ./server/data/opensearch-config-dynamo/
    cp ./server/data/opensearch-config/log4j2.properties ./server/data/opensearch-config-dynamo/
    
    # Create opensearch.yml for DynamoDB layer
    cat > ./server/data/opensearch-config-dynamo/opensearch.yml << 'EOF'
# OpenSearch Configuration - Security Disabled
cluster.name: universal-query-dynamodb  
node.name: dynamodb-layer
network.host: 127.0.0.1
http.port: 9201
discovery.type: single-node
path.data: ./server/data/elasticsearch/dynamodb-layer
path.logs: ./server/data/elasticsearch/logs
action.auto_create_index: true
cluster.routing.allocation.disk.threshold_enabled: false

# Disable security plugin
plugins.security.disabled: true
EOF
    
    # Ensure log directories exist for DynamoDB layer
    mkdir -p ./server/data/elasticsearch/dynamodb-layer
    
    # Start OpenSearch with custom configuration for DynamoDB layer
    OPENSEARCH_PATH_CONF=./server/data/opensearch-config-dynamo "$ELASTICSEARCH_BIN" -d
else
    # Elasticsearch configuration
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
fi

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