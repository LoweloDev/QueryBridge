/**
 * Connection Manager for QueryFlow
 * 
 * This is the core library that accepts database connections by reference
 * from external applications. It handles query parsing, translation, and execution.
 */

import type { Connection } from "@shared/schema";
import { QueryParser } from "./queryParser";
import { QueryTranslator } from "./queryTranslator";

interface ActiveConnection {
  client: any;
  config: Connection;
  isConnected: boolean;
}

export class ConnectionManager {
  private activeConnections: Map<string, ActiveConnection> = new Map();
  private connectionConfigs: Map<string, Connection> = new Map();

  /**
   * Register an external database connection
   * This is the main interface for host applications
   */
  registerConnection(connectionId: string, databaseClient: any, config: Connection): void {
    this.activeConnections.set(connectionId, {
      client: databaseClient,
      config,
      isConnected: true
    });
    
    this.connectionConfigs.set(connectionId, config);
    console.log(`Registered ${config.type} connection: ${config.name}`);
  }

  /**
   * Remove a registered connection
   */
  unregisterConnection(connectionId: string): void {
    this.activeConnections.delete(connectionId);
    this.connectionConfigs.delete(connectionId);
  }

  /**
   * Execute a query in universal query language
   * This is the main library interface - handles parsing, translation, and execution
   */
  async executeQuery(connectionId: string, universalQuery: string): Promise<any> {
    const activeConnection = this.activeConnections.get(connectionId);
    
    if (!activeConnection || !activeConnection.isConnected) {
      throw new Error(`No active connection found for ${connectionId}. Connection must be registered first.`);
    }

    // Parse the universal query
    const parsedQuery = QueryParser.parse(universalQuery);
    
    // Translate to database-specific format
    const translatedQuery = this.translateForDatabase(parsedQuery, activeConnection.config.type);
    
    // Execute on the registered database client
    return await this.executeOnConnection(activeConnection, translatedQuery);
  }

  /**
   * Translate query without executing (for preview/debugging)
   */
  async translateQuery(universalQuery: string, targetType: string): Promise<any> {
    const parsedQuery = QueryParser.parse(universalQuery);
    return this.translateForDatabase(parsedQuery, targetType);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(connectionId: string): { isConnected: boolean; type?: string } {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      return {
        isConnected: connection.isConnected,
        type: connection.config.type
      };
    }
    
    // Check if we have config but no active connection
    const config = this.connectionConfigs.get(connectionId);
    if (config) {
      return { isConnected: false, type: config.type };
    }
    
    return { isConnected: false };
  }

  /**
   * Clean up all connections
   */
  cleanup(): void {
    for (const [connectionId, connection] of this.activeConnections) {
      // Close connection if it has a close method
      if (connection.client && typeof connection.client.close === 'function') {
        connection.client.close();
      }
      this.connectionConfigs.delete(connectionId);
    }
  }

  /**
   * Internal method to translate parsed query to database-specific format
   */
  private translateForDatabase(parsedQuery: any, dbType: string): any {
    switch (dbType) {
      case 'postgresql':
      case 'mysql':
      case 'sql':
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
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }

  /**
   * Execute query on an actual database connection
   */
  private async executeOnConnection(connection: ActiveConnection, translatedQuery: any): Promise<any> {
    switch (connection.config.type) {
      case 'postgresql':
      case 'mysql':
        return await this.executeSQL(connection.client, translatedQuery);
      case 'mongodb':
        return await this.executeMongoDB(connection.client, translatedQuery);
      case 'redis':
        return await this.executeRedis(connection.client, translatedQuery);
      case 'dynamodb':
        return await this.executeDynamoDB(connection.client, translatedQuery);
      case 'elasticsearch':
        return await this.executeElasticsearch(connection.client, translatedQuery);
      default:
        throw new Error(`Unsupported database type: ${connection.config.type}`);
    }
  }

  private async executeSQL(client: any, query: any): Promise<any> {
    if (typeof query === 'string') {
      const result = await client.query(query);
      return { rows: result.rows };
    }
    
    if (query.sql) {
      const result = await client.query(query.sql);
      return { rows: result.rows };
    }
    
    throw new Error('Invalid SQL query format');
  }

  private async executeMongoDB(client: any, query: any): Promise<any> {
    if (query.collection && query.operation) {
      const collection = client.collection(query.collection);
      
      switch (query.operation) {
        case 'find':
          const cursor = collection.find(query.filter || {});
          if (query.projection) cursor.project(query.projection);
          if (query.sort) cursor.sort(query.sort);
          if (query.limit) cursor.limit(query.limit);
          return await cursor.toArray();
          
        case 'aggregate':
          return await collection.aggregate(query.pipeline).toArray();
          
        default:
          throw new Error(`Unsupported MongoDB operation: ${query.operation}`);
      }
    }
    
    throw new Error('Invalid MongoDB query format');
  }

  private async executeRedis(client: any, query: any): Promise<any> {
    if (query.operation) {
      switch (query.operation) {
        case 'get':
          return await client.get(query.key);
        case 'keys':
          return await client.keys(query.pattern || '*');
        case 'search':
          // For RedisSearch module
          return await client.ft.search(query.index, query.query);
        default:
          throw new Error(`Unsupported Redis operation: ${query.operation}`);
      }
    }
    
    throw new Error('Invalid Redis query format');
  }

  private async executeDynamoDB(client: any, query: any): Promise<any> {
    const { DynamoDBClient, ScanCommand, QueryCommand } = await import('@aws-sdk/client-dynamodb');
    
    if (query.operation === 'scan') {
      const command = new ScanCommand({
        TableName: query.TableName,
        FilterExpression: query.FilterExpression,
        ExpressionAttributeValues: query.ExpressionAttributeValues
      });
      return await client.send(command);
    }
    
    if (query.operation === 'query') {
      const command = new QueryCommand({
        TableName: query.TableName,
        KeyConditionExpression: query.KeyConditionExpression,
        ExpressionAttributeValues: query.ExpressionAttributeValues
      });
      return await client.send(command);
    }
    
    throw new Error('Invalid DynamoDB query format');
  }

  private async executeElasticsearch(client: any, query: any): Promise<any> {
    return await client.search({
      index: query.index,
      body: query.body
    });
  }
}