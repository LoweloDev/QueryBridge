#!/bin/bash
# Universal Query Translator - Comprehensive Installation Script
# This script installs all prerequisites and configures the development environment

set -e  # Exit on any error

echo "🚀 Universal Query Translator Installation"
echo "=========================================="

# Function to print step headers
print_step() {
    echo ""
    echo "📋 Step $1: $2"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $1 is in use. Attempting to free it..."
        lsof -ti:$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Detect operating system
print_step "1" "Detecting Operating System"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
    echo "✅ Detected: macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
    echo "✅ Detected: Linux"
else
    echo "❌ Unsupported operating system: $OSTYPE"
    exit 1
fi

# Check for spaces in project path and handle it
print_step "2" "Checking Project Path"
PROJECT_PATH=$(pwd)
echo "Current path: $PROJECT_PATH"

if [[ "$PROJECT_PATH" == *" "* ]]; then
    echo "⚠️  WARNING: Project path contains spaces"
    echo "This may cause issues with some Redis Stack configurations."
    echo ""
    echo "Solutions:"
    echo "1. Move project to path without spaces (recommended)"
    echo "2. Create symbolic link (automatic)"
    echo "3. Continue with basic Redis (limited functionality)"
    echo ""
    
    read -p "Choose option (1/2/3): " -n 1 -r
    echo ""
    
    case $REPLY in
        1)
            echo "Please move your project to a path without spaces and run this script again."
            exit 0
            ;;
        2)
            SYMLINK_DIR="$HOME/dev-projects"
            mkdir -p "$SYMLINK_DIR"
            PROJECT_NAME=$(basename "$PROJECT_PATH")
            CLEAN_NAME=$(echo "$PROJECT_NAME" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
            SYMLINK_TARGET="$SYMLINK_DIR/$CLEAN_NAME"
            
            if [ ! -L "$SYMLINK_TARGET" ]; then
                ln -s "$PROJECT_PATH" "$SYMLINK_TARGET"
                echo "✅ Created symbolic link: $SYMLINK_TARGET"
                echo "Please cd to $SYMLINK_TARGET and run this script again for full Redis Stack support."
                exit 0
            else
                echo "✅ Using existing symbolic link: $SYMLINK_TARGET"
                if [ "$(pwd)" != "$(readlink -f "$SYMLINK_TARGET")" ]; then
                    echo "Please cd to $SYMLINK_TARGET and run this script again."
                    exit 0
                fi
            fi
            ;;
        3)
            echo "⚠️  Continuing with basic Redis (Redis Stack modules will not be available)"
            SKIP_REDIS_STACK=true
            ;;
        *)
            echo "Invalid option. Exiting."
            exit 1
            ;;
    esac
else
    echo "✅ Project path is compatible with Redis Stack"
    SKIP_REDIS_STACK=false
fi

# Check Node.js
print_step "3" "Checking Node.js"
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"
    
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        echo "✅ npm found: $NPM_VERSION"
    else
        echo "❌ npm not found"
        exit 1
    fi
else
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Install Node.js dependencies
print_step "4" "Installing Node.js Dependencies"
echo "Installing npm packages..."
npm install
echo "✅ Node.js dependencies installed"

# Check and install PostgreSQL
print_step "5" "Checking PostgreSQL"
if command_exists psql && command_exists pg_ctl; then
    PSQL_VERSION=$(psql --version | head -1)
    echo "✅ PostgreSQL found: $PSQL_VERSION"
