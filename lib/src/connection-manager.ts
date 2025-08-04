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
          return await this.executeMongoDB(client, query as any);

        case 'elasticsearch':
          return await this.executeElasticsearch(client, query as any);

        case 'dynamodb':
          return await this.executeDynamoDB(client, query as any);

        case 'redis':
          return await this.executeRedis(client, query as any);

        default:
          throw new Error(`Unsupported database type: ${config.type}`);
      }
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Execute MongoDB query using the native MongoDB driver
   */
  private async executeMongoDB(client: any, mongoQuery: any): Promise<QueryResult> {
    const { collection, operation, ...queryParams } = mongoQuery;
    const db = client.db();
    const coll = db.collection(collection);

    let result: any;
    let resultArray: any[] = [];

    switch (operation) {
      case 'find':
        result = await coll.find(queryParams.filter || {}, queryParams.options || {}).toArray();
        resultArray = result;
        break;

      case 'findOne':
        result = await coll.findOne(queryParams.filter || {}, queryParams.options || {});
        resultArray = result ? [result] : [];
        break;

      case 'aggregate':
        result = await coll.aggregate(queryParams.pipeline || []).toArray();
        resultArray = result;
        break;

      case 'countDocuments':
        result = await coll.countDocuments(queryParams.filter || {});
        resultArray = [{ count: result }];
        break;

      case 'distinct':
        result = await coll.distinct(queryParams.field, queryParams.filter || {});
        resultArray = result.map((value: any) => ({ [queryParams.field]: value }));
        break;

      default:
        throw new Error(`Unsupported MongoDB operation: ${operation}`);
    }

    return {
      rows: resultArray,
      count: resultArray.length,
      data: resultArray
    };
  }

  /**
   * Execute Elasticsearch query using the official Elasticsearch client
   */
  private async executeElasticsearch(client: any, esQuery: any): Promise<QueryResult> {
    const { index, operation = 'search', ...queryParams } = esQuery;

    let result: any;
    let resultArray: any[] = [];

    switch (operation) {
      case 'search':
        result = await client.search({
          index,
          body: queryParams
        });
        
        resultArray = result.body?.hits?.hits?.map((hit: any) => ({
          _id: hit._id,
          _source: hit._source,
          _score: hit._score
        })) || [];
        break;

      case 'get':
        result = await client.get({
          index,
          id: queryParams.id
        });
        
        resultArray = result.body?.found ? [{
          _id: result.body._id,
          _source: result.body._source
        }] : [];
        break;

      case 'count':
        result = await client.count({
          index,
          body: queryParams
        });
        
        resultArray = [{ count: result.body.count }];
        break;

      case 'mget':
        result = await client.mget({
          index,
          body: queryParams
        });
        
        resultArray = result.body?.docs?.filter((doc: any) => doc.found)
          .map((doc: any) => ({
            _id: doc._id,
            _source: doc._source
          })) || [];
        break;

      default:
        throw new Error(`Unsupported Elasticsearch operation: ${operation}`);
    }

    return {
      rows: resultArray,
      count: resultArray.length,
      data: resultArray
    };
  }

  /**
   * Execute DynamoDB query using AWS SDK v3
   * The "operation" key determines which DynamoDB operation to use
   */
  private async executeDynamoDB(client: any, dynamoQuery: any): Promise<QueryResult> {
    // Extract operation and remove it from query parameters
    const { operation, ...queryParams } = dynamoQuery;
    
    let result: any;
    let resultArray: any[] = [];

    switch (operation) {
      case 'query':
        // Use DynamoDB Query operation for efficient partition key lookups
        result = await client.query(queryParams);
        resultArray = result.Items || [];
        break;

      case 'scan':
        // Use DynamoDB Scan operation for full table scans with filters
        result = await client.scan(queryParams);
        resultArray = result.Items || [];
        break;

      case 'getItem':
        // Use DynamoDB GetItem for single item lookups by primary key
        result = await client.getItem(queryParams);
        resultArray = result.Item ? [result.Item] : [];
        break;

      case 'batchGetItem':
        // Use BatchGetItem for multiple item lookups
        result = await client.batchGetItem(queryParams);
        resultArray = Object.values(result.Responses || {}).flat() as any[];
        break;

      case 'putItem':
        // Use PutItem for creating/updating items
        result = await client.putItem(queryParams);
        resultArray = [{ success: true, ...result }];
        break;

      case 'updateItem':
        // Use UpdateItem for modifying existing items
        result = await client.updateItem(queryParams);
        resultArray = [{ success: true, attributes: result.Attributes }];
        break;

      case 'deleteItem':
        // Use DeleteItem for removing items
        result = await client.deleteItem(queryParams);
        resultArray = [{ success: true, attributes: result.Attributes }];
        break;

      default:
        throw new Error(`Unsupported DynamoDB operation: ${operation}`);
    }

    return {
      rows: resultArray,
      count: resultArray.length,
      data: resultArray
    };
  }

  /**
   * Execute Redis query using ioredis client
   */
  private async executeRedis(client: any, redisQuery: any): Promise<QueryResult> {
    const { operation, ...queryParams } = redisQuery;
    let result: any;
    let resultArray: any[] = [];

    switch (operation) {
      case 'GET':
        result = await client.get(queryParams.key);
        resultArray = result ? [{ key: queryParams.key, value: result }] : [];
        break;

      case 'MGET':
        result = await client.mget(...queryParams.keys);
        resultArray = result
          .map((value: any, index: number) => value !== null ? { key: queryParams.keys[index], value } : null)
          .filter((item: any) => item !== null);
        break;

      case 'HGETALL':
        result = await client.hgetall(queryParams.key);
        resultArray = Object.keys(result).length > 0 ? [{ key: queryParams.key, fields: result }] : [];
        break;

      case 'SCAN':
        result = await client.scan(
          queryParams.cursor || 0,
          'MATCH', queryParams.pattern || '*',
          'COUNT', queryParams.count || 1000
        );
        resultArray = result[1].map((key: string) => ({ key }));
        break;

      case 'FT.SEARCH':
        // RediSearch module operations
        try {
          result = await client.call(
            'FT.SEARCH',
            queryParams.index,
            queryParams.query,
            'LIMIT', queryParams.offset || 0, queryParams.limit || 10
          );
          
          const count = result[0];
          const docs = [];
          for (let i = 1; i < result.length; i += 2) {
            const docId = result[i];
            const fields = result[i + 1];
            const fieldObj: any = { _id: docId };
            
            for (let j = 0; j < fields.length; j += 2) {
              fieldObj[fields[j]] = fields[j + 1];
            }
            docs.push(fieldObj);
          }
          
          resultArray = docs;
        } catch (error: any) {
          throw new Error(`RediSearch not available: ${error.message}`);
        }
        break;

      case 'GRAPH.QUERY':
        // RedisGraph module operations
        try {
          result = await client.call('GRAPH.QUERY', queryParams.graph, queryParams.query);
          resultArray = result[1] || [];
        } catch (error: any) {
          throw new Error(`RedisGraph not available: ${error.message}`);
        }
        break;

      case 'JSON.GET':
        // RedisJSON module operations
        try {
          result = await client.call('JSON.GET', queryParams.key, queryParams.path || '$');
          resultArray = result ? [{ key: queryParams.key, value: result }] : [];
        } catch (error: any) {
          throw new Error(`RedisJSON not available: ${error.message}`);
        }
        break;

      case 'TS.RANGE':
        // RedisTimeSeries operations
        try {
          result = await client.call(
            'TS.RANGE',
            queryParams.key,
            queryParams.fromTimestamp || '-',
            queryParams.toTimestamp || '+',
            'COUNT', queryParams.count || 100
          );
          resultArray = result.map(([timestamp, value]: [number, string]) => ({ timestamp, value }));
        } catch (error: any) {
          throw new Error(`RedisTimeSeries not available: ${error.message}`);
        }
        break;

      default:
        throw new Error(`Unsupported Redis operation: ${operation}`);
    }

    return {
      rows: resultArray,
      count: resultArray.length,
      data: resultArray
    };
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