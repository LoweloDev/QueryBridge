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
    exit 0
fi

# Kill any lingering processes on port 5432
if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti:5432 2>/dev/null || echo "")
    if [ -n "$pid" ]; then
        echo "Cleaning up port 5432..."
        kill -TERM $pid 2>/dev/null || true
        sleep 2
    fi
fi

# Initialize data directory if it doesn't exist
if [ ! -f "$PG_DATA_DIR/postgresql.conf" ]; then
    echo "Initializing PostgreSQL data directory..."
    initdb -D "$PG_DATA_DIR" --auth-local=trust --auth-host=trust
    echo "✅ PostgreSQL data directory initialized"
    
    # Configure PostgreSQL for local development
    echo "Configuring PostgreSQL for local environment..."
    echo "unix_socket_directories = '$PG_DATA_DIR'" >> "$PG_DATA_DIR/postgresql.conf"
    echo "listen_addresses = 'localhost'" >> "$PG_DATA_DIR/postgresql.conf"
    echo "port = 5432" >> "$PG_DATA_DIR/postgresql.conf"
    
    # Update pg_hba.conf for passwordless local connections
    echo "# Local connections without password for development" >> "$PG_DATA_DIR/pg_hba.conf"
    echo "local   all             all                                     trust" >> "$PG_DATA_DIR/pg_hba.conf"
    echo "host    all             all             127.0.0.1/32            trust" >> "$PG_DATA_DIR/pg_hba.conf"
    echo "host    all             all             ::1/128                 trust" >> "$PG_DATA_DIR/pg_hba.conf"
fi

# Start PostgreSQL
echo "Starting PostgreSQL server..."
pg_ctl start -D "$PG_DATA_DIR" -l "$PG_DATA_DIR/postgresql.log" -o "-p 5432 -k $PG_DATA_DIR" -w

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