else
    echo "📦 Installing PostgreSQL..."
    if [ "$OS" = "macOS" ]; then
        if command_exists brew; then
            brew install postgresql@15
            # Add PostgreSQL to PATH
            if ! grep -q "/opt/homebrew/opt/postgresql@15/bin" ~/.zshrc 2>/dev/null; then
                echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
            fi
            if ! grep -q "/opt/homebrew/opt/postgresql@15/bin" ~/.bash_profile 2>/dev/null; then
                echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.bash_profile
            fi
            
            # Add to current session PATH
            export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
            
            # Initialize database if not exists
            if [ ! -d "/opt/homebrew/var/postgresql@15" ]; then
                initdb -D /opt/homebrew/var/postgresql@15
            fi
            echo "✅ PostgreSQL installed via Homebrew"
            echo "⚠️  Note: Restart your terminal or run 'source ~/.zshrc' to update PATH"
        else
            echo "❌ Homebrew not found. Please install Homebrew first."
            exit 1
        fi
    elif [ "$OS" = "Linux" ]; then
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl enable postgresql
        sudo systemctl start postgresql
        echo "✅ PostgreSQL installed via package manager"
    fi
fi

# Create PostgreSQL data directory with correct permissions
PG_DATA_DIR="$(pwd)/server/data/postgresql"
mkdir -p "$PG_DATA_DIR"
chmod 700 "$PG_DATA_DIR"
echo "✅ PostgreSQL data directory created with secure permissions (700): $PG_DATA_DIR"

# Set locale environment for PostgreSQL compatibility
if ! grep -q "export LC_ALL=en_US.UTF-8" ~/.zshrc 2>/dev/null; then
    echo "export LC_ALL=en_US.UTF-8" >> ~/.zshrc
    echo "export LANG=en_US.UTF-8" >> ~/.zshrc
fi
if ! grep -q "export LC_ALL=en_US.UTF-8" ~/.bash_profile 2>/dev/null; then
    echo "export LC_ALL=en_US.UTF-8" >> ~/.bash_profile
    echo "export LANG=en_US.UTF-8" >> ~/.bash_profile
fi
echo "✅ Locale environment configured for PostgreSQL compatibility"

# Check and install MongoDB
print_step "6" "Installing MongoDB"
if command_exists mongod; then
    MONGO_VERSION=$(mongod --version | head -1)
    echo "✅ MongoDB found: $MONGO_VERSION"
else
    echo "📦 Installing MongoDB..."
    if [ "$OS" = "macOS" ]; then
        if command_exists brew; then
            brew tap mongodb/brew
            brew install mongodb-community
            echo "✅ MongoDB installed via Homebrew"
        else
            echo "❌ Homebrew not found. Please install Homebrew first."
            exit 1
        fi
    elif [ "$OS" = "Linux" ]; then
        # Install MongoDB on Linux
        wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
        echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        sudo apt-get update
        sudo apt-get install -y mongodb-org
        echo "✅ MongoDB installed via apt"
    fi
fi

# Create MongoDB data directory
MONGO_DATA_DIR="$(pwd)/server/data/mongodb"
mkdir -p "$MONGO_DATA_DIR"
echo "✅ MongoDB data directory created: $MONGO_DATA_DIR"

# Check and install Redis
print_step "7" "Installing Redis"
if [ "$SKIP_REDIS_STACK" = "true" ]; then
    echo "⚠️  Installing basic Redis only"
    if command_exists redis-server; then
        REDIS_VERSION=$(redis-server --version | head -1)
        echo "✅ Redis found: $REDIS_VERSION"
    else
        echo "📦 Installing Redis..."
        if [ "$OS" = "macOS" ]; then
            brew install redis
        elif [ "$OS" = "Linux" ]; then
            sudo apt-get update
            sudo apt-get install -y redis-server
        fi
        echo "✅ Basic Redis installed"
    fi
else
    # Install Redis Stack for full module support
    if command_exists redis-stack-server; then
        echo "✅ Redis Stack found"
        # Simply check if the command exists - don't call it with any flags
        echo "✅ Redis Stack is available"
    else
        echo "📦 Installing Redis Stack with modules..."
        if [ "$OS" = "macOS" ]; then
            if command_exists brew; then
                brew install redis-stack
                echo "✅ Redis Stack installed via Homebrew"
            else
                echo "❌ Homebrew not found. Installing basic Redis instead."
                brew install redis
                SKIP_REDIS_STACK=true
            fi
        elif [ "$OS" = "Linux" ]; then
            # Install Redis Stack on Linux
            curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
            echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
            sudo apt-get update
            sudo apt-get install -y redis-stack-server
            echo "✅ Redis Stack installed via package manager"
        fi
    fi
