/**
 * Connection Manager for Universal Query Translator Library
 *
 * This is the core library that accepts database connections by reference
 * from external applications. It handles query parsing, translation, and execution.
 */

import { QueryLanguage, DatabaseConnection, DatabaseType, ActiveConnection, QueryResult } from "./types";
import { QueryParser } from "./query-parser";
import { QueryTranslator } from "./query-translator";
import { ExecuteStatementCommand } from "@aws-sdk/lib-dynamodb";
import SQLParser from "@synatic/noql";

export class ConnectionManager {
  private activeConnections: Map<string, ActiveConnection> = new Map();
  private connectionConfigs: Map<string, DatabaseConnection> = new Map();

  /**
   * Register an external database connection
   * This is the main interface for host applications
   */
  registerConnection(connectionId: string, databaseClient: any, config: DatabaseConnection): void {
    this.activeConnections.set(connectionId, {
      client: databaseClient,
      config,
      isConnected: true,
      lastUsed: new Date()
    });

    this.connectionConfigs.set(connectionId, config);
    console.log(`Registered ${config.type} connection: ${config.name}`);
  }

  /**
   * Execute a universal query against a registered connection
   */
  async executeQuery(connectionId: string, queryString: string): Promise<QueryResult> {
    const connection = this.activeConnections.get(connectionId);

    if (!connection) {
      throw new Error(`No active connection found for ID: ${connectionId}`);
    }

    // Parse the universal query
    const parsedQuery = QueryParser.parse(queryString);

    // Translate to database-specific format
    let translatedQuery: string | object;

    switch (connection.config.type) {
      case 'postgresql':
        translatedQuery = QueryTranslator.toSQL(parsedQuery);
        break;
      case 'mongodb':
        // Use @synatic/noql for MongoDB translation
        // First convert universal query to SQL, then parse with @synatic/noql
        const sqlQuery = QueryTranslator.toSQL(parsedQuery);
        translatedQuery = SQLParser.parseSQL(sqlQuery);

        console.log("MONGO QUERY", translatedQuery);
        break;
      case 'elasticsearch':
        // Use SQL for Elasticsearch SQL endpoint
        translatedQuery = QueryTranslator.toSQL(parsedQuery);
        break;
      case 'dynamodb':
        // Use SQL for DynamoDB PartiQL
        translatedQuery = QueryTranslator.toSQL(parsedQuery);
        break;
      case 'redis':
        translatedQuery = QueryTranslator.toRedis(parsedQuery);
        break;
      default:
        throw new Error(`Unsupported database type: ${connection.config.type}`);
    }

    // Execute the translated query
    const results = await this.executeTranslatedQuery(connection, translatedQuery);

    // Update last used time
    connection.lastUsed = new Date();

    // Add translation metadata to results
    return {
      ...results,
      success: true,
      translatedQuery,
      originalQuery: queryString
    };
  }

  /**
   * Get active connections (for testing/monitoring)
   */
  getActiveConnections(): Map<string, ActiveConnection> {
    return this.activeConnections;
  }

  /**
   * Get connection configurations (for testing/monitoring)
   */
  getConnectionConfigs(): Map<string, DatabaseConnection> {
    return this.connectionConfigs;
  }

  /**
   * Translate a query without executing it
   */
  translateQuery(queryString: string, targetType: DatabaseType, connectionId?: string): string | object {
    const parsedQuery = QueryParser.parse(queryString);

    // Get schema configuration for DynamoDB if connection ID is provided
    let schemaConfig;
    if (targetType === 'dynamodb' && connectionId) {
      const connectionConfig = this.connectionConfigs.get(connectionId);
      schemaConfig = connectionConfig?.dynamodb;
    }

    switch (targetType) {
      case 'postgresql':
        return QueryTranslator.toSQL(parsedQuery);
      case 'mongodb':
        // Use @synatic/noql for MongoDB translation
        // First convert universal query to SQL, then parse with @synatic/noql
        const sqlQuery = QueryTranslator.toSQL(parsedQuery);
        return SQLParser.parseSQL(sqlQuery);
      case 'elasticsearch':
        // Use SQL for Elasticsearch SQL endpoint
        return QueryTranslator.toSQL(parsedQuery);
      case 'dynamodb':
        // Use SQL for DynamoDB PartiQL
        return QueryTranslator.toSQL(parsedQuery);
      case 'redis':
        return QueryTranslator.toRedis(parsedQuery);
      default:
        throw new Error(`Unsupported target type: ${targetType}`);
    }
  }

  /**
   * List all registered connections
   */
  listConnections(): DatabaseConnection[] {
    return Array.from(this.connectionConfigs.values());
  }

  /**
   * Remove a connection
   */
  removeConnection(connectionId: string): void {
    this.activeConnections.delete(connectionId);
    this.connectionConfigs.delete(connectionId);
  }

  /**
   * Check if a connection is healthy (for testing/monitoring)
   */
  isConnectionHealthy(connectionId: string): boolean {
    const connection = this.activeConnections.get(connectionId);
    return connection ? connection.isConnected : false;
  }

  private restrictQueryToScope(query: string, scope?: { [key: string]: any }): string {
    if (!scope) return query;

    const parsedQuery = QueryParser.parse(query);
    if (scope) {
      parsedQuery.where = parsedQuery.where?.map((condition: any) => {
        if (condition.column in scope) {
          return {
            ...condition,
            value: scope[condition.column]
          };
        }
        return condition;
      });
    }
    return QueryTranslator.toSQL(parsedQuery);
  }

