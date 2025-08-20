import { z } from 'zod';

// Database concept mappings based on the standardized table
export const DATABASE_CONCEPT_MAPPINGS = {
  postgresql: {
    table: 'table',
    subTable: 'schema',
    example: 'FIND public.users'
  },
  mongodb: {
    table: 'collection',
    subTable: 'database',
    example: 'FIND test.users'
  },
  elasticsearch: {
    table: 'index',
    subTable: 'alias',
    example: 'FIND logs.2024'
  },
  dynamodb: {
    table: 'table',
    subTable: 'index',
    example: 'FIND users.user_id_idx'
  },
  redis: {
    table: 'key',
    subTable: 'database',
    example: 'FIND user:123'
  }
} as const;

// Core query language schema - simplified without dbSpecific
export const QueryLanguageSchema = z.object({
  operation: z.enum(['FIND', 'INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  subTable: z.string().optional(), // For schema/database/alias/index specification
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
  // Removed aggregate field - aggregation now handled through fields with SQL syntax
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
      partitionKey?: string;
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

// TypeScript template literal types for UQL syntax validation
export type UQLKeyword =
  | 'FIND'
  | 'FIELDS'
  | 'WHERE'
  | 'JOIN'
  | 'LEFT JOIN'
  | 'RIGHT JOIN'
  | 'INNER JOIN'
  | 'FULL JOIN'
  | 'GROUP BY'
  | 'HAVING'
  | 'ORDER BY'
  | 'LIMIT'
  | 'OFFSET';

export type UQLOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'IN'
  | 'NOT IN'
  | 'LIKE'
  | 'ILIKE'
  | 'BETWEEN';

export type UQLLogical = 'AND' | 'OR';

export type UQLDirection = 'ASC' | 'DESC';

export type UQLAggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

// Template literal type for basic UQL structure validation
export type UQLQuery = `FIND ${string}` | `FIND ${string} FIELDS ${string}` | `FIND ${string} WHERE ${string}`;

// Helper type for UQL syntax validation in development
export interface UQLSyntaxHelper {
  /**
   * Use this to get TypeScript IntelliSense for UQL queries
   * @example
   * const query: UQLSyntax = 'FIND users WHERE status = "active" ORDER BY created_at DESC LIMIT 10'
   */
  query: string;

  /**
   * Available UQL keywords
   */
  keywords: UQLKeyword[];

  /**
   * Available comparison operators
   */
  operators: UQLOperator[];

  /**
   * Available logical operators
   */
  logical: UQLLogical[];

  /**
   * Available sort directions
   */
  directions: UQLDirection[];

  /**
   * Available aggregate functions (use in FIELDS clause)
   */
  aggregates: UQLAggregateFunction[];
}

// Query input types - supporting both string and parsed queries
export type QueryInput = string | QueryLanguage;

/**
 * Type guard to check if input is a string query
 */
export function isStringQuery(input: QueryInput): input is string {
  return typeof input === 'string';
}

/**
 * Type guard to check if input is a parsed QueryLanguage object
 */
export function isQueryLanguageObject(input: QueryInput): input is QueryLanguage {
  return typeof input === 'object' && input !== null && 'operation' in input;
}

// Runtime syntax validation helper
export class UQLSyntaxValidator {
  private static readonly KEYWORDS: UQLKeyword[] = [
    'FIND', 'FIELDS', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'INNER JOIN', 'FULL JOIN', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET'
  ];

  private static readonly OPERATORS: UQLOperator[] = [
    '=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'LIKE', 'ILIKE', 'BETWEEN'
  ];

  private static readonly LOGICAL: UQLLogical[] = ['AND', 'OR'];

  private static readonly DIRECTIONS: UQLDirection[] = ['ASC', 'DESC'];

  private static readonly AGGREGATES: UQLAggregateFunction[] = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

  /**
   * Validate if a string contains valid UQL syntax elements
   */
  static validateBasicSyntax(query: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const upperQuery = query.toUpperCase();

    // Must start with FIND
    if (!upperQuery.trim().startsWith('FIND ')) {
      errors.push('Query must start with FIND keyword');
    }

    // Check for invalid keywords
    const words = upperQuery.split(/\s+/);
    for (const word of words) {
      if (word.endsWith(':') || word.includes('AGGREGATE')) {
        errors.push(`Invalid keyword "${word}". Use SQL-style aggregation in FIELDS instead of AGGREGATE`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get IntelliSense suggestions for UQL keywords
   */
  static getKeywordSuggestions(context: string): string[] {
    const upperContext = context.toUpperCase();

    if (!upperContext.includes('FIND')) {
      return ['FIND'];
    }

    const suggestions: string[] = [];

    if (!upperContext.includes('FIELDS') && !upperContext.includes('WHERE')) {
      suggestions.push('FIELDS');
    }

    if (!upperContext.includes('WHERE')) {
      suggestions.push('WHERE');
    }

    if (!upperContext.includes('GROUP BY')) {
      suggestions.push('GROUP BY');
    }

    if (!upperContext.includes('ORDER BY')) {
      suggestions.push('ORDER BY');
    }

    if (!upperContext.includes('LIMIT')) {
      suggestions.push('LIMIT');
    }

    return suggestions;
  }

  /**
   * Create a syntax helper object for development
   */
  static createHelper(): UQLSyntaxHelper {
    return {
      query: '',
      keywords: [...this.KEYWORDS],
      operators: [...this.OPERATORS],
      logical: [...this.LOGICAL],
      directions: [...this.DIRECTIONS],
      aggregates: [...this.AGGREGATES]
    };
  }
}