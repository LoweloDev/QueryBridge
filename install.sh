#!/bin/bash
# Universal Query Library - Docker-based Development Environment Setup
# Installs Docker, Docker Compose, and sets up the complete development environment

set -e  # Exit on any error

echo "🐳 Universal Query Library Docker Setup"
echo "======================================="
echo ""

# Detect operating system
OS=$(uname -s)
ARCH=$(uname -m)

echo "🖥️  Detected system: $OS ($ARCH)"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect package manager
detect_package_manager() {
    if command_exists apt-get; then
        echo "apt"
    elif command_exists yum; then
        echo "yum"
    elif command_exists dnf; then
        echo "dnf"
    elif command_exists pacman; then
        echo "pacman"
    elif command_exists brew; then
        echo "brew"
    else
        echo "unknown"
    fi
}

PACKAGE_MANAGER=$(detect_package_manager)
echo "📦 Package manager: $PACKAGE_MANAGER"
echo ""

# Check if Docker is installed
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
    echo "✅ Docker found: $DOCKER_VERSION"
else
    echo "📦 Installing Docker..."
    
    case $PACKAGE_MANAGER in
        "brew")
            echo "   Installing Docker Desktop via Homebrew..."
            brew install --cask docker
            echo "   ⚠️  Please start Docker Desktop manually after installation"
            ;;
        "apt")
            echo "   Installing Docker via apt..."
            sudo apt-get update
            sudo apt-get install -y ca-certificates curl gnupg lsb-release
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            echo "   ⚠️  Please log out and log back in for Docker group permissions to take effect"
            ;;
        "yum"|"dnf")
            echo "   Installing Docker via $PACKAGE_MANAGER..."
            sudo $PACKAGE_MANAGER install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo $PACKAGE_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            echo "   ⚠️  Please log out and log back in for Docker group permissions to take effect"
            ;;
        "pacman")
            echo "   Installing Docker via pacman..."
            sudo pacman -S --needed docker docker-compose
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            echo "   ⚠️  Please log out and log back in for Docker group permissions to take effect"
            ;;
        *)
            echo "   ❌ Unsupported package manager. Please install Docker manually:"
            echo "      https://docs.docker.com/engine/install/"
            exit 1
            ;;
    esac
    
    echo "✅ Docker installation completed"
fi

# Check if Docker Compose is available
if command_exists docker && docker compose version >/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker compose version --short)
    echo "✅ Docker Compose found: $COMPOSE_VERSION"
elif command_exists docker-compose; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f3 | cut -d ',' -f1)
    echo "✅ Docker Compose found: $COMPOSE_VERSION"
    echo "   ℹ️  Using legacy docker-compose command"
else
    echo "📦 Installing Docker Compose..."
    
    if [ "$PACKAGE_MANAGER" = "brew" ]; then
        echo "   Docker Compose is included with Docker Desktop"
    else
        # Install Docker Compose v2
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo "✅ Docker Compose installed"
    fi
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"
else
    echo "📦 Installing Node.js..."
    
    case $PACKAGE_MANAGER in
        "brew")
            brew install node
            ;;
        "apt")
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "yum"|"dnf")
            sudo $PACKAGE_MANAGER install -y nodejs npm
            ;;
        "pacman")
            sudo pacman -S --needed nodejs npm
            ;;
        *)
            echo "   ❌ Please install Node.js manually: https://nodejs.org/"
            exit 1
            ;;
    esac
    
    echo "✅ Node.js installation completed"
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm found: $NPM_VERSION"
else
    echo "❌ npm not found. Please ensure Node.js is properly installed"
    exit 1
fi

echo ""
echo "🔧 Setting up development environment..."

# Create necessary directories
echo "📁 Creating data directories..."
mkdir -p server/data/{postgresql,mongodb,redis,dynamodb,opensearch}
echo "✅ Data directories created"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env file..."
    cat > .env << 'EOF'
# Universal Query Library - Docker Environment Configuration

# Application Mode
NODE_ENV=development
DOCKER_MODE=true

# PostgreSQL Configuration (Docker)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=querybridge_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# MongoDB Configuration (Docker)
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DB=analytics
MONGODB_USER=admin
MONGODB_PASSWORD=password

# Redis Configuration (Docker)
REDIS_HOST=localhost
REDIS_PORT=6379

# DynamoDB Configuration (Docker)
DYNAMODB_HOST=localhost
DYNAMODB_PORT=8000
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
AWS_REGION=us-east-1

# OpenSearch Configuration (Docker)
OPENSEARCH_HOST=localhost
OPENSEARCH_PORT=9200

# Application Configuration
PORT=5000
EOF
    echo "✅ .env file created with Docker configuration"
else
    echo "ℹ️  .env file already exists, skipping creation"
fi

# Install npm dependencies
echo ""
echo "📦 Installing application dependencies..."
if [ ! -d node_modules ]; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "ℹ️  Dependencies already installed, run 'npm install' if you need to update"
fi

# Build the library
echo ""
echo "🔨 Building universal-query-translator library..."
cd lib
npm install
npm run build
echo "✅ Library built successfully"
cd ..

# Pull Docker images
echo ""
echo "🐳 Pulling Docker images (this may take a few minutes)..."
if command_exists docker && docker info >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then
        docker compose pull
    elif command_exists docker-compose; then
        docker-compose pull
    else
        echo "❌ Docker Compose not available"
        exit 1
    fi
    echo "✅ Docker images pulled successfully"
else
    echo "⚠️  Docker is not running. Please start Docker and run this script again."
    echo "   You can manually pull images later with: docker compose pull"
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure Docker is running"
echo "2. Run './start-dev-docker.sh' to start all services"
echo "3. Visit http://localhost:5000 to access the application"
echo ""
echo "🔧 Available services:"
echo "   - Application: http://localhost:5000"
echo "   - PostgreSQL: localhost:5432"
echo "   - MongoDB: localhost:27017"
echo "   - Redis: localhost:6379 (+ RedisInsight: http://localhost:8001)"
echo "   - DynamoDB Local: http://localhost:8000"
echo "   - OpenSearch: http://localhost:9200"
echo "   - OpenSearch Dashboards: http://localhost:5601"
echo ""
echo "📚 Documentation:"
echo "   - Library README: ./lib/README.md"
echo "   - Developer Guide: ./lib/DEVELOPER_GUIDE.md"
echo "   - Project Documentation: ./README.md"
echo ""
echo "🐳 Docker commands:"
echo "   - Start services: docker compose up -d"
echo "   - Stop services: docker compose down"
echo "   - View logs: docker compose logs -f"
echo "   - Restart service: docker compose restart <service>"