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
    
    return results;
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
   * Execute translated query against the database client
   */
  private async executeTranslatedQuery(connection: ActiveConnection, query: string | object): Promise<QueryResult> {
    const { client, config } = connection;

    try {
      switch (config.type) {
        case 'postgresql':
          const pgResult = await client.query(query as string);
          return { rows: pgResult.rows, count: pgResult.rowCount };

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
          // Redis execution logic would go here
          throw new Error('Redis execution not implemented');

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