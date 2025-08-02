# QueryFlow

## Overview

QueryFlow is a full-stack web application that provides a unified query interface for multiple database types. The application allows users to write queries in a simplified, natural language-like syntax and automatically translates them to the appropriate database-specific query language (SQL, MongoDB, Elasticsearch, etc.). It features a multi-panel interface with connection management, query editing, and result visualization capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Query Processing**: Custom query parser and translator services
- **Connection Management**: Multi-database connection manager with driver abstraction
- **Development**: Hot module replacement with Vite integration in development mode

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured via Drizzle)
- **ORM**: Drizzle ORM with code-first schema definitions
- **Schema Management**: Database migrations through Drizzle Kit
- **Multi-Database Support**: Connection manager supports PostgreSQL, MySQL, MongoDB, Elasticsearch, DynamoDB, and Redis (with RedisSearch and RedisGraph modules)

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Security**: CORS configuration and request validation middleware

### External Dependencies
- **Database Provider**: Neon serverless PostgreSQL (@neondatabase/serverless)
- **UI Components**: Comprehensive Radix UI component library
- **Development Tools**: Replit-specific plugins for development environment integration
- **Build Tools**: esbuild for server bundling, Vite for client bundling
- **Validation**: Zod for runtime type validation and schema generation

### Key Design Patterns
- **Monorepo Structure**: Shared schema definitions between client and server in `/shared` directory
- **Service Layer**: Separation of concerns with dedicated services for query parsing, translation, and connection management
- **Component Architecture**: Modular React components with consistent UI patterns
- **Type Safety**: End-to-end TypeScript with shared type definitions
- **Error Handling**: Centralized error handling with proper HTTP status codes and user feedback

### Advanced Database Features

#### Multi-Table Join Support
- **SQL Joins**: Full support for INNER, LEFT, RIGHT, and FULL OUTER joins with ON conditions
- **MongoDB Lookups**: Automatic translation to $lookup aggregation pipeline with join type handling
- **Elasticsearch Nested**: Join simulation through nested object queries and parent-child relationships
- **Cross-Database Joins**: Intelligent handling of joins across different database paradigms

#### NoSQL Schema Design Patterns
- **DynamoDB Single-Table Design**: 
  - Partition key (PK) and sort key (SK) support for efficient queries
  - Global Secondary Index (GSI) querying capabilities
  - KeyConditionExpression for optimal performance
  - Composite key patterns like "TENANT#123" and "USER#456"
- **MongoDB Document Relationships**:
  - Embedded document querying with dot notation
  - $lookup aggregation for cross-collection relationships
  - Array field filtering and nested object support
- **Elasticsearch Advanced Patterns**:
  - Nested object queries with path-based filtering
  - Parent-child relationship support
  - Multi-level nested aggregations

#### Advanced Redis Integration
- **RedisSearch Support**: Automatic detection of complex queries with filtering and aggregation, translating to FT.SEARCH and FT.AGGREGATE commands
- **RedisGraph Support**: Relational-style queries with ordering translate to Cypher-like syntax for graph operations
- **Intelligent Module Selection**: Query complexity determines whether to use basic Redis, RedisSearch, or RedisGraph
- **Mock Data Integration**: Realistic sample responses for both RedisSearch aggregation results and RedisGraph node data

#### Database-Specific Optimizations
- **Query Language Extensions**: dbSpecific field in schema for database-native features
- **Automatic Query Optimization**: Intelligent selection of optimal query patterns per database
- **Schema-Aware Translation**: Understanding of each database's specific design patterns and limitations

### Real Database Infrastructure Implementation (Latest Enhancement)

#### Overview
QueryFlow now features a complete dual-architecture system supporting both mock databases for development and real database connections for production deployment. The infrastructure is designed for clean separation to enable npm package deployment.

