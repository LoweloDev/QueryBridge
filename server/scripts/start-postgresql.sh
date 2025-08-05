#!/bin/bash
# Start PostgreSQL locally for testing

set -e

# Get the project root directory
PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
PG_DATA_DIR="$PROJECT_ROOT/server/data/postgresql"

echo "Starting PostgreSQL..."

# Add PostgreSQL to PATH if installed via Homebrew (macOS local development)
if [ -d "/opt/homebrew/opt/postgresql@15/bin" ]; then
    export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
elif [ -d "/usr/local/opt/postgresql@15/bin" ]; then
    export PATH="/usr/local/opt/postgresql@15/bin:$PATH"
elif [ -d "/opt/homebrew/opt/postgresql/bin" ]; then
    export PATH="/opt/homebrew/opt/postgresql/bin:$PATH"
elif [ -d "/usr/local/opt/postgresql/bin" ]; then
    export PATH="/usr/local/opt/postgresql/bin:$PATH"
fi

# Check if PostgreSQL is installed
if ! command -v pg_ctl >/dev/null 2>&1; then
    echo "❌ PostgreSQL (pg_ctl) not found"
    echo "   This script requires local PostgreSQL installation for development"
    echo "   In Replit: PostgreSQL is available via DATABASE_URL (Neon)"
    echo "   On macOS: brew install postgresql@15"
    echo "   On Linux: apt install postgresql"
    exit 1
fi

# Get PostgreSQL version for logging
PG_VERSION=$(pg_ctl --version | head -1)
echo "✅ Found PostgreSQL: $PG_VERSION"

# Check if already running
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL is already running on port 5432"
    
    # Verify we can create database if needed
    if ! psql -h localhost -p 5432 -U "$USER" -lqt | cut -d \| -f 1 | grep -qw querybridge_dev; then
        echo "Creating development database..."
        createdb -h localhost -p 5432 -U "$USER" querybridge_dev 2>/dev/null || echo "⚠️  Database may already exist"
    fi
    exit 0
fi

# Check for Homebrew PostgreSQL service
if command -v brew >/dev/null 2>&1; then
    if brew services list | grep postgresql | grep started >/dev/null 2>&1; then
        echo "Found Homebrew PostgreSQL service running. Stopping it..."
        brew services stop postgresql@15 2>/dev/null || brew services stop postgresql@14 2>/dev/null || brew services stop postgresql 2>/dev/null || true
        sleep 3
    fi
fi

# More thorough cleanup of PostgreSQL processes
echo "Checking for existing PostgreSQL processes..."
if pgrep -f postgres >/dev/null 2>&1; then
    echo "Found existing PostgreSQL processes:"
    pgrep -fl postgres | sed 's/^/   /'
    echo "Stopping them..."
    pkill -f postgres 2>/dev/null || true
    sleep 3
    
    # Force kill if still running
    if pgrep -f postgres >/dev/null 2>&1; then
        echo "Force stopping remaining PostgreSQL processes..."
        pkill -9 -f postgres 2>/dev/null || true
        sleep 2
    fi
fi

# Kill any lingering processes on port 5432
if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti:5432 2>/dev/null || echo "")
    if [ -n "$pid" ]; then
        echo "Cleaning up port 5432..."
        kill -TERM $pid 2>/dev/null || true
        sleep 2
        
        # Force kill if still there
        if lsof -ti:5432 >/dev/null 2>&1; then
            kill -9 $pid 2>/dev/null || true
            sleep 1
        fi
    fi
fi

# Create and fix permissions for data directory
if [ ! -d "$PG_DATA_DIR" ]; then
    echo "Creating PostgreSQL data directory: $PG_DATA_DIR"
    mkdir -p "$PG_DATA_DIR"
fi

