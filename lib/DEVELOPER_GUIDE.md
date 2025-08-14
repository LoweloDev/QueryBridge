# Universal Query Translator - Developer Guide

This guide covers contributing to and extending the `universal-query-translator` library.

## 🏗️ Architecture Overview

The library consists of three core components:

### Core Components

```
├── QueryParser      # Universal Query Language → AST
├── QueryTranslator  # AST → Database-specific queries
└── ConnectionManager # Runtime execution & connection handling
```

### Data Flow

```
UQL String → Parser → QueryLanguage AST → Translator → Database Query → Execution
```

## 📁 Repository Structure

```
lib/
├── src/
│   ├── query-parser.ts       # UQL parsing logic
│   ├── query-translator.ts   # Database-specific translation
│   ├── connection-manager.ts # Runtime execution & connections
│   ├── types.ts             # TypeScript definitions & Zod schemas
│   └── index.ts             # Public API exports
├── __tests__/               # Test suites
│   ├── query-parser.test.ts
│   ├── query-translator-*.test.ts
│   └── connection-manager.test.ts
├── dist/                    # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── README.md               # Usage documentation
└── DEVELOPER_GUIDE.md      # This file
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript knowledge

### Local Development

```bash
cd lib/
npm install
npm run dev      # Watch mode compilation
npm run test     # Run test suite
npm run build    # Production build
```

### Development Workflow

1. **Write tests first** - Add tests in `__tests__/` for new functionality
2. **Implement features** - Update parser/translator logic
3. **Update types** - Extend Zod schemas in `types.ts` if needed
4. **Test across targets** - Ensure compatibility with all database types
5. **Update documentation** - Keep README.md current

## 🔧 Core APIs

### QueryParser

**Purpose**: Parse Universal Query Language (UQL) into structured AST

```typescript
class QueryParser {
  static parse(queryString: string): QueryLanguage
  static validate(queryString: string): boolean
}
```

**Key Features**:
- Single-line and multi-line query support
- Field selection: `FIND users (name, email)`
- Schema support: `FIND public.users`
- Complex WHERE conditions with logical operators
- JOIN support (INNER, LEFT, RIGHT, FULL)
- Aggregation and GROUP BY
- ORDER BY with multiple fields
- LIMIT and OFFSET

### QueryTranslator

**Purpose**: Convert AST to database-specific queries

```typescript
class QueryTranslator {
  static toSQL(query: QueryLanguage): string
  static toRedis(query: QueryLanguage): RedisCommand[]
  // MongoDB/ES/DynamoDB use SQL as intermediate format
}
```

**Translation Strategy**:
- **PostgreSQL**: Direct SQL generation (primary target)
- **MongoDB**: SQL → @synatic/noql → MongoDB query
- **Elasticsearch**: SQL for SQL endpoint
- **DynamoDB**: PartiQL-compatible SQL subset
- **Redis**: Structured command plans

### ConnectionManager

**Purpose**: Runtime execution and connection lifecycle

```typescript
class ConnectionManager {
  registerConnection(id: string, client: any, config: DatabaseConnection): void
  executeQuery(connectionId: string, queryString: string): Promise<QueryResult>
  translateQuery(queryString: string, targetType: DatabaseType): TranslationResult
  listConnections(): DatabaseConnection[]
  getActiveConnections(): ActiveConnection[]
}
```

## 📊 Type System

### Core Types

```typescript
// Main query AST
interface QueryLanguage {
  operation: 'FIND'
  table: string
  subTable?: string        // Schema/database prefix
  fields?: string[]        // SELECT fields
  where?: WhereCondition[] // WHERE clauses
  joins?: JoinClause[]     // JOIN statements
  groupBy?: string[]       // GROUP BY fields
  aggregate?: AggregateFunction[] // Aggregation functions
  orderBy?: OrderByClause[]       // ORDER BY clauses
  limit?: number           // LIMIT value
  offset?: number          // OFFSET value
}

// Database connection configuration
interface DatabaseConnection {
  id: string
  name: string
  type: DatabaseType
  host: string
  port: number
  database: string
  // ... other connection details
}

// Execution result
interface QueryResult {
  success: boolean
  rows?: any[]
  error?: string
  metadata?: {
    executionTime: number
    rowCount: number
    translatedQuery: string
  }
}
```

### Validation

All types use Zod schemas for runtime validation:

```typescript
import { QueryLanguageSchema } from './types'

const validatedQuery = QueryLanguageSchema.parse(queryAst)
```

## 🎯 Adding New Features

### 1. Parser Extensions

To add new UQL syntax:

```typescript
// 1. Update types.ts with new schema properties
const NewFeatureSchema = z.object({
  newProperty: z.string().optional()
})

// 2. Extend QueryLanguageSchema
export const QueryLanguageSchema = BaseQuerySchema.extend({
  newProperty: NewFeatureSchema.optional()
})

// 3. Add parsing logic in query-parser.ts
if (upperLine.startsWith('NEW_KEYWORD ')) {
  result.newProperty = this.parseNewFeature(line)
}
```

### 2. Translator Extensions

To add support for new database features:

```typescript
// In query-translator.ts
static toSQL(query: QueryLanguage): string {
  // ... existing logic
  
  // Add new feature translation
  if (query.newProperty) {
    sql += ` ${this.translateNewFeature(query.newProperty)}`
  }
  
  return sql
}

