/**
 * Real Database Setup and Connection Establishment
 * 
 * This establishes real database connections and provides them to the library.
 * The test backend handles database setup, not the library.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { MongoClient } from 'mongodb';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import Redis from 'ioredis';
import type { DatabaseConnection, ActiveConnection } from "universal-query-translator";

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
        database: process.env.PGDATABASE || 'postgres',
        username: process.env.PGUSER || process.env.USER || 'postgres'
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
        id: 'elasticsearch-postgresql',
        name: 'Elasticsearch - PostgreSQL Layer',
        type: 'elasticsearch',
        host: 'localhost',
        port: 9200,
        database: 'postgresql-search'
      },
      {
        id: 'elasticsearch-dynamodb',
        name: 'Elasticsearch - DynamoDB Layer',
        type: 'elasticsearch',
        host: 'localhost',
        port: 9201,
        database: 'dynamodb-search'
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
      let pool: Pool;
      
      // Check if DATABASE_URL is provided (production/Replit environment)
      if (process.env.DATABASE_URL) {
        console.log('Using DATABASE_URL for PostgreSQL connection');
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });
        
        // Test the connection quickly
        const testClient = await pool.connect();
        await testClient.query('SELECT 1');
        testClient.release();
      } else {
        console.log('DATABASE_URL not found, trying local PostgreSQL configurations...');
        // Local development setup - try multiple common configurations
        const possibleConfigs = [
          // First try the database that the startup script creates
          {
            host: 'localhost',
            port: 5432,
            user: process.env.USER || 'postgres',
            database: 'querybridge_dev'
          },
          {
            host: config.host || 'localhost',
            port: config.port || 5432,
            user: config.username || process.env.USER || 'postgres',
            database: config.database || 'postgres',
            // For local development, we often don't need a password
            ...(config.password && { password: config.password })
          },
          // Fallback for macOS Homebrew PostgreSQL
          {
            host: 'localhost',
            port: 5432,
            user: process.env.USER || 'postgres',
            database: 'postgres'
          },
          // Another common local setup
          {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            database: 'postgres'
          }
        ];
        
        let connectionError: Error | null = null;
        let poolToUse: Pool | null = null;
        
        for (const pgConfig of possibleConfigs) {
          try {
            const testPool = new Pool(pgConfig);
            // Test this configuration
            const testClient = await testPool.connect();
            await testClient.query('SELECT 1');
            testClient.release();
            poolToUse = testPool;
            break; // Success, use this config
          } catch (err: any) {
            connectionError = err;
            continue; // Try next config
          }
        }
        
        if (!poolToUse) {
          throw connectionError || new Error('No working PostgreSQL configuration found');
        }
        
        pool = poolToUse;
      }

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
    let client: any = null;
    try {
      client = new Redis({
        host: config.host,
        port: config.port,
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 1000,
      });

      // Add error handler to prevent unhandled errors
      client.on('error', (err: any) => {
        // Suppress repetitive connection errors
        if (!err.message.includes('ECONNREFUSED')) {
          console.warn(`Redis client error: ${err.message}`);
        }
      });

      // Connect and test with timeout
      await Promise.race([
        (async () => {
          await client.connect();
          await client.ping();
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000))
      ]);

      this.connections.set(config.id, {
        client,
        config,
        isConnected: true,
        lastUsed: new Date()
      });

      console.log(`Successfully connected to Redis: ${config.name}`);
    } catch (error: any) {
      // Clean up client if connection failed
      if (client) {
        try {
          client.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
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
      // Use OpenSearch client directly - no more detection issues!
      const client = new OpenSearchClient({
        node: `http://${config.host}:${config.port}`,
        requestTimeout: 5000,
        pingTimeout: 3000,
        sniffOnStart: false,
        sniffOnConnectionFault: false
      });

      // Test connection with cluster health
      await client.cluster.health({ timeout: '5s' });

      this.connections.set(config.id, {
        client,
        config,
        isConnected: true,
        lastUsed: new Date()
      });

      console.log(`Successfully connected to OpenSearch: ${config.name}`);
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