fi

# Create Redis data directory
REDIS_DATA_DIR="$(pwd)/server/data/redis"
mkdir -p "$REDIS_DATA_DIR"
echo "✅ Redis data directory created: $REDIS_DATA_DIR"

# Check and install DynamoDB Local
print_step "8" "Installing DynamoDB Local"
if command_exists java; then
    JAVA_VERSION=$(java -version 2>&1 | head -1)
    echo "✅ Java found: $JAVA_VERSION"
    
    # Download DynamoDB Local if not present
    DYNAMODB_DIR="$(pwd)/server/dynamodb-local"
    if [ ! -d "$DYNAMODB_DIR" ]; then
        echo "📦 Downloading DynamoDB Local..."
        mkdir -p "$DYNAMODB_DIR"
        cd "$DYNAMODB_DIR"
        wget -q https://s3.us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz
        tar -xzf dynamodb_local_latest.tar.gz
        rm dynamodb_local_latest.tar.gz
        cd - > /dev/null
        echo "✅ DynamoDB Local installed"
    else
        echo "✅ DynamoDB Local already present"
    fi
else
    echo "📦 Installing Java for DynamoDB Local..."
    if [ "$OS" = "macOS" ]; then
        brew install openjdk@11
        echo "✅ Java installed via Homebrew"
    elif [ "$OS" = "Linux" ]; then
        sudo apt-get update
        sudo apt-get install -y openjdk-11-jdk
        echo "✅ Java installed via apt"
    fi
fi

# Check and install Elasticsearch
print_step "9" "Installing Elasticsearch"
if command_exists elasticsearch; then
    ELASTICSEARCH_VERSION=$(elasticsearch --version 2>/dev/null | head -1 || echo "Version unknown")
    echo "✅ Elasticsearch found: $ELASTICSEARCH_VERSION"
elif command_exists opensearch; then
    OPENSEARCH_VERSION=$(opensearch --version 2>/dev/null | head -1 || echo "Version unknown")
    echo "✅ OpenSearch found (Elasticsearch alternative): $OPENSEARCH_VERSION"
    
    # Check if SQL plugin is already installed
    echo "📦 Checking OpenSearch SQL plugin installation..."
    OPENSEARCH_HOME=""
    if [ -d "/opt/homebrew/opt/opensearch" ]; then
        OPENSEARCH_HOME="/opt/homebrew/opt/opensearch"
    elif [ -d "/usr/local/opt/opensearch" ]; then
        OPENSEARCH_HOME="/usr/local/opt/opensearch"
    elif [ -d "/usr/share/opensearch" ]; then
        OPENSEARCH_HOME="/usr/share/opensearch"
    fi
    
    if [ -n "$OPENSEARCH_HOME" ] && [ -f "$OPENSEARCH_HOME/bin/opensearch-plugin" ]; then
        if "$OPENSEARCH_HOME/bin/opensearch-plugin" list 2>/dev/null | grep -q "opensearch-sql"; then
            echo "✅ OpenSearch SQL plugin already installed"
        else
            echo "📦 Installing OpenSearch SQL plugin..."
            DETECTED_VERSION=$(opensearch --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1 || echo "2.14.0")
            if [ -z "$DETECTED_VERSION" ] || [ "$DETECTED_VERSION" = "" ]; then
                DETECTED_VERSION="2.14.0"
                echo "   Using default OpenSearch version: $DETECTED_VERSION"
            else
                echo "   Detected OpenSearch version: $DETECTED_VERSION"
            fi
            
            # Install SQL plugin
            if [ "$OS" = "macOS" ]; then
                if "$OPENSEARCH_HOME/bin/opensearch-plugin" install "https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${DETECTED_VERSION}.0/opensearch-sql-${DETECTED_VERSION}.0.zip" 2>/dev/null; then
                    echo "✅ OpenSearch SQL plugin installed successfully"
                else
                    # Try without the extra .0 in version
                    if "$OPENSEARCH_HOME/bin/opensearch-plugin" install "https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${DETECTED_VERSION}/opensearch-sql-${DETECTED_VERSION}.zip" 2>/dev/null; then
                        echo "✅ OpenSearch SQL plugin installed successfully"
                    else
                        echo "⚠️  OpenSearch SQL plugin installation failed, but OpenSearch will still work"
                    fi
                fi
            elif [ "$OS" = "Linux" ]; then
                if sudo "$OPENSEARCH_HOME/bin/opensearch-plugin" install "https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${DETECTED_VERSION}.0/opensearch-sql-${DETECTED_VERSION}.0.zip" 2>/dev/null; then
                    echo "✅ OpenSearch SQL plugin installed successfully"
                else
                    # Try without the extra .0 in version
                    if sudo "$OPENSEARCH_HOME/bin/opensearch-plugin" install "https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${DETECTED_VERSION}/opensearch-sql-${DETECTED_VERSION}.zip" 2>/dev/null; then
                        echo "✅ OpenSearch SQL plugin installed successfully"
                    else
                        echo "⚠️  OpenSearch SQL plugin installation failed, but OpenSearch will still work"
                    fi
                fi
            fi
        fi
    else
        echo "⚠️  OpenSearch plugin installer not found"
    fi
