/**
 * Connection Manager for Universal Query Translator Library
 * 
 * This is the core library that accepts database connections by reference
 * from external applications. It handles query parsing, translation, and execution.
 */

import { QueryLanguage, DatabaseConnection, DatabaseType, ActiveConnection, QueryResult } from "./types";
import { QueryParser } from "./query-parser";
import { QueryTranslator } from "./query-translator";

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
        translatedQuery = QueryTranslator.toMongoDB(parsedQuery);
        break;
      case 'elasticsearch':
        translatedQuery = QueryTranslator.toElasticsearch(parsedQuery);
        break;
      case 'dynamodb':
        translatedQuery = QueryTranslator.toDynamoDB(parsedQuery);
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
  translateQuery(queryString: string, targetType: DatabaseType): string | object {
    const parsedQuery = QueryParser.parse(queryString);
    
    switch (targetType) {
      case 'postgresql':
        return QueryTranslator.toSQL(parsedQuery);
      case 'mongodb':
        return QueryTranslator.toMongoDB(parsedQuery);
      case 'elasticsearch':
        return QueryTranslator.toElasticsearch(parsedQuery);
      case 'dynamodb':
        return QueryTranslator.toDynamoDB(parsedQuery);
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

  /**
   * Execute translated query against the database client
   */
  private async executeTranslatedQuery(connection: ActiveConnection, query: string | object): Promise<QueryResult> {
    const { client, config } = connection;

    try {
      switch (config.type) {
        case 'postgresql':
          const pgResult = await client.query(query as string);
          return { 
            rows: pgResult.rows, 
            count: pgResult.rowCount,
            data: pgResult.rows 
          };

        case 'mongodb':
          // MongoDB execution logic would go here
          throw new Error('MongoDB execution not implemented');

        case 'elasticsearch':
          // Elasticsearch execution logic would go here
          throw new Error('Elasticsearch execution not implemented');

        case 'dynamodb':
          // DynamoDB execution logic would go here
          throw new Error('DynamoDB execution not implemented');

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