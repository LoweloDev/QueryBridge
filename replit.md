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