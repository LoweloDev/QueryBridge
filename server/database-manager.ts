import { Pool } from 'pg';
import { MongoClient, Db } from 'mongodb';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
// Note: DynamoDB SDK will be imported when needed to avoid dependency issues
// import { DynamoDB } from '@aws-sdk/client-dynamodb';
import Redis from 'ioredis';
import { DatabaseConnection, DatabaseConfig } from './config/database-config';

export interface DatabaseManager {
  connect(config: DatabaseConfig): Promise<void>;
  getConnection(id: string): any;
  disconnect(): Promise<void>;
}

export class RealDatabaseManager implements DatabaseManager {
  private connections: Map<string, any> = new Map();
  private config: DatabaseConfig | null = null;

  async connect(config: DatabaseConfig): Promise<void> {
    this.config = config;
    
    for (const connection of config.connections) {
      try {
        await this.connectDatabase(connection);
        console.log(`Connected to ${connection.type}: ${connection.name}`);
      } catch (error) {
        console.warn(`Failed to connect to ${connection.name}:`, error);
        // Store failed connection for potential retry
        this.connections.set(connection.id, { error, config: connection });
      }
    }
  }

  private async connectDatabase(connection: DatabaseConnection): Promise<void> {
    switch (connection.type) {
      case 'postgresql':
        await this.connectPostgreSQL(connection);
        break;
      case 'mongodb':
        await this.connectMongoDB(connection);
        break;
      case 'elasticsearch':
        await this.connectElasticsearch(connection);
        break;
      case 'dynamodb':
        await this.connectDynamoDB(connection);
        break;
      case 'redis':
        await this.connectRedis(connection);
        break;
      default:
        throw new Error(`Unsupported database type: ${connection.type}`);
    }
  }

  private async connectPostgreSQL(connection: DatabaseConnection): Promise<void> {
    const pool = new Pool({
      host: connection.config.host,
      port: connection.config.port,
      database: connection.config.database,
      user: connection.config.user,
      password: connection.config.password,
      ssl: connection.config.ssl
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    this.connections.set(connection.id, pool);
  }

  private async connectMongoDB(connection: DatabaseConnection): Promise<void> {
    const client = new MongoClient(connection.config.url, connection.config.options);
    await client.connect();
    
    // Test connection
    await client.db(connection.config.database).admin().ping();
    
    this.connections.set(connection.id, {
      client,
      database: client.db(connection.config.database)
    });
  }

  private async connectElasticsearch(connection: DatabaseConnection): Promise<void> {
    const client = new ElasticsearchClient({
      node: connection.config.node,
      // Add authentication if needed
    });

    // Test connection
    await client.ping();
    
    this.connections.set(connection.id, client);
  }

  private async connectDynamoDB(connection: DatabaseConnection): Promise<void> {
    try {
      // Dynamic import to avoid dependency issues
      const { DynamoDB } = await import('@aws-sdk/client-dynamodb');
      
      const client = new DynamoDB({
        region: connection.config.region,
        endpoint: connection.config.endpoint,
        credentials: {
          accessKeyId: connection.config.accessKeyId,
          secretAccessKey: connection.config.secretAccessKey
        }
      });

      // Test connection by listing tables
      await client.listTables({});
      
      this.connections.set(connection.id, client);
    } catch (error) {
      throw new Error(`Failed to initialize DynamoDB: ${error}`);
    }
  }

  private async connectRedis(connection: DatabaseConnection): Promise<void> {
    const redis = new Redis({
      host: connection.config.host,
      port: connection.config.port,
      password: connection.config.password,
      enableReadyCheck: false,
      maxRetriesPerRequest: null
    });

    // Test connection
    await redis.ping();
    
    this.connections.set(connection.id, redis);
  }

  getConnection(id: string): any {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection not found: ${id}`);
    }
    if (connection.error) {
      throw new Error(`Connection failed: ${connection.error.message}`);
    }
    return connection;
  }

  async disconnect(): Promise<void> {
    for (const [id, connection] of Array.from(this.connections.entries())) {
      try {
        if (connection.error) continue;
        
        // Close connections based on type
        if (connection.end) {
          await connection.end(); // PostgreSQL pool
        } else if (connection.client?.close) {
          await connection.client.close(); // MongoDB
        } else if (connection.close) {
          await connection.close(); // Redis, Elasticsearch
        }
      } catch (error) {
        console.warn(`Error closing connection ${id}:`, error);
      }
    }
    this.connections.clear();
  }

  // Library interface method
  isConnected(id: string): boolean {
    const connection = this.connections.get(id);
    return connection && !connection.error;
  }

  // Get connection status for monitoring
  getConnectionStatus(): Record<string, { connected: boolean; error?: string }> {
    const status: Record<string, { connected: boolean; error?: string }> = {};
    
    for (const [id, connection] of Array.from(this.connections.entries())) {
      status[id] = {
        connected: !connection.error,
        error: connection.error?.message
      };
    }
    
    return status;
  }
}