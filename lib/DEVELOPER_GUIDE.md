# Universal Query Translator - Developer Guide

## Overview

The Universal Query Translator is a standalone Node.js library that provides database-agnostic query translation capabilities. It accepts queries in a common query language and translates them to database-specific formats (SQL, MongoDB, Elasticsearch, DynamoDB, Redis).

## Project Structure

```
lib/
├── src/                          # Source code
│   ├── index.ts                  # Main exports
│   ├── connection-manager.ts     # Core connection management
│   ├── query-parser.ts          # Universal query parser
│   ├── query-translator.ts      # Database-specific translators
│   └── types.ts                 # TypeScript definitions
├── __tests__/                   # Test suites
│   ├── connection-manager.test.ts
│   ├── query-parser.test.ts
│   ├── query-translator-sql.test.ts
│   ├── query-translator-mongodb.test.ts
│   ├── query-translator-elasticsearch.test.ts
│   ├── query-translator-dynamodb.test.ts
│   └── query-translator-redis.test.ts
├── dist/                        # Compiled JavaScript (generated)
├── package.json                 # Package configuration
├── tsconfig.json               # TypeScript configuration
├── README.md                   # User documentation
└── DEVELOPER_GUIDE.md          # This file
```

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript 5.0+

### Installation

1. Clone the repository and navigate to the library directory:
```bash
cd lib/
```

2. Install dependencies:
```bash
npm install
```

3. Build the library:
```bash
npm run build
```

### Development Scripts

```bash
# Build the library (compile TypeScript to JavaScript)
npm run build

# Watch mode - rebuilds on file changes
npm run dev

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

## Architecture

### Core Components

1. **QueryParser** (`src/query-parser.ts`)
   - Parses universal query language strings into structured objects
   - Handles complex syntax including JOINs, WHERE clauses, aggregations
   - Supports both single-line and multi-line query formats

2. **QueryTranslator** (`src/query-translator.ts`)
   - Translates parsed queries to database-specific formats
   - Supports: PostgreSQL, MongoDB, Elasticsearch, DynamoDB, Redis
   - Each database has specialized translation logic

3. **ConnectionManager** (`src/connection-manager.ts`)
   - Manages external database connections passed by reference
   - Orchestrates parsing, translation, and execution
   - Provides the main library interface

4. **Types** (`src/types.ts`)
   - Comprehensive TypeScript definitions
   - Zod schemas for runtime validation
   - Database connection and query result interfaces

### Universal Query Language

The library uses a custom query language that abstracts database differences:

```sql
FIND users
WHERE 
  age > 25 AND 
  status = "active" AND 
  created_at > "2023-01-01"
ORDER BY created_at DESC
LIMIT 50
AGGREGATE 
  count: COUNT(*),
  avg_age: AVG(age),
  total_orders: SUM(order_count)
GROUP BY status
```

### Database Support Matrix

| Feature | PostgreSQL | MongoDB | Elasticsearch | DynamoDB | Redis |
|---------|------------|---------|---------------|----------|-------|
| Basic Queries | ✅ | ✅ | ✅ | ✅ | ✅ |
| WHERE Clauses | ✅ | ✅ | ✅ | ✅ | ✅ |
| JOINs | ✅ | ✅ | ✅ | ❌* | ❌ |
| Aggregations | ✅ | ✅ | ✅ | ❌ | ✅ |
| Full-text Search | ✅ | ✅ | ✅ | ❌ | ✅ |
| Geospatial | ❌ | ❌ | ✅ | ❌ | ✅ |

*DynamoDB uses single-table design patterns instead of JOINs

## Testing

### Test Structure

The library has comprehensive test coverage with dedicated test suites:

- **Unit Tests**: Each component has isolated tests
- **Integration Tests**: Real database connection tests (when available)
- **Translation Tests**: Verify correct query translation for each database
- **Parser Tests**: Validate query parsing accuracy

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- query-parser.test.ts

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Database Requirements

For full integration testing, the following databases should be available:
- PostgreSQL (localhost:5432)
- MongoDB (localhost:27017) 
- Elasticsearch (localhost:9200)
- Redis (localhost:6379)
- DynamoDB Local (localhost:8000)

Tests automatically fall back to mock implementations when real databases are unavailable.

## Building and Distribution

### Build Process

```bash
# Clean build
rm -rf dist/
npm run build
```

This generates:
- `dist/` - Compiled JavaScript files
- `dist/*.d.ts` - TypeScript declaration files
- `dist/*.js.map` - Source maps
- `dist/*.d.ts.map` - Declaration maps

### Package Configuration

Key `package.json` settings:

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/**/*",
    "README.md",
    "package.json"
  ]
}
```

## Publishing to NPM

### Prerequisites

1. NPM account with publishing permissions
2. Library built and tested
3. Version bumped in `package.json`

### Publishing Steps

1. **Prepare for Publishing**:
```bash
# Ensure clean build
npm run build

