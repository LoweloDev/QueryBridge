#!/bin/bash
# Test script to install OpenSearch SQL plugin

echo "🔍 Testing OpenSearch SQL plugin installation..."

# Check if OpenSearch is available
if command -v opensearch >/dev/null 2>&1; then
    echo "✅ OpenSearch found"
    OPENSEARCH_VERSION=$(opensearch --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1 || echo "2.14.0")
    echo "   Version: $OPENSEARCH_VERSION"
    
    # Find OpenSearch home directory
    OPENSEARCH_HOME=""
    for path in "/opt/homebrew/opt/opensearch" "/usr/local/opt/opensearch" "/usr/share/opensearch"; do
        if [ -d "$path" ]; then
            OPENSEARCH_HOME="$path"
            break
        fi
    done
    
    if [ -n "$OPENSEARCH_HOME" ]; then
        echo "   Home directory: $OPENSEARCH_HOME"
        
        if [ -f "$OPENSEARCH_HOME/bin/opensearch-plugin" ]; then
            echo "   Plugin installer found"
            
            # Check if SQL plugin is already installed
            if "$OPENSEARCH_HOME/bin/opensearch-plugin" list 2>/dev/null | grep -q "opensearch-sql"; then
                echo "✅ OpenSearch SQL plugin already installed"
            else
                echo "📦 Installing OpenSearch SQL plugin..."
                
                # Try installing the plugin
                PLUGIN_URL="https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${OPENSEARCH_VERSION}.0/opensearch-sql-${OPENSEARCH_VERSION}.0.zip"
                echo "   Trying: $PLUGIN_URL"
                
                if "$OPENSEARCH_HOME/bin/opensearch-plugin" install "$PLUGIN_URL" 2>/dev/null; then
                    echo "✅ OpenSearch SQL plugin installed successfully"
                else
                    # Try without the extra .0
                    PLUGIN_URL="https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${OPENSEARCH_VERSION}/opensearch-sql-${OPENSEARCH_VERSION}.zip"
                    echo "   Trying alternative: $PLUGIN_URL"
                    
                    if "$OPENSEARCH_HOME/bin/opensearch-plugin" install "$PLUGIN_URL" 2>/dev/null; then
                        echo "✅ OpenSearch SQL plugin installed successfully"
                    else
                        echo "❌ OpenSearch SQL plugin installation failed"
                        echo "   Manual installation may be required"
                    fi
                fi
            fi
            
            # List installed plugins
            echo "📋 Currently installed plugins:"
            "$OPENSEARCH_HOME/bin/opensearch-plugin" list 2>/dev/null || echo "   Failed to list plugins"
        else
            echo "❌ OpenSearch plugin installer not found at $OPENSEARCH_HOME/bin/opensearch-plugin"
        fi
    else
        echo "❌ OpenSearch home directory not found"
        echo "   Checked: /opt/homebrew/opt/opensearch, /usr/local/opt/opensearch, /usr/share/opensearch"
    fi
else
    echo "❌ OpenSearch not found in PATH"
    echo "   OpenSearch must be installed first"
fi

echo ""
echo "🎯 Next steps:"
echo "1. If plugin installed successfully, start OpenSearch"
echo "2. Test SQL endpoint: curl -XPOST localhost:9200/_plugins/_sql -H 'Content-Type: application/json' -d '{\"query\": \"SHOW TABLES\"}'"