  /**
   * Execute translated query against the database client
   */
  private async executeTranslatedQuery(connection: ActiveConnection, query: string | object, scope?: { [key: string]: any }): Promise<QueryResult> {
    const { client, config } = connection;

    try {
      switch (config.type) {
        case 'postgresql':
          const pgResult = await client.query(this.restrictQueryToScope(query as string, scope));
          return {
            rows: pgResult.rows,
            count: pgResult.rowCount,
            data: pgResult.rows
          };

        case 'mongodb':
          // Execute MongoDB query using @synatic/noql
          const mongoQuery = query as any;
          let mongoResult: any;

          // Get the database and collection using proper MongoDB driver pattern
          const db = client.db(config.database || 'test');

          if (mongoQuery.type === 'query') {
            const collection = db.collection(mongoQuery.collection);
            mongoResult = await collection
              .find(mongoQuery.query || {}, mongoQuery.projection || {})
              .limit(mongoQuery.limit || 50)
              .toArray();
          } else if (mongoQuery.type === 'aggregate') {
            const collection = db.collection(mongoQuery.collections[0]);
            mongoResult = await collection.aggregate(mongoQuery.pipeline).toArray();
          } else {
            throw new Error(`Unsupported MongoDB query type: ${mongoQuery.type}`);
          }

          return {
            rows: mongoResult,
            count: mongoResult.length,
            data: mongoResult
          };

        case 'elasticsearch':
          // Execute SQL query using Elasticsearch SQL translate and execute
          const sqlQuery = this.restrictQueryToScope(query as string, scope);

          // If connection has a default index configured, use it
          // parse sql query and extend where condition to restrict to scope given scope variable

          console.log("PARSED QUERY EXTENDED", sqlQuery);

          let finalQuery = sqlQuery;
          // if (config.indexName && !sqlQuery.includes('FROM')) {
          //   // Extract the table name and replace with index
          //   const tableMatch = sqlQuery.match(/FROM\s+(\w+)/);
          //   if (tableMatch) {
          //     finalQuery = sqlQuery.replace(tableMatch[1], config.indexName);
          //   }
          // }

          // Execute the query
          const esResult = await client.transport.request({
            method: 'POST',
            path: '/_sql',
            body: {
              query: finalQuery
            }
          });

          return {
            rows: esResult.rows || [],
            count: esResult.rows?.length || 0,
            data: esResult.rows || []
          };

        case 'dynamodb':
          // Execute SQL query using DynamoDB PartiQL
          let dynamoQuery = this.restrictQueryToScope(query as string, scope);

          // If connection has a default table configured and query doesn't specify a table, use the configured table
          if (config.database && !dynamoQuery.includes('FROM')) {
            // This means the query is something like "SELECT * WHERE ..." without a FROM clause
            // We need to add the default table
            const whereMatch = dynamoQuery.match(/WHERE\s+(.+)/);
            if (whereMatch) {
              dynamoQuery = `SELECT * FROM ${config.database} WHERE ${whereMatch[1]}`;
            } else {
              dynamoQuery = `SELECT * FROM ${config.database}`;
            }
          }

          const dynamoResult = await client.send(new ExecuteStatementCommand({
            Statement: dynamoQuery,
          }));

          return {
            rows: dynamoResult.Items || (dynamoResult.Item ? [dynamoResult.Item] : []),
            count: dynamoResult.Count || (dynamoResult.Item ? 1 : 0),
            data: dynamoResult.Items || (dynamoResult.Item ? [dynamoResult.Item] : [])
          };

        case 'redis':
          // Execute Redis query based on operation type
          const redisQuery = query as any;
          let redisResult: any;

          switch (redisQuery.operation) {
            case 'SCAN':
              redisResult = await client.scan(0, 'MATCH', redisQuery.pattern, 'COUNT', redisQuery.count || 1000);
              return { rows: redisResult[1], count: redisResult[1].length, data: redisResult[1] };

            case 'GET':
              redisResult = await client.get(redisQuery.key);
              return { rows: redisResult ? [redisResult] : [], count: redisResult ? 1 : 0, data: redisResult ? [redisResult] : [] };

            case 'MGET':
              redisResult = await client.mget(...redisQuery.keys);
              const filteredResults = redisResult.filter((r: any) => r !== null);
              return { rows: filteredResults, count: filteredResults.length, data: filteredResults };

            case 'HGETALL':
              redisResult = await client.hgetall(redisQuery.key);
              return { rows: [redisResult], count: 1, data: [redisResult] };

            case 'FT.SEARCH':
              // Note: This requires RediSearch module
              try {
                redisResult = await client.call('FT.SEARCH', redisQuery.index, redisQuery.query, 'LIMIT', redisQuery.limit?.offset || 0, redisQuery.limit?.num || 10);
                return { rows: redisResult.slice(1), count: redisResult[0], data: redisResult.slice(1) };
              } catch (error: any) {
                throw new Error(`RediSearch not available: ${error.message}`);
              }

            default:
              return { rows: [], count: 0, data: [] };
          }

        default:
          throw new Error(`Unsupported database type: ${config.type}`);
      }
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Clean up all connections
   */
  cleanup(): void {
    this.activeConnections.forEach((connection, connectionId) => {
      // Close connection if it has a close method
      if (connection.client && typeof connection.client.close === 'function') {
        connection.client.close();
      }
      this.connectionConfigs.delete(connectionId);
    });
    this.activeConnections.clear();
  }
}
