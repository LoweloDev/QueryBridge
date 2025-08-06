import { z } from 'zod';

// Core query language schema
export const QueryLanguageSchema = z.object({
  operation: z.enum(['FIND', 'INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  index: z.string().optional(), // For explicit index specification
  fields: z.array(z.string()).optional(),
  where: z.array(z.object({
    field: z.string(),
    operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'LIKE', 'ILIKE']),
    value: z.any(),
    logical: z.enum(['AND', 'OR']).optional(),
  })).optional(),
  joins: z.array(z.object({
    type: z.enum(['INNER', 'LEFT', 'RIGHT', 'FULL']),
    table: z.string(),
    alias: z.string().optional(),
    on: z.object({
      left: z.string(),
      operator: z.string(),
      right: z.string(),
    }),
  })).optional(),
  orderBy: z.array(z.object({
    field: z.string(),
    direction: z.enum(['ASC', 'DESC']),
  })).optional(),
  groupBy: z.array(z.string()).optional(),
  having: z.array(z.object({
    field: z.string(),
    operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'LIKE', 'ILIKE']),
    value: z.any(),
    logical: z.enum(['AND', 'OR']).optional(),
  })).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  aggregate: z.array(z.object({
    function: z.enum(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']),
    field: z.string(),
    alias: z.string().optional(),
  })).optional(),
  dbSpecific: z.record(z.any()).optional(),
});

export type QueryLanguage = z.infer<typeof QueryLanguageSchema>;

// Database connection types
export type DatabaseType = 'postgresql' | 'mongodb' | 'elasticsearch' | 'dynamodb' | 'redis';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  region?: string; // For DynamoDB
  accessKeyId?: string; // For DynamoDB
  secretAccessKey?: string; // For DynamoDB
  indexName?: string; // For Elasticsearch
  // DynamoDB schema configuration
  dynamodb?: {
    partitionKey?: string;  // e.g., "id", "userId", "pk"
    sortKey?: string;       // e.g., "sk", "createdAt", "timestamp"
    // Add GSI configuration if needed in future
    globalSecondaryIndexes?: Array<{
      name: string;
      partitionKey: string;
      sortKey?: string;
    }>;
  };
}

export interface ActiveConnection {
  client: any;
  config: DatabaseConnection;
  isConnected: boolean;
  lastUsed: Date;
}

export interface QueryResult {
  rows?: any[];
  data?: any;
  count?: number;
  metadata?: any;
  success?: boolean;
  translatedQuery?: string | object;
  originalQuery?: string;
}

export interface TranslationResult {
  originalQuery: string;
  translatedQuery: string | object;
  targetType: DatabaseType;
}

// Error types
export class QueryParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryParsingError';
  }
}

export class QueryTranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryTranslationError';
  }
}

export class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}