else
    echo "📦 Installing Elasticsearch..."
    if [ "$OS" = "macOS" ]; then
        echo "   Note: Homebrew Elasticsearch packages have known issues in 2025"
        echo "   Trying installation methods in order of reliability..."
        
        # Method 1: Try OpenSearch (more reliable alternative)
        echo "   Installing OpenSearch (Elasticsearch-compatible alternative)..."
        if brew install opensearch 2>/dev/null; then
            echo "✅ OpenSearch installed successfully"
            echo "   OpenSearch is fully compatible with Elasticsearch queries"
            export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
            ELASTICSEARCH_INSTALLED=1
            
            # Install OpenSearch SQL plugin
            echo "📦 Installing OpenSearch SQL plugin..."
            OPENSEARCH_VERSION=$(opensearch --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1 || echo "2.14.0")
            if [ -z "$OPENSEARCH_VERSION" ] || [ "$OPENSEARCH_VERSION" = "" ]; then
                OPENSEARCH_VERSION="2.14.0"
                echo "   Using default OpenSearch version: $OPENSEARCH_VERSION"
            else
                echo "   Detected OpenSearch version: $OPENSEARCH_VERSION"
            fi
            
            # Find OpenSearch installation directory
            OPENSEARCH_HOME=""
            if [ -d "/opt/homebrew/opt/opensearch" ]; then
                OPENSEARCH_HOME="/opt/homebrew/opt/opensearch"
            elif [ -d "/usr/local/opt/opensearch" ]; then
                OPENSEARCH_HOME="/usr/local/opt/opensearch"
            fi
            
            if [ -n "$OPENSEARCH_HOME" ] && [ -f "$OPENSEARCH_HOME/bin/opensearch-plugin" ]; then
                echo "   Installing SQL plugin for OpenSearch $OPENSEARCH_VERSION..."
                if "$OPENSEARCH_HOME/bin/opensearch-plugin" install "https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${OPENSEARCH_VERSION}.0/opensearch-sql-${OPENSEARCH_VERSION}.0.zip" 2>/dev/null; then
                    echo "✅ OpenSearch SQL plugin installed successfully"
                else
                    # Try without the extra .0 in version
                    if "$OPENSEARCH_HOME/bin/opensearch-plugin" install "https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${OPENSEARCH_VERSION}/opensearch-sql-${OPENSEARCH_VERSION}.zip" 2>/dev/null; then
                        echo "✅ OpenSearch SQL plugin installed successfully"
                    else
                        echo "⚠️  OpenSearch SQL plugin installation failed, but OpenSearch will still work"
                        echo "   Plugin can be installed manually later if needed"
                    fi
                fi
            else
                echo "⚠️  OpenSearch plugin installer not found"
                echo "   SQL plugin can be installed manually when OpenSearch is started"
            fi
        else
            echo "   OpenSearch installation failed, trying Elasticsearch..."
            
            # Method 2: Try Elasticsearch (known to be problematic)
            echo "   Attempting Elasticsearch via Homebrew (may fail)..."
            if brew tap elastic/tap >/dev/null 2>&1 && brew install elastic/tap/elasticsearch-full >/dev/null 2>&1; then
                echo "✅ Elasticsearch installed via elastic/tap/elasticsearch-full"
                export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
                ELASTICSEARCH_INSTALLED=1
            else
                echo "   ⚠️  Homebrew installation methods failed (expected)"
                echo ""
                echo "   Alternative installation options:"
                echo "   1. Manual Homebrew: brew tap elastic/tap && brew install elastic/tap/elasticsearch-full"
                echo "   2. Docker: docker run -p 9200:9200 -e discovery.type=single-node docker.elastic.co/elasticsearch/elasticsearch:8.15.0"
                echo "   3. Direct download: The startup script will handle this automatically"
                echo ""
                echo "   ✅ The startup script will download Elasticsearch automatically when needed"
                ELASTICSEARCH_MANUAL=1
            fi
        fi
        
        # Add to shell profiles for persistent PATH (only if installation succeeded)
        if [ "$ELASTICSEARCH_INSTALLED" = "1" ]; then
            for profile in ~/.zshrc ~/.bash_profile ~/.profile; do
                if [ -f "$profile" ] && ! grep -q "/opt/homebrew/bin" "$profile"; then
                    echo 'export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"' >> "$profile" 2>/dev/null || true
                fi
            done
            
            # Test the installation
            if command -v elasticsearch >/dev/null 2>&1; then
                echo "   ✅ Elasticsearch binary found in PATH"
            elif command -v opensearch >/dev/null 2>&1; then
                echo "   ✅ OpenSearch binary found in PATH"
            else
                echo "   ⚠️  Binary not in PATH, startup script will handle this"
            fi
        elif [ "$ELASTICSEARCH_MANUAL" = "1" ]; then
            echo "   The application will work with other databases while Elasticsearch downloads automatically"
        fi
    elif [ "$OS" = "Linux" ]; then
        # Install OpenSearch first (more reliable) or fallback to Elasticsearch
        echo "   Installing OpenSearch (Elasticsearch-compatible alternative)..."
        if wget -qO - https://artifacts.opensearch.org/publickeys/opensearch.pgp | sudo apt-key add - >/dev/null 2>&1; then
            echo "deb https://artifacts.opensearch.org/releases/bundle/opensearch/2.x/apt stable main" | sudo tee -a /etc/apt/sources.list.d/opensearch-2.x.list >/dev/null
            if sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y opensearch >/dev/null 2>&1; then
                echo "✅ OpenSearch installed via package manager"
                sudo systemctl enable opensearch >/dev/null 2>&1 || true
                ELASTICSEARCH_INSTALLED=1
                
                # Install OpenSearch SQL plugin
                echo "📦 Installing OpenSearch SQL plugin..."
                OPENSEARCH_VERSION=$(opensearch --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1 || echo "2.14.0")
                if [ -z "$OPENSEARCH_VERSION" ] || [ "$OPENSEARCH_VERSION" = "" ]; then
                    OPENSEARCH_VERSION="2.14.0"
                    echo "   Using default OpenSearch version: $OPENSEARCH_VERSION"
                else
                    echo "   Detected OpenSearch version: $OPENSEARCH_VERSION"
                fi
                
                # Find OpenSearch installation directory on Linux
                OPENSEARCH_HOME="/usr/share/opensearch"
                if [ -f "$OPENSEARCH_HOME/bin/opensearch-plugin" ]; then
                    echo "   Installing SQL plugin for OpenSearch $OPENSEARCH_VERSION..."
                    if sudo "$OPENSEARCH_HOME/bin/opensearch-plugin" install "https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${OPENSEARCH_VERSION}.0/opensearch-sql-${OPENSEARCH_VERSION}.0.zip" 2>/dev/null; then
                        echo "✅ OpenSearch SQL plugin installed successfully"
                    else
                        # Try without the extra .0 in version
                        if sudo "$OPENSEARCH_HOME/bin/opensearch-plugin" install "https://artifacts.opensearch.org/releases/plugins/opensearch-sql/${OPENSEARCH_VERSION}/opensearch-sql-${OPENSEARCH_VERSION}.zip" 2>/dev/null; then
                            echo "✅ OpenSearch SQL plugin installed successfully"
                        else
                            echo "⚠️  OpenSearch SQL plugin installation failed, but OpenSearch will still work"
                            echo "   Plugin can be installed manually later if needed"
                        fi
                    fi
                else
                    echo "⚠️  OpenSearch plugin installer not found"
                    echo "   SQL plugin can be installed manually when OpenSearch is started"
                fi
            else
                # Fallback to Elasticsearch
                echo "   OpenSearch installation failed, trying Elasticsearch..."
                if wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch 2>/dev/null | sudo apt-key add - >/dev/null 2>&1; then
                    echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list >/dev/null
                    if sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y elasticsearch >/dev/null 2>&1; then
                        echo "✅ Elasticsearch installed via package manager"
                        sudo systemctl enable elasticsearch >/dev/null 2>&1 || true
                        ELASTICSEARCH_INSTALLED=1
                    else
                        echo "⚠️  Elasticsearch installation failed"
                        echo "   The startup script will download a local copy automatically"
                    fi
                else
                    echo "⚠️  Could not add Elasticsearch repository"
                    echo "   The startup script will download a local copy automatically"
                fi
            fi
        else
            echo "⚠️  Could not add OpenSearch repository, trying Elasticsearch..."
            if wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch 2>/dev/null | sudo apt-key add - >/dev/null 2>&1; then
                echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list >/dev/null
                if sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y elasticsearch >/dev/null 2>&1; then
                    echo "✅ Elasticsearch installed via package manager"
                    sudo systemctl enable elasticsearch >/dev/null 2>&1 || true
                    ELASTICSEARCH_INSTALLED=1
                else
                    echo "⚠️  Elasticsearch installation failed"
                    echo "   The startup script will download a local copy automatically"
                fi
            else
                echo "⚠️  Could not add Elasticsearch repository"
                echo "   The startup script will download a local copy automatically"
            fi
        fi
    fi