private static translateNewFeature(feature: NewFeature): string {
  // Database-specific translation logic
}
```

### 3. Connection Manager Extensions

To add new database type support:

```typescript
// 1. Add to DatabaseType union in types.ts
export type DatabaseType = 'postgresql' | 'mongodb' | 'redis' | 'newdb'

// 2. Add execution logic in connection-manager.ts
async executeQueryForConnection(connectionId: string, queryString: string): Promise<QueryResult> {
  // ... existing logic
  
  case 'newdb':
    return this.executeNewDbQuery(connection.client, translatedQuery)
}

private async executeNewDbQuery(client: any, query: string): Promise<QueryResult> {
  // New database execution logic
}
```

## 🧪 Testing Strategy

### Test Structure

```
__tests__/
├── query-parser.test.ts           # Parser functionality
├── query-translator-sql.test.ts   # SQL translation
├── query-translator-mongodb.test.ts
├── query-translator-redis.test.ts
├── connection-manager.test.ts     # Runtime execution
└── integration/                   # End-to-end tests
```

### Writing Tests

```typescript
// Example test structure
describe('QueryParser', () => {
  describe('FIND operations', () => {
    it('should parse basic FIND query', () => {
      const query = 'FIND users WHERE status = "active"'
      const result = QueryParser.parse(query)
      
      expect(result.operation).toBe('FIND')
      expect(result.table).toBe('users')
      expect(result.where).toHaveLength(1)
    })
  })
})
```

### Test Categories

1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: Component interaction
3. **Translation Tests**: Query accuracy across all targets
4. **Edge Case Tests**: Error handling and invalid input

## 🔧 Debugging & Development Tools

### Debug Parser Output

```typescript
import { QueryParser } from './src/query-parser'

const query = 'FIND users WHERE status = "active"'
const ast = QueryParser.parse(query)
console.log(JSON.stringify(ast, null, 2))
```

### Translation Testing

```typescript
import { QueryTranslator } from './src/query-translator'

const sql = QueryTranslator.toSQL(ast)
const redis = QueryTranslator.toRedis(ast)
console.log({ sql, redis })
```

### Common Development Tasks

```bash
# Run specific test file
npm test -- query-parser.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Type checking
npm run check

# Build and check output
npm run build && ls -la dist/
```

## 📋 Coding Standards

### Code Style

- **Explicit typing**: Avoid `any` in public APIs
- **Descriptive names**: `parseWhereCondition` not `parseWhere`
- **Early returns**: Handle errors/edge cases first
- **Small functions**: Keep methods focused and testable
- **Consistent formatting**: Use project's prettier/eslint config

### Error Handling

```typescript
// Good: Explicit error handling
static parse(queryString: string): QueryLanguage {
  if (!queryString?.trim()) {
    throw new Error('Query string cannot be empty')
  }
  
  try {
    return this.parseInternal(queryString)
  } catch (error) {
    throw new Error(`Failed to parse query: ${error.message}`)
  }
}
```

### Performance Considerations

- **Parser tolerance**: Handle whitespace/formatting variations
- **Memory efficiency**: Avoid deep object nesting in AST
- **Lazy evaluation**: Don't execute queries during translation
- **Connection reuse**: Cache database connections when possible

## 🚀 Release Process

### Version Management

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features)
npm version minor

# Major release (breaking changes)
npm version major
```

### Pre-release Checklist

- [ ] All tests pass
- [ ] README.md updated
- [ ] Breaking changes documented
- [ ] dist/ folder built and verified
- [ ] Version bumped appropriately

### Publishing

```bash
# Build for production
npm run build

# Publish to registry
npm publish

# Tag release
git tag v1.x.x
git push origin --tags
```

## 🔄 Migration Guides

### Breaking Changes (v2.0.0+)

When introducing breaking changes:

1. **Document changes** in CHANGELOG.md
2. **Provide migration examples** for common use cases
3. **Update major version** following semver
4. **Consider deprecation warnings** before removal

### Example Migration

```typescript
// v1.x.x (deprecated)
const result = await cm.executeQuery('FIND users')

// v2.x.x (new API)
const result = await cm.executeQuery('connection-id', 'FIND users')
```

## 🤝 Contributing Guidelines

### Pull Request Process

1. **Fork repository** and create feature branch
2. **Add comprehensive tests** for new functionality
3. **Update documentation** (README.md, this guide)
4. **Follow coding standards** and pass all checks
5. **Write descriptive commit messages**
6. **Submit PR** with clear description

### Issue Reporting

- **Use issue templates** when available
- **Provide minimal reproduction** case
- **Include environment details** (Node version, database versions)
- **Check existing issues** before creating new ones

### Feature Requests

- **Describe use case** clearly
- **Consider backward compatibility**
- **Suggest implementation approach**
- **Discuss in issues** before starting work

## 📚 Learning Resources

### Understanding the Codebase

1. Start with `types.ts` to understand data structures
2. Read `query-parser.ts` for UQL syntax rules
3. Examine `query-translator.ts` for translation logic
4. Study `connection-manager.ts` for runtime behavior

### Database-Specific Knowledge

- **SQL**: Standard SQL syntax and variations
- **MongoDB**: Query operators and aggregation pipeline
- **Elasticsearch**: SQL API and query DSL
- **DynamoDB**: PartiQL syntax limitations
- **Redis**: Command structure and data types

### External Dependencies

- **Zod**: Schema validation and TypeScript inference
- **@synatic/noql**: SQL to MongoDB translation
- **Database clients**: pg, mongodb, @elastic/elasticsearch, etc.

---

**Ready to contribute?** Start by exploring the test suite to understand expected behavior, then pick an issue or feature to work on!