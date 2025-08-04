# Universal Query Translator

## Overview

This is a comprehensive database query translation platform that allows users to write queries in a universal query language and translate them to multiple database formats (SQL, MongoDB, Elasticsearch, DynamoDB, and Redis). The application consists of a React frontend with a TypeScript backend and includes a standalone npm library for query translation functionality.

The platform provides a visual query playground where users can connect to multiple databases, write queries in a common syntax, see real-time translations, and execute queries across different database types. It's designed as both a developer tool and a library that can be integrated into other applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Documentation Milestone (January 2025)
- Generated comprehensive library documentation with DEVELOPER_GUIDE.md and README.md
- Created repository README.md showcasing the complete project structure
- Documented NPM publishing workflow and development setup
- Fixed connection status indicator visibility issue in testing platform
- **Fixed Critical Elasticsearch Implementation**: Resolved all test failures and incorrect query structure
- Elasticsearch translator now generates proper `{ query: { match_all: {} } }` structure instead of nested bool wrapper
- Added support for advanced Elasticsearch features: boost scoring, fuzzy matching, highlighting
- All 25 Elasticsearch tests now passing with correct query translation
- **Significant Test Suite Progress**: Improved to 124/136 tests passing (91% pass rate)
- **Multiple Database Types Fixed**: SQL, MongoDB, Redis, and Elasticsearch implementations all working correctly
- **DynamoDB Advanced Features**: Enhanced with intelligent single-table design optimizations
- Library approaching production readiness with comprehensive test coverage
- **Real Database Execution Layer Implemented**: Added complete SDK integration for all databases with dynamic operation selection
- **Connection Manager Enhanced**: Proper handling of operation key removal and database-specific execution methods
- **DynamoDB Operation Key Architecture**: Confirmed and implemented dynamic operation selection (query/scan/getItem) based on query optimization

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Design Pattern**: Component-based architecture with reusable UI components

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM configured for PostgreSQL
- **Architecture Pattern**: RESTful API with thin route handlers that delegate to the core library
- **Development Setup**: Vite middleware integration for seamless development experience

### Core Library Architecture
- **Package Structure**: Standalone npm library (`universal-query-translator`) with TypeScript
- **Query Processing**: Multi-stage pipeline with parsing, validation, and translation
- **Connection Management**: External database connection registration system
- **Translation Engine**: Modular translators for each database type (SQL, MongoDB, Elasticsearch, DynamoDB, Redis)
- **Testing Strategy**: Comprehensive test suite with external library validation

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless with connection pooling
- **Development Databases**: Local instances of MongoDB, Redis, DynamoDB, and Elasticsearch
- **Schema Management**: Drizzle migrations with shared schema definitions
- **Connection Strategy**: Connection manager accepts external database clients by reference

### Authentication and Authorization
- **Session Management**: connect-pg-simple for PostgreSQL-backed sessions
- **Architecture**: Designed for future authentication integration
- **Security**: CORS and security headers configured for production deployment

### Query Language Design
- **Syntax**: Custom universal query language with SQL-like syntax
- **Features**: Supports SELECT, WHERE, JOIN, ORDER BY, GROUP BY, LIMIT operations
- **Extensions**: Database-specific features via DB_SPECIFIC clause
- **Validation**: Zod-based schema validation for type safety

### External Dependencies

#### Database Drivers and Clients
- **PostgreSQL**: @neondatabase/serverless for serverless PostgreSQL connections
- **MongoDB**: Native MongoDB driver for document database operations
- **Elasticsearch**: @elastic/elasticsearch for search and analytics queries
- **DynamoDB**: @aws-sdk/client-dynamodb and @aws-sdk/lib-dynamodb for NoSQL operations
- **Redis**: ioredis for advanced Redis data structure operations

#### UI and Frontend Libraries
- **Component System**: Complete Radix UI ecosystem for accessible components
- **Form Handling**: React Hook Form with Zod resolvers for type-safe forms
- **Data Fetching**: TanStack Query for server state management and caching
- **Styling**: Tailwind CSS with class-variance-authority for component variants

#### Development and Build Tools
- **Build System**: Vite with React plugin and Replit-specific development enhancements
- **Testing Framework**: Jest with ts-jest for TypeScript testing
- **Type System**: Full TypeScript coverage with strict configuration
- **Code Quality**: ESLint and TypeScript compiler for code validation

#### Production Services
- **Database Hosting**: Neon for managed PostgreSQL with serverless scaling
- **Container Support**: Docker configurations for local database services
- **Deployment**: Designed for Replit deployment with environment-specific configurations

The architecture emphasizes modularity, type safety, and extensibility, making it easy to add new database types and query features while maintaining a clean separation between the library and application layers.