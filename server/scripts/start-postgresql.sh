#!/bin/bash
# Start PostgreSQL locally for testing

set -e

# Get the project root directory
PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
PG_DATA_DIR="$PROJECT_ROOT/server/data/postgresql"

echo "Starting PostgreSQL..."

# Check if PostgreSQL is installed
if ! command -v pg_ctl >/dev/null 2>&1; then
    echo "❌ PostgreSQL (pg_ctl) not found"
    echo "   Install PostgreSQL: brew install postgresql@15 (macOS) or apt install postgresql (Linux)"
    exit 1
fi

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
    initdb -D "$PG_DATA_DIR" --auth-local=trust --auth-host=md5
    echo "✅ PostgreSQL data directory initialized"
fi

# Start PostgreSQL
echo "Starting PostgreSQL server..."
pg_ctl start -D "$PG_DATA_DIR" -l "$PG_DATA_DIR/postgresql.log" -o "-p 5432"

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