# QueryBridge Monorepo

**Universal Database Query Translation Platform**

A comprehensive monorepo containing a standalone NPM library and visual testing platform for translating database queries across multiple technologies. Write queries once in Universal Query Language (UQL) and execute them on PostgreSQL, MongoDB, Elasticsearch, DynamoDB, and Redis.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

## 🌟 What is QueryBridge?

QueryBridge is both a **production-ready TypeScript library** and an **interactive testing platform** that enables developers to write database queries once and execute them across multiple database technologies using a universal SQL-like syntax.

### 🎯 Key Benefits

- **🔄 Write Once, Run Anywhere** - Single query syntax for all supported databases
- **📦 Production Ready** - Standalone npm library with full TypeScript support
- **🎮 Visual Testing** - Interactive playground for testing and validation
- **🛡️ Type Safe** - Comprehensive TypeScript definitions and runtime validation
- **🔌 Framework Agnostic** - Works with any Node.js application or framework
- **🚀 Performance Focused** - Efficient query translation and connection management

## 📁 Repository Structure

```
QueryBridge/
├── 📦 lib/                    # Universal Query Translator Library (NPM Package)
│   ├── src/                   # TypeScript source code
│   ├── __tests__/             # Test suites
│   ├── dist/                  # Compiled output
│   ├── README.md             # Library usage documentation
│   ├── DEVELOPER_GUIDE.md    # Library development guide
│   └── package.json          # Library dependencies
├── 🖥️ client/                 # Playground Frontend (React + TypeScript)
│   ├── src/                   # React components and pages
│   ├── components/            # UI components (shadcn/ui)
│   └── pages/                 # Application pages
├── 🔧 server/                 # Playground Backend (Node.js + Express)
│   ├── routes.ts              # API endpoints
│   ├── services/              # Business logic
│   └── data/                  # Database configurations
├── 🐳 docker-compose.yml      # Database environment setup
├── 📄 README.md              # This file (monorepo overview)
└── 🛠️ package.json           # Monorepo dependencies
```

## 🚀 Quick Start Options

### Option 1: Use the Library in Your Project

For integrating query translation into your Node.js application:

```bash
npm install universal-query-translator
```

```typescript
import { ConnectionManager } from 'universal-query-translator'

const cm = new ConnectionManager()
cm.registerConnection('db', dbClient, config)

const result = await cm.executeQuery('db', `
  FIND users 
  WHERE status = "active" 
  ORDER BY created_at DESC 
  LIMIT 10
`)
```

**📚 [Complete Library Documentation →](./lib/README.md)**

### Option 2: Run the Interactive Playground

For testing, learning, and validating query translations:

```bash
# Quick start with Docker
git clone <repository-url>
cd QueryBridge
./install-docker.sh          # Install Docker if needed
./start-dev-docker.sh        # Start everything with Docker
```

Visit `http://localhost:5000` to access the playground.

## 🗂️ Components Overview

### 📦 Universal Query Translator Library

**Location**: `./lib/`  
**Purpose**: Production-ready npm package for Node.js applications

**Features**:
- Universal Query Language (UQL) parser
- Multi-database query translator
- Connection management system
- Full TypeScript support
- Comprehensive test suite

**Database Support**:
- ✅ **PostgreSQL** - Direct SQL translation (primary target)
- ✅ **MongoDB** - Via SQL-to-MongoDB conversion
- ✅ **Elasticsearch** - SQL endpoint compatibility
- ✅ **DynamoDB** - PartiQL-compatible subset
- ✅ **Redis** - Structured command planning

### 🖥️ Playground Frontend

**Location**: `./client/`  
**Purpose**: Interactive web interface for testing query translations

**Technologies**:
- **React 18** with TypeScript
- **Vite** for fast development and building
- **shadcn/ui** component library (Radix UI + Tailwind)
- **TanStack Query** for data fetching
- **Wouter** for routing

**Features**:
- **Visual Query Editor** - Syntax highlighting and formatting
- **Real-time Translation** - See queries translated instantly
- **Multi-Database Execution** - Test against live database connections
- **Connection Management** - Easy database connection setup
- **Query History** - Track and reuse previous queries
- **Result Visualization** - Formatted display of query results

### 🔧 Playground Backend

**Location**: `./server/`  
**Purpose**: Express.js API server for the playground application

**Technologies**:
- **Node.js** with **Express.js**
- **TypeScript** throughout
- **Drizzle ORM** for PostgreSQL operations
- Database clients for all supported databases

**Features**:
- **Query Execution API** - Execute translated queries
- **Connection Management** - Handle database connections
- **Dataset Management** - Load example data for testing
- **Settings Management** - Store user preferences
- **Development Tools** - Database setup and utilities