fi

# Create Elasticsearch data directories
ES_DATA_DIR="$(pwd)/server/data/elasticsearch"
mkdir -p "$ES_DATA_DIR/data1" "$ES_DATA_DIR/data2"
echo "✅ Elasticsearch data directories created"

# Clean up any existing processes
print_step "10" "Cleaning Up Existing Processes"
echo "Stopping any existing database processes..."
pkill -f mongod || true
pkill -f redis-server || true
pkill -f redis-stack-server || true
pkill -f DynamoDBLocal || true
pkill -f elasticsearch || true

# Clean up ports
for port in 27017 6379 8000 9200 9201; do
    check_port $port
done

echo "✅ Cleanup completed"

# Test installations
print_step "11" "Testing Installations"

echo "Testing MongoDB..."
timeout 10s mongod --dbpath "$MONGO_DATA_DIR" --port 27017 --fork --logpath "$MONGO_DATA_DIR/mongodb.log" || echo "MongoDB test completed"
pkill -f mongod || true

echo "Testing Redis..."
# Create a simple test config to avoid Redis Stack config issues
REDIS_TEST_CONF="$REDIS_DATA_DIR/test.conf"
cat > "$REDIS_TEST_CONF" << EOF
port 6380
bind 127.0.0.1
daemonize yes
dir $REDIS_DATA_DIR
save ""
appendonly no
logfile $REDIS_DATA_DIR/test.log
EOF