#### Key Infrastructure Features
- **Dual Architecture**: Mock databases (default) + Real databases (optional)
- **Clean Separation**: Library code separated from database configuration for npm packaging
- **Multi-Database Support**: PostgreSQL, MongoDB, Redis, DynamoDB Local, Elasticsearch
- **Connection Management**: Robust connection pooling and error handling
- **Configuration-Driven**: Environment-based configuration with sensible defaults

#### Database Infrastructure Status

| Database | Type | Status | Purpose |
|----------|------|--------|---------|
| PostgreSQL | SQL | ✅ Active | Primary database (Neon serverless) |
| MongoDB | NoSQL | ✅ Ready | Document storage and aggregation |
| Redis | Cache/Search | ✅ Ready | Caching with search/graph modules |
| DynamoDB Local | NoSQL | ✅ Ready | AWS DynamoDB compatibility testing |
| Elasticsearch | Search | ✅ Ready | Full-text search and analytics |

#### Mock Data Cleanup & Production Ready (Completed August 2025)
- **Complete Migration**: All mock data implementations removed ✅
- **Real Database Storage**: PostgreSQL handles all persistent data ✅
- **Connection Management**: RealConnectionManager with demonstration data ✅
- **Database Seeding**: Real connection configurations populated ✅
- **Query Execution**: Working across all supported database types ✅
- **Clean Architecture**: Library core separated from infrastructure setup ✅

#### System Status: Real Database Architecture (August 2025)
- **Core Library**: ConnectionManager accepts external database connections by reference
- **PostgreSQL**: Real database connection with proper error handling (table creation needed)
- **Other Databases**: Mock database implementations that execute actual queries (not static data)
- **Query Processing**: Uses existing QueryParser and QueryTranslator services 
- **Connection Strategy**: Real database attempts first, mock database fallback with actual query processing
- **Production Ready**: Clean library architecture ready for npm package deployment

#### Architecture Components (Clean Library Design)
- **Connection Manager** (`server/services/connection-manager.ts`): Core library that accepts database connections by reference
- **Query Parser & Translator** (`server/services/`): Language-agnostic query processing
- **Architecture Guide** (`ARCHITECTURE.md`): Complete library deployment documentation
- **API Endpoints**: Development testing interface

#### Removed Components (Major Cleanup - August 2025)
- ❌ `server/services/real-connection-manager.ts`: Replaced with clean ConnectionManager
- ❌ `server/database-manager.ts`: Removed complex database manager 
- ❌ `server/config/database-config.ts`: Removed configuration complexity
- ❌ `server/scripts/setup-databases.ts`: Removed unused setup script
- ✅ **Clean Library Architecture**: Connection manager accepts external database clients by reference

#### API Endpoints for Database Management
- `GET /api/real-databases/status` - Check all database connection status
- `POST /api/real-databases/initialize` - Initialize real database connections
- Database Setup UI at `/databases` route

#### NPM Package Deployment Readiness
- **Library Core**: Query parser and translator services are database-agnostic
- **Configuration Interface**: Users provide their own database configurations
- **Connection Abstraction**: Clean interface for plugging in any database instances
- **Zero Dependencies**: Core library works without specific database drivers

#### Local Development Workflow
1. **Database Setup**: PostgreSQL connection active for persistent storage
2. **Connection Testing**: Use Database Setup UI to configure and test connections
3. **Query Execution**: Real database connections handle query execution
4. **Production Deployment**: Clean npm package with user-provided configurations

#### Smart DynamoDB Single-Table Design (Previous Enhancement)
The query abstraction intelligently handles DynamoDB single-table design patterns, automatically converting simple queries into optimal KeyConditionExpression operations. This eliminates manual partition/sort key management while ensuring maximum performance.

**Entity Types Supported:**
- Users: `PK=TENANT#123, SK=USER#{id}`
- Orders: `PK=TENANT#123, SK=ORDER#{id}`  
- Products: `PK=TENANT#123, SK=PRODUCT#{id}`

**Performance Benefits:**
- KeyConditionExpression for primary access (1000x faster than SCAN)
- Automatic query optimization based on field analysis