/**
 * Real Database Setup and Connection Establishment
 *
 * This establishes real database connections and provides them to the library.
 * The test backend handles database setup, not the library.
 */

import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { MongoClient } from 'mongodb';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
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
    // Check if running in Docker mode
    const isDockerMode = process.env.DOCKER_MODE === 'true';

    const configs: DatabaseConnection[] = [
      {
        id: 'postgresql-main',
        name: 'PostgreSQL - Main',
        type: 'postgresql',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: 'main',
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres'
      },
      {
        id: 'mongodb-main',
        name: 'MongoDB - Main',
        type: 'mongodb',
        host: process.env.MONGO_HOST || 'localhost',
        port: parseInt(process.env.MONGO_PORT || '27017'),
        database: 'main',
        username: process.env.MONGO_USER || 'admin',
        password: process.env.MONGO_PASSWORD || 'password'
      },
      {
        id: 'elasticsearch-main',
        name: 'Elasticsearch - Main',
        type: 'elasticsearch',
        host: process.env.ELASTICSEARCH_HOST || 'localhost',
        port: parseInt(process.env.ELASTICSEARCH_PORT || '9200'),
        database: 'main',
        username: process.env.ELASTICSEARCH_USER || '',
        password: process.env.ELASTICSEARCH_PASSWORD || ''
      },
      {
        id: 'dynamodb-main',
        name: 'DynamoDB - Main',
        type: 'dynamodb',
        host: process.env.DYNAMODB_HOST || 'localhost',
        port: parseInt(process.env.DYNAMODB_PORT || '8000'),
        database: 'main',
        region: 'us-east-1'
      },
      {
        id: 'redis-main',
        name: 'Redis - Main',
        type: 'redis',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        database: 'main',
        username: process.env.REDIS_USER || '',
        password: process.env.REDIS_PASSWORD || ''
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
        console.warn(`Unsupported database type: ${config.type}`);
    }
  }

  private async setupPostgreSQL(config: DatabaseConnection): Promise<void> {
    try {
      let pool: NeonPool | PgPool;

      // Check if DATABASE_URL is provided (production/Replit environment)
      if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech')) {
        // Use Neon client for Replit/serverless environment
        pool = new NeonPool({
          connectionString: process.env.DATABASE_URL,
        });
        console.log('Using Neon PostgreSQL client for serverless environment');
      } else if (process.env.DATABASE_URL && process.env.DATABASE_URL !== 'postgresql://user:password@host:port/database') {
        // Use regular pg client for local DATABASE_URL
        pool = new PgPool({
          connectionString: process.env.DATABASE_URL,
        });
        console.log('Using standard PostgreSQL client with DATABASE_URL');
      } else {
        // Local development setup - try multiple common configurations
        const possibleConfigs = [
          // Try DATABASE_URL if it's already updated by startup script
          ...(process.env.DATABASE_URL && process.env.DATABASE_URL !== 'postgresql://user:password@host:port/database' ? [{
            connectionString: process.env.DATABASE_URL
          }] : []),
          // Primary: Docker environment configuration
          ...(process.env.DOCKER_MODE === 'true' ? [{
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'password',
            database: process.env.POSTGRES_DB || 'querybridge_dev'
          }] : []),
          // Local development: Match the exact working CLI connection
          {
            host: 'localhost',
            port: 5432,
            user: process.env.USER || 'postgres',
            database: 'querybridge_dev'
          },
          // Fallback: Use actual USER environment variable
          {
            host: 'localhost',
            port: 5432,
            user: process.env.USER || 'postgres',
            database: 'querybridge_dev'
          },
          // Try with current user and default postgres database
          {
            host: 'localhost',
            port: 5432,
            user: process.env.USER || 'postgres',
            database: 'postgres'
          },
          // Try with environment variables from .env
          {
            host: process.env.PGHOST || 'localhost',
            port: parseInt(process.env.PGPORT || '5432'),
            user: process.env.PGUSER || process.env.USER || 'postgres',
            database: process.env.PGDATABASE || 'querybridge_dev'
          },
          {
            host: config.host || 'localhost',
            port: config.port || 5432,
            user: config.username || process.env.USER || 'postgres',
            database: config.database || 'postgres',
            // For local development, we often don't need a password
            ...(config.password && { password: config.password })
          },
          // Standard postgres user setup
          {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            database: 'postgres'
          }
        ];

        let connectionError: Error | null = null;
        let poolToUse: PgPool | null = null;

        console.log('Using standard PostgreSQL client for local development');

        for (const pgConfig of possibleConfigs) {
          try {
            console.log(`Trying PostgreSQL config:`, {
              ...pgConfig,
              password: 'password' in pgConfig && pgConfig.password ? '[HIDDEN]' : 'none'
            });
            const testPool = new PgPool(pgConfig);
            // Test this configuration
            const testClient = await testPool.connect();
            await testClient.query('SELECT 1');
            testClient.release();
            poolToUse = testPool;
            console.log(`✅ PostgreSQL connection successful with config`);
            break; // Success, use this config
          } catch (err: any) {
            console.log(`❌ PostgreSQL config failed:`, err.message);
            connectionError = err;
            continue; // Try next config
          }
        }

        if (!poolToUse) {
          console.log('All PostgreSQL configurations failed. Last error:', connectionError?.message);
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
      console.log(`Attempting MongoDB connection to ${config.host}:${config.port}`);

      // Build connection URL with optional authentication
      let connectionUrl: string;
      if (config.username && config.password) {
        connectionUrl = `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}?authSource=admin`;
      } else {
        connectionUrl = `mongodb://${config.host}:${config.port}/${config.database}`;
      }

      const client = new MongoClient(connectionUrl, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000,
      });

      await client.connect();

      // Test the connection with a simple operation
      try {
        await client.db().admin().ping();
      } catch (authError: any) {
        if (authError.message.includes('authentication') || authError.message.includes('auth')) {
          console.warn(`MongoDB authentication required. To fix this, either:`);
          console.warn(`1. Start MongoDB without auth: mongod --noauth`);
          console.warn(`2. Set MONGO_USER and MONGO_PASSWORD environment variables`);
          console.warn(`3. Create a MongoDB user with proper permissions`);
          throw new Error(`MongoDB authentication failed: ${authError.message}`);
        }
        throw authError;
      }

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
      const endpoint = process.env.DYNAMODB_ENDPOINT || `http://${config.host}:${config.port}`;
      const client = new DynamoDBClient({
        endpoint: endpoint,
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
      // Use Elasticsearch client
      const client = new ElasticsearchClient({
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