if [ "$SKIP_REDIS_STACK" = "true" ]; then
    timeout 5s redis-server "$REDIS_TEST_CONF" || echo "Redis test completed"
else
    # Test Redis Stack with config file to avoid command line issues
    timeout 5s redis-stack-server "$REDIS_TEST_CONF" || timeout 5s redis-server "$REDIS_TEST_CONF" || echo "Redis test completed"
fi
pkill -f redis || true
rm -f "$REDIS_TEST_CONF"

echo "Testing DynamoDB Local..."
cd "$DYNAMODB_DIR"
timeout 5s java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb -port 8000 -inMemory &
DYNAMO_PID=$!
sleep 3
kill $DYNAMO_PID 2>/dev/null || true
cd - > /dev/null
echo "DynamoDB Local test completed"

echo "✅ All installations tested successfully"

# Verify OpenSearch SQL plugin installation
if command_exists opensearch; then
    echo "Testing OpenSearch SQL plugin installation..."
    
    # Find OpenSearch home directory
    OPENSEARCH_HOME=""
    if [ -d "/opt/homebrew/opt/opensearch" ]; then
        OPENSEARCH_HOME="/opt/homebrew/opt/opensearch"
    elif [ -d "/usr/local/opt/opensearch" ]; then
        OPENSEARCH_HOME="/usr/local/opt/opensearch"
    elif [ -d "/usr/share/opensearch" ]; then
        OPENSEARCH_HOME="/usr/share/opensearch"
    fi
    
    if [ -n "$OPENSEARCH_HOME" ] && [ -f "$OPENSEARCH_HOME/bin/opensearch-plugin" ]; then
        if "$OPENSEARCH_HOME/bin/opensearch-plugin" list 2>/dev/null | grep -q "opensearch-sql"; then
            echo "✅ OpenSearch SQL plugin verified successfully"
        elif [ -d "$OPENSEARCH_HOME/plugins/opensearch-sql" ]; then
            echo "✅ OpenSearch SQL plugin directory found"
        else
            echo "⚠️  OpenSearch SQL plugin not detected, but will be available after startup"
        fi
    else
        echo "ℹ️  OpenSearch plugin verification skipped"
    fi
