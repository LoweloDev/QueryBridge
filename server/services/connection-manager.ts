import { Connection } from "@shared/schema";

export interface DatabaseConnection {
  id: string;
  type: string;
  client: any; // The actual database client instance
  isConnected: boolean;
}

/**
 * Connection Manager for QueryFlow
 * 
 * This manager accepts external database connections by reference.
 * It does NOT create connections itself - connections are provided by the host application.
 * 
 * For deployment as npm package: Users pass their own database clients to this manager.
 * For development: We can provide demonstration data when no connections are available.
 */
export class ConnectionManager {
  private activeConnections: Map<string, DatabaseConnection> = new Map();
  private connectionConfigs: Map<string, Connection> = new Map();

  constructor() {
    // No initialization needed - connections provided externally
  }

  /**
   * Register a database connection with its client instance
   * @param connectionId - Unique identifier for this connection
   * @param client - The actual database client (pg.Pool, MongoClient, etc.)
   * @param connectionConfig - Connection metadata from storage
   */
  registerConnection(connectionId: string, client: any, connectionConfig: Connection): void {
    this.activeConnections.set(connectionId, {
      id: connectionId,
      type: connectionConfig.type,
      client,
      isConnected: true
    });
    this.connectionConfigs.set(connectionId, connectionConfig);
    console.log(`Registered ${connectionConfig.type} connection: ${connectionConfig.name}`);
  }

  /**
   * Remove a connection from the manager
   */
  unregisterConnection(connectionId: string): void {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      console.log(`Unregistered connection: ${connectionId}`);
      this.activeConnections.delete(connectionId);
      this.connectionConfigs.delete(connectionId);
    }
  }

  /**
   * Execute a query on a registered connection
   */
  async execute(connectionId: string, translatedQuery: string): Promise<any> {
    // Check if we have an active connection
    const activeConnection = this.activeConnections.get(connectionId);
    
    if (!activeConnection || !activeConnection.isConnected) {
      throw new Error(`No active connection found for ${connectionId}. Connection must be registered first.`);
    }

    // Execute on actual connection only
    return await this.executeOnConnection(activeConnection, translatedQuery);
  }

  /**
   * Execute query on an actual database connection
   */
  private async executeOnConnection(connection: DatabaseConnection, query: string): Promise<any> {
    const parsedQuery = JSON.parse(query);
    
    switch (connection.type) {
      case 'postgresql':
        return await this.executePostgreSQLQuery(connection.client, parsedQuery);
      case 'mongodb':
        return await this.executeMongoDBQuery(connection.client, parsedQuery);
      case 'redis':
        return await this.executeRedisQuery(connection.client, parsedQuery);
      case 'dynamodb':
        return await this.executeDynamoDBQuery(connection.client, parsedQuery);
      case 'elasticsearch':
        return await this.executeElasticsearchQuery(connection.client, parsedQuery);
      default:
        throw new Error(`Unsupported database type: ${connection.type}`);
    }
  }

  private async executePostgreSQLQuery(client: any, query: any): Promise<any> {
    // Execute actual PostgreSQL query using provided client
    if (typeof query === 'string') {
      const result = await client.query(query);
      return { rows: result.rows };
    }
    
    // If it's already a translated SQL string from queryTranslator
    if (query.sql) {
      const result = await client.query(query.sql);
      return { rows: result.rows };
    }
    
    throw new Error('Invalid query format for PostgreSQL');
  }

  private async executeMongoDBQuery(client: any, query: any): Promise<any> {
    // Execute MongoDB query from queryTranslator output
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
    
    throw new Error('Invalid query format for MongoDB');
  }

  private async executeRedisQuery(client: any, query: any): Promise<any> {
    // Execute actual Redis query using provided client
    if (query.operation === 'get') {
      return await client.get(query.key);
    } else if (query.operation === 'keys') {
      const keys = await client.keys(query.pattern || '*');
      return { keys };
    } else if (query.operation === 'search' && query.index) {
      // RedisSearch operation
      try {
        return await client.ft.search(query.index, query.query || '*');
      } catch (error) {
        // Fallback to basic key scan
        const keys = await client.keys('*');
        return { keys: keys.slice(0, 10) };
      }
    }
    
    throw new Error(`Unsupported Redis operation: ${query.operation}`);
  }

  private async executeDynamoDBQuery(client: any, query: any): Promise<any> {
    // Execute actual DynamoDB query using provided client
    if (query.operation === 'scan') {
      const result = await client.send(query.command);
      return { Items: result.Items || [] };
    } else if (query.operation === 'query') {
      const result = await client.send(query.command);
      return { Items: result.Items || [] };
    }
    
    throw new Error(`Unsupported DynamoDB operation: ${query.operation}`);
  }

  private async executeElasticsearchQuery(client: any, query: any): Promise<any> {
    // Execute actual Elasticsearch query using provided client
    const response = await client.search({
      index: query.index || 'users',
      body: query.body || { query: { match_all: {} } }
    });
    
    return response.body || response;
  }



  /**
   * Check if a connection is registered and active
   */
  isConnected(connectionId: string): boolean {
    const connection = this.activeConnections.get(connectionId);
    return connection ? connection.isConnected : false;
  }

  /**
   * Get connection configuration
   */
  getConnectionConfig(connectionId: string): Connection | undefined {
    return this.connectionConfigs.get(connectionId);
  }

  /**
   * List all registered connections
   */
  listConnections(): DatabaseConnection[] {
    return Array.from(this.activeConnections.values());
  }

  /**
   * Clean up all connections (for shutdown)
   */
  async cleanup(): Promise<void> {
    this.activeConnections.clear();
    this.connectionConfigs.clear();
    console.log('Connection manager cleaned up');
  }
}