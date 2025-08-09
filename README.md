# QueryBridge Monorepo

A comprehensive database query translation platform that intelligently transforms queries across multiple database technologies with advanced multi-database compatibility.

![Universal Query Translator](https://img.shields.io/badge/databases-5%2B-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)

## 🚀 What is Universal Query Translator?

This project provides both a **standalone NPM library** and a **visual testing platform** for translating database queries across multiple technologies. Write queries once in a universal syntax and execute them on PostgreSQL, MongoDB, Elasticsearch, DynamoDB, and Redis.

### Key Features

- **🔄 Universal Query Language** - Single syntax for all supported databases
- **📦 Standalone Library** - Production-ready NPM package for Node.js applications
- **🎮 Interactive Platform** - Visual query playground for testing and validation
- **🛡️ Type Safety** - Full TypeScript support with comprehensive type definitions
- **🔌 Framework Agnostic** - Works with any Node.js application or framework

## 🗂️ Project Structure

```
├── lib/            # Isolated library (npm package)
├── client/         # Playground UI
├── server/         # Playground backend
└── README.md       # Monorepo overview
```

## 📦 Library Docs

- Usage: see `lib/README.md`
- Developer guide: see `lib/DEVELOPER_GUIDE.md`

## 🎮 Interactive Testing Platform

A full-featured web application for testing query translations across multiple databases with real-time feedback.

### Features

- **Visual Query Editor** - Syntax highlighting and auto-completion
- **Real-time Translation** - See queries translated to all database formats instantly
- **Multi-Database Execution** - Test queries against actual database connections
- **Connection Management** - Easily manage multiple database connections
- **Query History** - Track and reuse previous queries
- **Export Capabilities** - Export translations for use in applications

### Live Demo

The platform provides a comprehensive interface for:

1. **Database Connections** - Connect to PostgreSQL, MongoDB, Elasticsearch, DynamoDB, Redis
2. **Query Writing** - Intuitive editor with universal query language support
3. **Translation Preview** - Real-time translation to all supported database formats
4. **Execution Testing** - Run queries against live databases to validate results
5. **Result Visualization** - Formatted display of query results and metadata

## 🔧 Current backend targets (library)

- PostgreSQL: emits SQL
- MongoDB: via SQL parsed by `@synatic/noql`
- OpenSearch/Elasticsearch: SQL endpoint
- DynamoDB: PartiQL-compatible SQL subset
- Redis: structured SCAN/GET plans

## 🌐 Universal Query Language

### Basic Syntax

```sql
FIND users
WHERE 
  age > 25 AND 
  status = "active" AND 
  created_at > "2023-01-01"
ORDER BY created_at DESC
LIMIT 50
```

### Advanced Features (SQL primary)

```sql
-- JOINs across databases
FIND users
LEFT JOIN orders ON users.id = orders.user_id
WHERE orders.total > 100

-- Aggregations
FIND sales
GROUP BY region, category
AGGREGATE 
  total_sales: SUM(amount),
  avg_order: AVG(order_value),
  customer_count: COUNT(DISTINCT customer_id)

-- Complex conditions
FIND products
WHERE 
  (category IN ["electronics", "computers"]) AND
  (price BETWEEN 100 AND 1000) AND
  (rating >= 4.0 OR reviews_count > 50)
```

## 🚀 Getting Started

### 1. Using the Library

For integrating query translation into your Node.js application:

```bash
npm install universal-query-translator
```

**📚 [Library Documentation →](./lib/README.md)**  
**🛠️ [Developer Guide →](./lib/DEVELOPER_GUIDE.md)**

### 2. Run the playground (Docker)

For testing and validating query translations:

```bash
# Install Docker prerequisites
./install-docker.sh

# Start databases and app using Docker
./start-dev-docker.sh
```

> Note: The Docker-based startup builds the local library and brings up all databases via docker-compose.

#### Troubleshooting (Docker)

If you encounter port conflicts or container issues:

```bash
docker compose ps
docker compose logs -f
docker compose restart <service>
```

**Common Issues:**
- **MongoDB WiredTiger corruption**: Automatically repaired or fresh database created. No manual intervention required.
- **MongoDB fork error**: Port conflicts or permission issues. Cleanup script resolves this.
- **Redis Stack configuration errors**: Automatic fallback to basic Redis if Redis Stack fails. Creates proper data directories.
- **Redis "No such file or directory"**: Fixed by using absolute paths and creating data directories before startup.
- **DynamoDB "Address already in use"**: Port 8000 conflict. Cleanup script kills existing processes.
- **Elasticsearch not starting**: Requires significant memory. May not work in constrained environments.

**Database Repair and Configuration:**

*MongoDB:*
1. Automatically detects WiredTiger corruption
2. Runs `--repair` if corruption found
3. Creates fresh database if repair fails
4. Ensures out-of-the-box functionality

*Redis Stack:*
1. Detects paths with spaces and provides solutions
2. Creates symbolic links automatically when requested
3. Falls back to basic Redis if Stack modules fail
4. Forces basic Redis mode if paths cannot be resolved

---------------------------------------------------------------------------

The platform will be available at `http://localhost:5000`.

### 3. Database Setup

The playground uses Docker; connection details are shown in `start-dev-docker.sh`.

## 🌟 Use Cases

### For Developers
- **Multi-database Applications** - Support multiple database types in single application
- **Database Migration** - Translate existing queries to new database platforms
- **Prototyping** - Quickly test query logic across different databases
- **Learning** - Understand how queries translate between database systems

### For Teams
- **Database Abstraction** - Write database-agnostic application logic
- **Testing & Validation** - Verify query behavior across multiple databases
- **Documentation** - Generate database-specific queries from universal syntax
- **Training** - Learn query patterns across different database technologies

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Library Development** - See [Developer Guide](./lib/DEVELOPER_GUIDE.md)
2. **Platform Features** - Create issues for new platform features
3. **Database Support** - Help extend support to additional databases
4. **Documentation** - Improve documentation and examples

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Update documentation
6. Submit a pull request

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- **📦 [NPM Package](https://npmjs.com/package/universal-query-translator)** (After publishing)
- **📚 [Library Documentation →](./lib/README.md)**
- **🛠️ [Developer Guide →](./lib/DEVELOPER_GUIDE.md)**
- **🐛 [Issue Tracker](https://github.com/your-username/universal-query-translator/issues)**
- **💬 [Discussions](https://github.com/your-username/universal-query-translator/discussions)**

## 🏆 Key Achievements

- **Universal Syntax** - Single query language for 5+ database types
- **Real Database Testing** - Validated against actual database instances
- **Developer Experience** - Intuitive API with excellent TypeScript support
- **Visual Platform** - Full-featured web interface for testing and validation
- **Comprehensive Documentation** - Complete guides for all use cases

---

**Ready to transform your database queries?** Start with the [Library Documentation](./lib/README.md) or try the interactive platform locally!