# Run all tests
npm test

# Verify package contents
npm pack --dry-run
```

2. **Login to NPM**:
```bash
npm login
```

3. **Version Management**:
```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major
```

4. **Publish**:
```bash
# Publish to NPM registry
npm publish

# For scoped packages (optional)
npm publish --access public
```

5. **Verify Publication**:
```bash
# Check package exists
npm view universal-query-translator

# Test installation
npm install universal-query-translator
```

### Publishing Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version bumped appropriately
- [ ] CHANGELOG.md updated (if exists)
- [ ] No sensitive information in published files
- [ ] Build artifacts in `dist/` are current
- [ ] `package.json` metadata is accurate

### Automated Publishing (CI/CD)

For automated publishing, set up GitHub Actions:

```yaml
name: Publish to NPM
on:
  release:
    types: [published]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Code Quality

### TypeScript Configuration

The project uses strict TypeScript settings:
- Strict mode enabled
- Full type checking
- Declaration file generation
- Source map generation

### Linting and Formatting

Recommended tools (not currently configured):
```bash
# Add ESLint and Prettier
npm install --save-dev eslint prettier @typescript-eslint/eslint-plugin

# Add pre-commit hooks
npm install --save-dev husky lint-staged
```

### Performance Considerations

- Connection pooling for database clients
- Query caching for repeated translations
- Lazy loading of database drivers
- Memory-efficient result processing

## Debugging

### Debug Mode

Enable debug logging:
```javascript
process.env.DEBUG = 'universal-query-translator:*'
```

### Common Issues

1. **Translation Errors**: Check query syntax against universal language spec
2. **Connection Issues**: Verify database clients are properly configured
3. **Type Errors**: Ensure all interfaces match expected schemas
4. **Performance**: Monitor query complexity and result set sizes

## Contributing

### Development Workflow

1. Create feature branch
2. Add tests for new functionality
3. Implement changes
4. Ensure all tests pass
5. Update documentation
6. Submit pull request

### Code Style

- Use TypeScript strict mode
- Follow functional programming patterns where possible
- Comprehensive error handling
- Descriptive variable and function names
- JSDoc comments for public APIs

## API Versioning

The library follows semantic versioning (SemVer):
- **Major**: Breaking changes to public API
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

Current version: 1.0.0

## Support and Maintenance

### Supported Node.js Versions
- Node.js 18+ (LTS)
- Compatible with ES2020+ features

### Database Driver Versions
- PostgreSQL: pg ^8.0.0
- MongoDB: mongodb ^6.0.0  
- Elasticsearch: @elastic/elasticsearch ^8.0.0
- DynamoDB: @aws-sdk/client-dynamodb ^3.0.0
- Redis: ioredis ^5.0.0

### Security

- Regular dependency updates
- No hardcoded credentials
- Input validation and sanitization
- SQL injection prevention