# Check for PostgreSQL version compatibility
if [ -f "$PG_DATA_DIR/PG_VERSION" ]; then
    DATA_PG_VERSION=$(cat "$PG_DATA_DIR/PG_VERSION")
    CURRENT_PG_VERSION=$(pg_ctl --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    
    if [ "$DATA_PG_VERSION" != "$CURRENT_PG_VERSION" ]; then
        echo "⚠️  PostgreSQL version mismatch detected:"
        echo "   Data directory: PostgreSQL $DATA_PG_VERSION"
        echo "   Current binary: PostgreSQL $CURRENT_PG_VERSION"
        echo ""
        echo "The existing data directory is incompatible with your PostgreSQL version."
        echo "This will remove the old data directory and create a fresh one."
        echo "Any existing development data will be lost."
        echo ""
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Removing incompatible data directory..."
            rm -rf "$PG_DATA_DIR"
            echo "✅ Incompatible data directory removed"
        else
            echo "❌ Cancelled. Please resolve the version mismatch manually."
            exit 1
        fi
    fi
fi

# Fix directory permissions for PostgreSQL (required: 0700 or 0750)
echo "Setting correct permissions for PostgreSQL data directory..."
mkdir -p "$PG_DATA_DIR"
chmod 700 "$PG_DATA_DIR"
if [ $? -eq 0 ]; then
    echo "✅ Directory permissions set to 700 (owner read/write/execute only)"
else
    echo "❌ Failed to set directory permissions. You may need to run:"
    echo "   sudo chmod 700 '$PG_DATA_DIR'"
    echo "   sudo chown $(whoami) '$PG_DATA_DIR'"
    exit 1
fi

# Initialize data directory if it doesn't exist
if [ ! -f "$PG_DATA_DIR/postgresql.conf" ]; then
    echo "Initializing PostgreSQL data directory..."
    # Set proper locale to prevent multithreading issues
    export LC_ALL=en_US.UTF-8
    export LANG=en_US.UTF-8
    initdb -D "$PG_DATA_DIR" --auth-local=trust --auth-host=trust --locale=en_US.UTF-8
    echo "✅ PostgreSQL data directory initialized"
    
    # Configure PostgreSQL for local development with unique port to avoid conflicts
    echo "Configuring PostgreSQL for local environment..."
    
    # Create custom postgresql.conf to override defaults
    cat >> "$PG_DATA_DIR/postgresql.conf" << EOF

# Custom configuration for development
listen_addresses = 'localhost'
port = 5432
unix_socket_directories = '$PG_DATA_DIR'
log_destination = 'stderr'
logging_collector = off
EOF
    
    # Ensure pg_hba.conf allows local connections
    cat > "$PG_DATA_DIR/pg_hba.conf" << EOF
# PostgreSQL Client Authentication Configuration File
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections for development
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
EOF
fi

# Start PostgreSQL
echo "Starting PostgreSQL server..."
# Set proper locale environment for PostgreSQL startup
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
if ! pg_ctl start -D "$PG_DATA_DIR" -l "$PG_DATA_DIR/postgresql.log" -o "-p 5432 -k $PG_DATA_DIR" -w; then
    echo "❌ PostgreSQL failed to start. Checking logs..."
    
    # Check main log file
    if [ -f "$PG_DATA_DIR/postgresql.log" ]; then
        echo "Main PostgreSQL log:"
        tail -10 "$PG_DATA_DIR/postgresql.log" | sed 's/^/   /'
    fi
    
    # Check for additional log files in log directory
    if [ -d "$PG_DATA_DIR/log" ]; then
        echo "Checking log directory..."
        LATEST_LOG=$(find "$PG_DATA_DIR/log" -name "*.log" -type f -exec ls -t {} + | head -1)
        if [ -n "$LATEST_LOG" ]; then
            echo "Latest log file: $LATEST_LOG"
            tail -10 "$LATEST_LOG" | sed 's/^/   /'
        fi
    fi
    
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check if port 5432 is in use: lsof -Pi :5432"
    echo "2. Check for existing PostgreSQL processes: pgrep postgres"
    echo "3. If needed, kill existing processes: pkill postgres"
    exit 1
fi

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to start..."
for i in {1..10}; do
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo "✅ PostgreSQL is running on port 5432"
        
        # Create development database if it doesn't exist
        if ! psql -h localhost -p 5432 -U "$USER" -lqt | cut -d \| -f 1 | grep -qw querybridge_dev; then
            echo "Creating development database..."
            createdb -h localhost -p 5432 -U "$USER" querybridge_dev
            echo "✅ Development database 'querybridge_dev' created"
        fi
        
        # Set up environment variables for local development
        echo ""
        echo "PostgreSQL Status:"
        echo "- Port: 5432"
        echo "- Database: querybridge_dev"
        echo "- User: $USER"
        echo "- Data directory: $PG_DATA_DIR"
        echo ""
        echo "Add to your .env file:"
        echo "DATABASE_URL=postgresql://$USER@localhost:5432/querybridge_dev"
        
        exit 0
    fi
    echo "Waiting for PostgreSQL... ($i/10)"
    sleep 2
done

echo "❌ PostgreSQL failed to start after 20 seconds"
echo "Check log: $PG_DATA_DIR/postgresql.log"
exit 1