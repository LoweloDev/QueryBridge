# Universal Query Translator

## Overview

This is a comprehensive database query translation platform that allows users to write queries in a universal query language and translate them to multiple database formats (SQL, MongoDB, Elasticsearch, DynamoDB, and Redis). The application consists of a React frontend with a TypeScript backend and includes a standalone npm library for query translation functionality.

The platform provides a visual query playground where users can connect to multiple databases, write queries in a common syntax, see real-time translations, and execute queries across different database types. It's designed as both a developer tool and a library that can be integrated into other applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Complete Database Integration Success (January 2025)
- **OpenSearch Startup Success**: Resolved all OpenSearch 3.1.0 configuration issues and achieved successful startup on macOS systems
- **Database Connection Integration**: Fixed PostgreSQL connection configuration with proper environment variable handling and username mapping
- **Elasticsearch Client Compatibility**: Configured Elasticsearch client to work with OpenSearch by removing incompatible configuration options
- **Simplified Configuration Strategy**: Using minimal command-line parameters with environment variables for JVM options to avoid Java classpath issues
- **PostgreSQL Production Ready**: Successfully connecting to PostgreSQL with proper fallback to environment variables and local development settings
- **Dual Instance Architecture**: Both OpenSearch instances (PostgreSQL Layer port 9200, DynamoDB Layer port 9201) configured with separate cluster names and data directories
- **Cross-Platform Database Setup**: Database configuration works in both Replit environment (PostgreSQL via environment variables) and local development (all databases)
- **Memory Optimized**: Set OpenSearch heap sizes to 256MB per instance for efficient resource utilization in development environment
- **Development Environment Complete**: All database startup scripts functional for local macOS development with proper error handling and connectivity verification

### Final Production Milestone (January 2025)
- **COMPLETED 100% PRODUCTION LIBRARY**: All 146/146 tests passing with comprehensive TypeScript compilation success
- **Development Environment Improvements**: Enhanced start-dev.sh with comprehensive port cleanup, process checking to prevent duplicate database startups, improved error handling for connection failures, and cross-platform compatibility fixes
- **Environment Configuration**: Added .env.example for proper local development setup with clear PostgreSQL configuration guidelines  
- **Error Handling Enhancement**: Improved Redis connection error handling to prevent continuous connection attempts and better PostgreSQL environment variable validation
- **Database Process Management**: Added cleanup-ports.sh and stop-all-databases.sh scripts to handle port conflicts and process cleanup, fixing DynamoDB "Address already in use" errors
- **Server Binding Fixes**: Enhanced server startup with ENOTSUP error handling for macOS and proper fallback mechanisms  
- **Comprehensive Database Startup**: Refactored start-dev.sh to use dedicated database startup scripts with proper error handling, process checking, and connectivity verification
- **MongoDB Fork Issue Resolution**: Fixed MongoDB startup script to handle permission issues, port conflicts, and provide detailed error diagnostics with log output
- **MongoDB WiredTiger Corruption Auto-Fix**: Implemented automatic database repair and fresh initialization strategies for out-of-the-box functionality on macOS/Linux systems
- **Redis Stack Configuration Fix**: Enhanced Redis startup script to handle macOS configuration file path issues with absolute paths and fallback mechanisms
- **Redis Stack Path Spaces Issue Resolution**: Implemented configuration file approach to handle project paths containing spaces, with automatic fallback to basic Redis and clear guidance for enabling modules
- **Elasticsearch Installation Reality Check**: Acknowledged 2025 Homebrew Elasticsearch package maintenance issues and implemented practical solutions including OpenSearch as primary alternative, automatic local download fallback, and clear Docker/manual installation guidance for reliable development environment setup
- **Comprehensive Installation Script**: Created install.sh with step-by-step prerequisite installation, path validation, symbolic link creation, and detailed error handling for out-of-the-box functionality
- **Redis Startup Script Cleanup**: Completely rewritten Redis startup to properly detect path issues, provide clear solutions, and prevent broken configurations
- **Installation Script Fixes**: Fixed Redis Stack version detection errors, Elasticsearch installation failures, and consolidated installation scripts into single comprehensive install.sh
- **Database Startup Script Optimization**: Fixed hanging issues in Redis, MongoDB, and DynamoDB startup scripts with proper background process management and improved error detection
- **DynamoDB Schema Configuration Implemented**: Added configuration-based approach for custom partition/sort key names, eliminating hardcoded PK/SK assumptions
- **Extended Connection Types**: Updated DatabaseConnection interface to accept custom schema configuration
- **Flexible Key Mapping**: DynamoDB translator now uses configured schema instead of hardcoded values, maintaining backward compatibility
- **Inline Attribute Configuration Implemented**: Added `partition_key_attribute` and `sort_key_attribute` support allowing per-query override of connection-level schema configuration
- **Production Library Purification**: Removed all mock fallbacks from isolated library ensuring only real database connections work
- **Comprehensive Testing**: Created extensive test suite validating custom key names, fallback behavior, traditional table designs, and inline attribute overrides
- **Production-Grade Translation**: Simple, clean DynamoDB queries with configurable schema support and proper ProjectionExpression/FilterExpression
- **Library Architecture Finalized**: Comprehensive translation engine with flexible schema configuration across all 5 database types
- **Testing Platform Complete**: Fully functional query playground with real database connections and schema configuration support
- **Redis Enhancement Complete**: Fixed Redis query translation to generate comprehensive Redis Search queries instead of basic SCAN operations
- **Redis Stack Integration**: Enhanced installation script to support Redis Stack with RediSearch, RedisJSON, and RedisGraph modules
- **Query Translation Cleanup**: Removed invalid "note" field from Redis query output to ensure proper execution compatibility
- **TypeScript Compilation Fixed**: Resolved all Map iteration compatibility issues and Redis configuration incompatibilities for production deployment
- **Proper Error Handling Restored**: Fixed oversight where DynamoDB aggregation errors were incorrectly changed to return notes instead of throwing comprehensive errors
- **Test Suite Corrected**: Updated aggregation tests to properly expect error throwing for unsupported database features, maintaining production-quality error handling
- **Installation Validation Complete**: Created comprehensive test-installation.sh script confirming library build, functionality, and application compilation with all 148/148 tests passing
- Generated comprehensive library documentation with DEVELOPER_GUIDE.md and README.md
- Created repository README.md showcasing the complete project structure
- Documented NPM publishing workflow and development setup
- **Universal Query Language Production Ready**: Complete abstraction layer supporting 5 major database types with configurable schemas, zero mock dependencies, and full TypeScript compilation compatibility
- **NPM Package Integration Complete**: Fixed all imports to use packaged `universal-query-translator` npm library instead of local imports, with automated build/pack/install process in start-dev.sh for local development

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