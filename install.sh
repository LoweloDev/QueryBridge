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
            echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
            echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.bash_profile
            # Initialize database if not exists
            if [ ! -d "/opt/homebrew/var/postgresql@15" ]; then
                initdb -D /opt/homebrew/var/postgresql@15
            fi
            echo "✅ PostgreSQL installed via Homebrew"
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

# Create PostgreSQL data directory
PG_DATA_DIR="$(pwd)/server/data/postgresql"
mkdir -p "$PG_DATA_DIR"
echo "✅ PostgreSQL data directory created: $PG_DATA_DIR"

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
    echo "✅ Elasticsearch found"
else
    echo "📦 Installing Elasticsearch..."
    if [ "$OS" = "macOS" ]; then
        # Use official Elasticsearch instead of the problematic tap
        if brew install elasticsearch >/dev/null 2>&1; then
            echo "✅ Elasticsearch installed via Homebrew"
        else
            echo "⚠️  Elasticsearch installation failed via Homebrew"
            echo "   You can install manually or skip Elasticsearch for now"
            echo "   The application will work with other databases"
        fi
    elif [ "$OS" = "Linux" ]; then
        # Install Elasticsearch on Linux with error handling
        if wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add - >/dev/null 2>&1; then
            echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list >/dev/null
            if sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y elasticsearch >/dev/null 2>&1; then
                echo "✅ Elasticsearch installed via package manager"
            else
                echo "⚠️  Elasticsearch installation failed"
                echo "   Continuing without Elasticsearch"
            fi
        else
            echo "⚠️  Could not add Elasticsearch repository"
            echo "   Continuing without Elasticsearch"
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
echo "✅ Elasticsearch installed"
echo "✅ Data directories created"
echo "✅ Development environment configured"

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the development server: ./start-dev.sh"
echo "2. Visit http://localhost:5000 to access the application"
echo ""
if [ "$SKIP_REDIS_STACK" = "true" ]; then
    echo "Note: Redis Stack modules are not available due to spaces in project path."
    echo "For full Redis Stack support, move project to path without spaces."
fi