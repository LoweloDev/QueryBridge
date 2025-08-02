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
    // First check if we have an active connection
    const activeConnection = this.activeConnections.get(connectionId);
    
    if (activeConnection && activeConnection.isConnected) {
      // Execute on actual connection
      return await this.executeOnConnection(activeConnection, translatedQuery);
    }

    // Fall back to getting connection config and using demonstration data
    const { storage } = await import("../storage");
    const connectionConfig = await storage.getConnection(connectionId);
    
    if (!connectionConfig) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    console.log(`No active connection for ${connectionConfig.name}, using demonstration data`);
    return this.generateDemonstrationData(connectionConfig.type, JSON.parse(translatedQuery));
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
    
    // Handle structured query object
    const sqlQuery = this.buildSQLFromQuery(query);
    const result = await client.query(sqlQuery);
    return { rows: result.rows };
  }

  private async executeMongoDBQuery(client: any, query: any): Promise<any> {
    // Assume client is a connected MongoDB database instance
    const collection = client.collection(query.collection || 'users');
    
    if (query.operation === 'find' || !query.operation) {
      const cursor = collection.find(query.filter || {});
      
      if (query.projection) cursor.project(query.projection);
      if (query.sort) cursor.sort(query.sort);
      if (query.limit) cursor.limit(query.limit);
      
      return await cursor.toArray();
    }
    
    throw new Error(`Unsupported MongoDB operation: ${query.operation}`);
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

  private buildSQLFromQuery(query: any): string {
    // Simple SQL building - in production this would be more sophisticated
    if (query.table && query.operation === 'select') {
      let sql = `SELECT ${query.fields ? query.fields.join(', ') : '*'} FROM ${query.table}`;
      
      if (query.where) {
        const conditions = Object.entries(query.where)
          .map(([key, value]) => `${key} = '${value}'`)
          .join(' AND ');
        sql += ` WHERE ${conditions}`;
      }
      
      if (query.limit) {
        sql += ` LIMIT ${query.limit}`;
      }
      
      return sql;
    }
    
    // Default fallback
    return 'SELECT 1 as test';
  }

  /**
   * Generate demonstration data when no actual connection is available
   * This is only used for development/demo purposes
   */
  private generateDemonstrationData(dbType: string, query: any): any {
    switch (dbType) {
      case 'postgresql':
      case 'mysql':
        return {
          rows: [
            { id: 1, name: "Demo User 1", email: "demo1@example.com", status: "active" },
            { id: 2, name: "Demo User 2", email: "demo2@example.com", status: "active" },
            { id: 3, name: "Demo User 3", email: "demo3@example.com", status: "inactive" }
          ]
        };
        
      case 'mongodb':
        return [
          { _id: "demo_id_001", name: "Demo User 1", email: "demo1@example.com", status: "active" },
          { _id: "demo_id_002", name: "Demo User 2", email: "demo2@example.com", status: "active" },
          { _id: "demo_id_003", name: "Demo User 3", email: "demo3@example.com", status: "inactive" }
        ];
        
      case 'elasticsearch':
        return {
          hits: {
            total: { value: 3, relation: "eq" },
            hits: [
              { _source: { name: "Demo User 1", email: "demo1@example.com", status: "active" } },
              { _source: { name: "Demo User 2", email: "demo2@example.com", status: "active" } },
              { _source: { name: "Demo User 3", email: "demo3@example.com", status: "inactive" } }
            ]
          }
        };
        
      case 'dynamodb':
        return {
          Items: [
            { 
              PK: { S: "DEMO#001" }, 
              SK: { S: "USER#1" }, 
              name: { S: "Demo User 1" }, 
              status: { S: "active" } 
            },
            { 
              PK: { S: "DEMO#002" }, 
              SK: { S: "USER#2" }, 
              name: { S: "Demo User 2" }, 
              status: { S: "active" } 
            }
          ]
        };
        
      case 'redis':
        return {
          keys: ["demo:user:1", "demo:user:2", "demo:user:3"],
          type: "demonstration_data"
        };
        
      default:
        return { message: `No demonstration data available for ${dbType}` };
    }
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