## 🌐 Universal Query Language (UQL)

### Basic Syntax

```sql
FIND users
WHERE status = "active" AND age > 18
ORDER BY created_at DESC
LIMIT 50
```

### Advanced Features

```sql
-- Complex filtering and joins
FIND users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE 
  u.status = "active" AND
  o.created_at > "2024-01-01"
GROUP BY u.id, u.name
AGGREGATE order_count: COUNT(o.id), total_spent: SUM(o.amount)
ORDER BY total_spent DESC
LIMIT 100
```

### Cross-Database Translation

**PostgreSQL** (Direct SQL):
```sql
SELECT u.id, u.name, COUNT(o.id) as order_count, SUM(o.amount) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id  
WHERE u.status = 'active' AND o.created_at > '2024-01-01'
GROUP BY u.id, u.name
ORDER BY total_spent DESC
LIMIT 100
```

**MongoDB** (Aggregation Pipeline):
```javascript
[
  { $lookup: { from: "orders", localField: "id", foreignField: "user_id", as: "orders" } },
  { $match: { status: "active", "orders.created_at": { $gt: "2024-01-01" } } },
  { $group: { _id: "$id", name: { $first: "$name" }, order_count: { $sum: 1 }, total_spent: { $sum: "$orders.amount" } } },
  { $sort: { total_spent: -1 } },
  { $limit: 100 }
]
```

**Redis** (Command Sequence):
```javascript
[
  { command: "SCAN", args: ["0", "MATCH", "users:*"] },
  { command: "HGETALL", args: ["users:{id}"] },
  // Additional filtering and processing commands
]
```

## 🛠️ Development Setup

### Prerequisites

- **Node.js 18+**
- **Docker & Docker Compose** (for database environment)
- **Git**

### Full Environment Setup

```bash
# Clone repository
git clone <repository-url>
cd QueryBridge

# Install Docker (if needed)
./install-docker.sh

# Start complete development environment
./start-dev-docker.sh
```

This will:
1. Install all dependencies (`npm install`)
2. Build the library (`cd lib && npm run build`)
3. Start all databases via Docker Compose
4. Start the backend server (port 3000)
5. Start the frontend development server (port 5000)
6. Open playground at `http://localhost:5000`

### Manual Setup (Advanced)

```bash
# Install dependencies
npm install

# Build library
cd lib
npm install
npm run build
cd ..

# Start databases only
docker compose up -d

# Start backend (separate terminal)
npm run dev

# Start frontend (separate terminal)
cd client
npm run dev
```

### Library Development Only

```bash
cd lib
npm install
npm run dev      # Watch mode
npm run test     # Run tests
npm run build    # Production build
```

## 🗄️ Database Environment

### Docker Services

The playground uses Docker Compose to provide a complete database testing environment:

| Service | Port | Purpose |
|---------|------|---------|
| **PostgreSQL** | 5432 | Primary SQL database with example data |
| **MongoDB** | 27017 | Document database with collections |
| **Elasticsearch** | 9200 | Search engine with indexed documents |
| **DynamoDB Local** | 8000 | AWS DynamoDB compatible interface |
| **Redis** | 6379 | In-memory data store with example keys |

### Connection Details

All databases are pre-configured with example datasets for testing:

```typescript
// Example connection configs (used in playground)
const connections = {
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'querybridge',
    username: 'postgres',
    password: 'postgres'
  },
  mongodb: {
    host: 'localhost',
    port: 27017,
    database: 'querybridge'
  },
  redis: {
    host: 'localhost',
    port: 6379
  }
  // ... other databases
}
```

### Sample Data

Each database includes sample datasets:
- **Users** - Customer/user records
- **Orders** - E-commerce order data
- **Products** - Product catalog
- **Analytics** - Event tracking data

## 🎮 Playground Features

### Query Editor
- **Syntax Highlighting** for UQL
- **Auto-completion** for keywords
- **Multi-line Support** with proper formatting
- **Query Validation** with error highlighting

### Translation Preview
- **Real-time Translation** to all database formats
- **Side-by-side Comparison** of translated queries
- **Copy-to-clipboard** functionality
- **Syntax highlighting** for each database type

### Execution Testing
- **Live Database Connections** to all supported databases
- **Query Result Visualization** with formatted JSON/table views
- **Performance Metrics** (execution time, row counts)
- **Error Handling** with detailed error messages

### Connection Management
- **Visual Connection Status** indicators
- **Connection Testing** with health checks
- **Database Setup Instructions** for each type
- **Connection Configuration** editing

## 🔧 Available Scripts

### Root Level Commands

```bash
npm run dev          # Start full development environment
npm run build        # Build both library and frontend
npm run test         # Run all tests
npm run check        # TypeScript checking
```

