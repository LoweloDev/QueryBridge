import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const connections = pgTable("connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'postgresql', 'mysql', 'mongodb', 'elasticsearch', 'dynamodb', 'redis'
  host: text("host"),
  port: text("port"),
  database: text("database"),
  username: text("username"),
  password: text("password"),
  config: jsonb("config"), // Additional connection configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const queries = pgTable("queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  query: text("query").notNull(),
  targetType: text("target_type").notNull(),
  generatedQuery: text("generated_query"),
  connectionId: varchar("connection_id").references(() => connections.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const queryHistory = pgTable("query_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryId: varchar("query_id").references(() => queries.id),
  query: text("query").notNull(),
  results: jsonb("results"),
  executionTime: text("execution_time"),
  status: text("status").notNull(), // 'success', 'error'
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConnectionSchema = createInsertSchema(connections).pick({
  name: true,
  type: true,
  host: true,
  port: true,
  database: true,
  username: true,
  password: true,
  config: true,
  isActive: true,
});

export const insertQuerySchema = createInsertSchema(queries).pick({
  name: true,
  query: true,
  targetType: true,
  generatedQuery: true,
  connectionId: true,
});

export const insertQueryHistorySchema = createInsertSchema(queryHistory).pick({
  queryId: true,
  query: true,
  results: true,
  executionTime: true,
  status: true,
  error: true,
});

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;
export type InsertQuery = z.infer<typeof insertQuerySchema>;
export type Query = typeof queries.$inferSelect;
export type InsertQueryHistory = z.infer<typeof insertQueryHistorySchema>;
export type QueryHistory = typeof queryHistory.$inferSelect;

// Query language types with advanced features
const whereConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['=', '!=', '<', '>', '<=', '>=', 'IN', 'NOT IN', 'LIKE', 'ILIKE']),
  value: z.any(),
  logical: z.enum(['AND', 'OR', 'NOT']).optional(),
});

const orderBySchema = z.object({
  field: z.string(),
  direction: z.enum(['ASC', 'DESC']).default('ASC'),
});

const aggregateSchema = z.object({
  field: z.string(),
  function: z.enum(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']),
  alias: z.string().optional(),
});

// Join schema for multi-table operations
const joinSchema = z.object({
  type: z.enum(['INNER', 'LEFT', 'RIGHT', 'FULL']),
  table: z.string(),
  on: z.object({
    left: z.string(),  // left table field
    right: z.string(), // right table field
    operator: z.enum(['=', '!=', '>', '<', '>=', '<=']).default('='),
  }),
  alias: z.string().optional(),
});

// DynamoDB-specific schema patterns
const dynamoDbKeySchema = z.object({
  partitionKey: z.string(),
  sortKey: z.string().optional(),
  gsiName: z.string().optional(),
  keyCondition: z.object({
    pk: z.string(),
    sk: z.string().optional(),
    skPrefix: z.string().optional(), // Support for sort key prefix queries
  }).optional(),
});

// MongoDB-specific schema patterns
const mongoDbSchema = z.object({
  collection: z.string(),
  pipeline: z.array(z.record(z.any())).optional(), // aggregation pipeline
  lookup: z.object({
    from: z.string(),
    localField: z.string(),
    foreignField: z.string(),
    as: z.string(),
  }).optional(),
  arrayFilters: z.array(z.record(z.any())).optional(),
});

// Elasticsearch nested query schema
const elasticsearchNestedSchema = z.object({
  path: z.string(),
  query: z.record(z.any()),
  scoreMode: z.enum(['avg', 'sum', 'max', 'min', 'none']).optional(),
});

// Database-specific configurations
const databaseSpecificSchema = z.object({
  // Legacy support for simple key-value pairs
  partition_key: z.string().optional(),
  sort_key: z.string().optional(),
  sort_key_prefix: z.string().optional(), // New: support for sort key prefix queries
  // New structured format
  dynamodb: dynamoDbKeySchema.optional(),
  mongodb: mongoDbSchema.optional(),
  elasticsearch: z.object({
    nested: elasticsearchNestedSchema.optional(),
    parentChild: z.object({
      type: z.string(),
      relation: z.string(),
    }).optional(),
  }).optional(),
});

export const QueryLanguageSchema = z.object({
  operation: z.enum(['FIND', 'INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  fields: z.array(z.string()).optional(),
  where: z.array(whereConditionSchema).optional(),
  orderBy: z.array(orderBySchema).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  aggregate: z.array(aggregateSchema).optional(),
  groupBy: z.array(z.string()).optional(),
  having: z.array(whereConditionSchema).optional(),
  // New advanced features
  joins: z.array(joinSchema).optional(),
  dbSpecific: databaseSpecificSchema.optional(),
});

export type QueryLanguage = z.infer<typeof QueryLanguageSchema>;
