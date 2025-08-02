# QueryFlow - Universal Database Query Tool

## Overview

QueryFlow is a web-based database query tool that provides a unified interface for querying multiple database types through a common query language. The application features a React frontend with a Node.js/Express backend, supporting PostgreSQL, MongoDB, Redis, DynamoDB, and Elasticsearch databases. The core architecture centers around a universal query language that translates to database-specific queries, enabling users to work with different databases using consistent syntax.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS styling
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod schema validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with clean separation between routes and business logic
- **Core Library**: ConnectionManager service that handles database connections and query translation
- **Query Processing**: Two-stage approach with QueryParser for syntax parsing and QueryTranslator for database-specific translation

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM with schema-first approach
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Connection Pooling**: Neon serverless connection pooling for PostgreSQL

### External Database Integration
- **Multi-Database Support**: Connection manager supports PostgreSQL, MongoDB, Redis, DynamoDB, and Elasticsearch
- **Database Clients**: AWS SDK for DynamoDB, Elasticsearch official client, and standard drivers for other databases
- **Connection Management**: Centralized connection registry with health monitoring and automatic failover to mock databases

### Query Language Design
- **Universal Syntax**: Custom query language that abstracts database differences
- **Translation Layer**: Automatic conversion from universal syntax to database-specific queries (SQL, NoSQL, etc.)
- **Parser Architecture**: Recursive descent parser handling joins, aggregations, filtering, and sorting
- **Query Validation**: Syntax validation before translation and execution

### Authentication and Session Management
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **Connection Security**: Encrypted credential storage for database connections
- **Access Control**: Connection-based permissions with user isolation

### Development Tools and Configuration
- **Build System**: Vite for frontend bundling with hot module replacement
- **Type Safety**: Comprehensive TypeScript configuration across frontend and backend
- **Code Quality**: Shared types through workspace structure with path aliases
- **Development Server**: Integrated Vite middleware for seamless development experience

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL for primary application data storage
- **AWS DynamoDB**: NoSQL document database support via AWS SDK
- **Elasticsearch**: Full-text search and analytics engine
- **Redis**: In-memory data structure store for caching
- **MongoDB**: Document-oriented NoSQL database

### Cloud and Infrastructure
- **Replit Platform**: Development and hosting environment with integrated tools
- **Vite Plugins**: Replit-specific plugins for error handling and cartographer integration

### Frontend Libraries
- **UI Components**: Comprehensive Radix UI component library with accessibility features
- **Styling**: Tailwind CSS with custom design system and CSS variables
- **State Management**: TanStack Query for server state with optimistic updates
- **Form Handling**: React Hook Form with resolver pattern for validation

### Backend Libraries
- **Database**: Drizzle ORM with PostgreSQL adapter and Neon serverless driver
- **Authentication**: Session-based authentication with PostgreSQL session store
- **API Tools**: Express.js with middleware for logging, CORS, and request parsing
- **Development**: TSX for TypeScript execution and esbuild for production builds

### Development and Build Tools
- **TypeScript**: Strict type checking with comprehensive configuration
- **ESLint/Prettier**: Code formatting and linting (implied by TypeScript setup)
- **Vite**: Modern build tool with plugin ecosystem for development and production
- **Drizzle Kit**: Database migration and schema management tools