### Library Commands

```bash
cd lib
npm run build        # Build library
npm run dev          # Watch mode development
npm run test         # Run library tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Client Commands

```bash
cd client
npm run dev          # Start frontend dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

## 📊 Use Cases & Applications

### For Developers

**Multi-Database Applications**
```typescript
// Support multiple databases in one application
const userQuery = 'FIND users WHERE status = "active"'

const pgResult = await cm.executeQuery('postgres', userQuery)
const mongoResult = await cm.executeQuery('mongodb', userQuery)
const redisResult = await cm.executeQuery('redis', userQuery)
```

**Database Migration & Testing**
```typescript
// Test query compatibility across databases before migration
const complexQuery = `
  FIND orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE o.created_at > "2024-01-01"
  GROUP BY c.region
  AGGREGATE total: SUM(o.amount)
`

// Validate across all target databases
const translations = ['postgresql', 'mongodb', 'elasticsearch'].map(db => 
  cm.translateQuery(complexQuery, db)
)
```

**API Development**
```typescript
// Express.js API with database flexibility
app.post('/api/data', async (req, res) => {
  const { query, database = 'postgres' } = req.body
  
  try {
    const result = await cm.executeQuery(database, query)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})
```

### For Teams

**Database Abstraction Layer**
- Write application logic once, support multiple databases
- Easy database switching and A/B testing
- Simplified data access patterns

**Learning & Training**
- Understand query patterns across different databases
- Interactive playground for team training
- Visual comparison of database-specific syntax

**Documentation & Examples**
- Generate database-specific queries from universal syntax
- Maintain consistent query documentation
- Create portable query examples

## 🔒 Security & Production Considerations

### Query Validation
```typescript
// Always validate queries before execution
import { QueryParser } from 'universal-query-translator'

try {
  QueryParser.validate(userQuery)
  const result = await cm.executeQuery(database, userQuery)
} catch (error) {
  // Handle invalid queries
}
```

### Connection Security
- Use connection pooling for better performance
- Implement query timeouts
- Validate connection configurations
- Never expose database credentials in client code

### Performance Optimization
- Cache frequently used connections
- Implement query result caching
- Use appropriate LIMIT clauses
- Monitor query execution metrics

## 🐛 Troubleshooting

### Common Issues

**Docker Issues**
```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f [service-name]

# Restart services
docker compose restart

# Clean restart
docker compose down && docker compose up -d
```

**Library Issues**
```bash
# Rebuild library
cd lib && npm run build

# Run tests
cd lib && npm run test

# Check TypeScript errors
npm run check
```

**Development Issues**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Port conflicts
lsof -ti:5000 | xargs kill -9  # Kill process on port 5000
```

### Getting Help

1. **Check the documentation** in `lib/README.md` and `lib/DEVELOPER_GUIDE.md`
2. **Review test cases** in `lib/__tests__/` for usage examples
3. **Look at playground implementation** in `client/` and `server/`
4. **Create an issue** with reproduction steps

## 📚 Documentation Links

- **[📦 Library Usage Guide](./lib/README.md)** - Complete API documentation and examples
- **[🛠️ Library Developer Guide](./lib/DEVELOPER_GUIDE.md)** - Architecture and contribution guide
- **[🐳 Docker Setup Guide](./install-docker.sh)** - Database environment setup
- **[🔧 Development Scripts](./start-dev-docker.sh)** - Development environment automation

## 🤝 Contributing

We welcome contributions to both the library and playground! Please see:

1. **[Library Development Guide](./lib/DEVELOPER_GUIDE.md)** - For library contributions
2. **Create issues** for bugs or feature requests
3. **Submit pull requests** with clear descriptions
4. **Follow coding standards** established in the project

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make changes with appropriate tests
4. Ensure all tests pass (`npm run test`)
5. Update documentation as needed
6. Submit pull request with clear description

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🏆 Achievements & Features

- ✅ **Universal Query Language** - Single syntax for 5+ database types
- ✅ **Production Ready Library** - Full TypeScript support with comprehensive tests
- ✅ **Interactive Playground** - Visual testing environment with real databases
- ✅ **Docker Environment** - Complete database setup with example data
- ✅ **Comprehensive Documentation** - Detailed guides for all use cases
- ✅ **Framework Agnostic** - Works with any Node.js application
- ✅ **Type Safe** - Runtime validation with Zod schemas
- ✅ **Performance Focused** - Efficient translation and connection management

---

**Ready to transform your database architecture?** 

🚀 **Get Started**: [Library Documentation](./lib/README.md) | [Try the Playground](./start-dev-docker.sh)

📦 **Install Library**: `npm install universal-query-translator`

🎮 **Run Playground**: `./start-dev-docker.sh`