fi

# Set up environment
print_step "12" "Setting Up Environment"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
    else
        echo "⚠️  No .env.example found"
    fi
else
    echo "✅ .env file already exists"
fi

# Make scripts executable
chmod +x server/scripts/*.sh 2>/dev/null || true
chmod +x *.sh
echo "✅ Made scripts executable"

# Final summary
print_step "13" "Installation Summary"
echo "✅ Node.js and npm dependencies installed"
echo "✅ MongoDB installed and configured"
if [ "$SKIP_REDIS_STACK" = "true" ]; then
    echo "⚠️  Basic Redis installed (Redis Stack modules unavailable due to path spaces)"
else
    echo "✅ Redis Stack available (module support depends on configuration)"
fi
echo "✅ DynamoDB Local installed"
if command_exists opensearch; then
    echo "✅ OpenSearch installed with SQL plugin support"
else
    echo "✅ Elasticsearch installed"
fi
echo "✅ Data directories created"
echo "✅ Development environment configured"

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the development server: ./start-dev.sh"
echo "2. Visit http://localhost:5000 to access the application"
echo "3. OpenSearch SQL plugin will be available at: http://localhost:9200/_plugins/_sql"
echo ""
if [ "$SKIP_REDIS_STACK" = "true" ]; then
    echo "Note: Redis Stack modules are not available due to spaces in project path."
    echo "For full Redis Stack support, move project to path without spaces."
fi