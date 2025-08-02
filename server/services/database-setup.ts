/**
 * Real Database Setup and Connection Establishment
 * 
 * This establishes real database connections and provides them to the library.
 * The test backend handles database setup, not the library.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { MongoClient } from 'mongodb';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import Redis from 'ioredis';
import type { DatabaseConnection, ActiveConnection } from "../../lib/src/types";

import ws from 'ws';
neonConfig.webSocketConstructor = ws;

export class DatabaseSetup {
  private connections: Map<string, ActiveConnection> = new Map();

  /**
   * Setup real database connections for testing
   */
  async setupRealDatabases(): Promise<void> {
    const configs: DatabaseConnection[] = [
      {
        id: '943e7415-b1fb-4090-8645-3698be872423',
        name: 'PostgreSQL - Production',
        type: 'postgresql',
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'postgres'
      },
      {
        id: 'mongodb-analytics',
        name: 'MongoDB - Analytics',
        type: 'mongodb',
        host: 'localhost',
        port: 27017,
        database: 'analytics'
      },
      {
        id: 'redis-cache',
        name: 'Redis - Cache',
        type: 'redis',
        host: 'localhost',
        port: 6379,
        database: '0'
      },
      {
        id: 'dynamodb-users',
        name: 'DynamoDB - Users',
        type: 'dynamodb',
        host: 'localhost',
        port: 8000,
        database: 'users',
        region: 'us-east-1'
      },
      {
        id: 'elasticsearch-search',
        name: 'Elasticsearch - Search',
        type: 'elasticsearch',
        host: 'localhost',
        port: 9200,
        database: 'search'
      }
    ];

    for (const config of configs) {
      try {
        await this.attemptRealConnection(config);
      } catch (error) {
        console.warn(`Failed to setup real database for ${config.name}:`, error);
        // Continue with other connections
      }
    }
  }

  private async attemptRealConnection(config: DatabaseConnection): Promise<void> {
    switch (config.type) {
      case 'postgresql':
        await this.setupPostgreSQL(config);
        break;
      case 'mongodb':
        await this.setupMongoDB(config);
        break;
      case 'redis':
        await this.setupRedis(config);
        break;
      case 'dynamodb':
        await this.setupDynamoDB(config);
        break;
      case 'elasticsearch':
        await this.setupElasticsearch(config);
        break;
      default:
        console.warn(`Unknown database type: ${config.type}`);
    }
  }

  private async setupPostgreSQL(config: DatabaseConnection): Promise<void> {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Test the connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.connections.set(config.id, {
        client: pool,
        config,
        isConnected: true,
        lastUsed: new Date()
      });

      console.log(`Successfully connected to PostgreSQL: ${config.name}`);
    } catch (error: any) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  private async setupMongoDB(config: DatabaseConnection): Promise<void> {
    try {
      const client = new MongoClient(`mongodb://${config.host}:${config.port}/${config.database}`);
      await client.connect();
      await client.db().admin().ping();

      this.connections.set(config.id, {
        client,
        config,
        isConnected: true,
        lastUsed: new Date()
      });

      console.log(`Successfully connected to MongoDB: ${config.name}`);
    } catch (error: any) {
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }

  private async setupRedis(config: DatabaseConnection): Promise<void> {
    try {
      const client = new Redis({
        host: config.host,
        port: config.port,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
      });

      await client.ping();

      this.connections.set(config.id, {
        client,
        config,
        isConnected: true,
        lastUsed: new Date()
      });

      console.log(`Successfully connected to Redis: ${config.name}`);
    } catch (error: any) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }

  private async setupDynamoDB(config: DatabaseConnection): Promise<void> {
    try {
      const client = new DynamoDBClient({
        endpoint: `http://${config.host}:${config.port}`,
        region: config.region || 'us-east-1',
        credentials: {
          accessKeyId: 'fake',
          secretAccessKey: 'fake'
        }
      });

      // Test the connection by listing tables
      const command = new ListTablesCommand({});
      await client.send(command);

      this.connections.set(config.id, {
        client,
        config,
        isConnected: true,
        lastUsed: new Date()
      });

      console.log(`Successfully connected to DynamoDB: ${config.name}`);
    } catch (error: any) {
      throw new Error(`DynamoDB connection failed: ${error.message}`);
    }
  }

  private async setupElasticsearch(config: DatabaseConnection): Promise<void> {
    try {
      const client = new ElasticsearchClient({
        node: `http://${config.host}:${config.port}`
      });

      await client.ping();

      this.connections.set(config.id, {
        client,
        config,
        isConnected: true,
        lastUsed: new Date()
      });

      console.log(`Successfully connected to Elasticsearch: ${config.name}`);
    } catch (error: any) {
      throw new Error(`Elasticsearch connection failed: ${error.message}`);
    }
  }

  /**
   * Get all established connections
   */
  getConnections(): Map<string, ActiveConnection> {
    return this.connections;
  }

  /**
   * Clean up all connections
   */
  cleanup(): void {
    this.connections.forEach((connection) => {
      if (connection.client && typeof connection.client.close === 'function') {
        connection.client.close();
      }
    });
    this.connections.clear();
  }
}