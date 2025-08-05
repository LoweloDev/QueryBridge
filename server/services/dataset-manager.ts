/**
 * Dataset Management Service
 * 
 * Handles loading example datasets into all database types
 * and provides reset functionality for testing environments.
 */

import { Pool as NeonPool } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { MongoClient } from 'mongodb';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import Redis from 'ioredis';
import { 
  exampleDatasets, 
  postgresqlDataset, 
  mongodbDataset, 
  dynamodbDataset, 
  redisDataset, 
  elasticsearchDataset 
} from '../data/example-datasets';
import type { ActiveConnection } from "universal-query-translator";

export class DatasetManager {
  
  /**
   * Load example dataset into PostgreSQL
   */
  async loadPostgreSQLDataset(connection: ActiveConnection): Promise<void> {
    const client = connection.client as NeonPool | PgPool;
    
    try {
      // Create tables
      await client.query({ text: postgresqlDataset.createTables });
      
      // Insert data
      const insertSQL = postgresqlDataset.insertData(exampleDatasets);
      await client.query({ text: insertSQL });
      
      console.log('PostgreSQL example dataset loaded successfully');
    } catch (error) {
      console.error('Failed to load PostgreSQL dataset:', error);
      throw error;
    }
  }

  /**
   * Reset PostgreSQL database (clear all data and reload dataset)
   */
  async resetPostgreSQLDatabase(connection: ActiveConnection): Promise<void> {
    const client = connection.client as NeonPool | PgPool;
    
    try {
      // Drop tables in correct order (respecting foreign key constraints)
      await client.query({ 
        text: `
          DROP TABLE IF EXISTS reviews CASCADE;
          DROP TABLE IF EXISTS orders CASCADE; 
          DROP TABLE IF EXISTS products CASCADE;
          DROP TABLE IF EXISTS categories CASCADE;
          DROP TABLE IF EXISTS users CASCADE;
        `
      });
      
      // Reload dataset
      await this.loadPostgreSQLDataset(connection);
      
      console.log('PostgreSQL database reset and dataset reloaded');
    } catch (error) {
      console.error('Failed to reset PostgreSQL database:', error);
      throw error;
    }
  }

  /**
   * Load example dataset into MongoDB
   */
  async loadMongoDBDataset(connection: ActiveConnection): Promise<void> {
    const client = connection.client as MongoClient;
    const config = connection.config;
    
    try {
      const db = client.db(config.database || 'analytics');
      
      // Insert data into collections
      for (const [collectionName, documents] of Object.entries(mongodbDataset.collections)) {
        const collection = db.collection(collectionName);
        
        // Clear existing data
        await collection.deleteMany({});
        
        // Insert new data
        if (documents.length > 0) {
          await collection.insertMany(documents);
        }
      }
      
      console.log('MongoDB example dataset loaded successfully');
    } catch (error) {
      console.error('Failed to load MongoDB dataset:', error);
      throw error;
    }
  }

  /**
   * Reset MongoDB database (clear all collections and reload dataset)
   */
  async resetMongoDBDatabase(connection: ActiveConnection): Promise<void> {
    const client = connection.client as MongoClient;
    const config = connection.config;
    
    try {
      const db = client.db(config.database || 'analytics');
      
      // Drop all collections
      const collections = await db.listCollections().toArray();
      for (const collection of collections) {
        await db.dropCollection(collection.name);
      }
      
      // Reload dataset
      await this.loadMongoDBDataset(connection);
      
      console.log('MongoDB database reset and dataset reloaded');
    } catch (error) {
      console.error('Failed to reset MongoDB database:', error);
      throw error;
    }
  }

  /**
   * Load example dataset into DynamoDB
   */
  async loadDynamoDBDataset(connection: ActiveConnection): Promise<void> {
    const client = connection.client as DynamoDBClient;
    const docClient = DynamoDBDocumentClient.from(client);
    
    try {
      // First, ensure required tables exist
      await this.ensureDynamoDBTables(client);
      
      // Load traditional table design
      for (const [tableName, items] of Object.entries(dynamodbDataset.traditionalTables)) {
        for (const item of items) {
          await docClient.send(new PutCommand({
            TableName: tableName,
            Item: item
          }));
        }
      }
      
      // Load single-table design data into main table
      const mainTableName = connection.config.database || 'main';
      for (const item of dynamodbDataset.singleTable) {
        await docClient.send(new PutCommand({
          TableName: mainTableName,
          Item: item
        }));
      }
      
      console.log('DynamoDB example dataset loaded successfully');
    } catch (error) {
      console.error('Failed to load DynamoDB dataset:', error);
      throw error;
    }
  }

  /**
   * Reset DynamoDB database (scan and delete all items, reload dataset)
   */
  async resetDynamoDBDatabase(connection: ActiveConnection): Promise<void> {
    const client = connection.client as DynamoDBClient;
    const docClient = DynamoDBDocumentClient.from(client);
    
    try {
      // First, ensure required tables exist
      await this.ensureDynamoDBTables(client);
      
      // Clear traditional tables
      for (const tableName of Object.keys(dynamodbDataset.traditionalTables)) {
        await this.clearDynamoDBTable(docClient, tableName);
      }
      
      // Clear main single-table
      const mainTableName = connection.config.database || 'main';
      await this.clearDynamoDBTable(docClient, mainTableName);
      
      // Reload dataset
      await this.loadDynamoDBDataset(connection);
      
      console.log('DynamoDB database reset and dataset reloaded');
    } catch (error) {
      console.error('Failed to reset DynamoDB database:', error);
      throw error;
    }
  }

  private async clearDynamoDBTable(docClient: DynamoDBDocumentClient, tableName: string): Promise<void> {
    try {
      let lastEvaluatedKey;
      
      do {
        const scanResult: any = await docClient.send(new ScanCommand({
          TableName: tableName,
          ExclusiveStartKey: lastEvaluatedKey
        }));
        
        if (scanResult.Items && scanResult.Items.length > 0) {
          // Delete items in batches
          for (const item of scanResult.Items) {
            // Extract key attributes (assume PK or first attribute is the key)
            const keyNames = Object.keys(item);
            const key = keyNames.length > 0 ? { [keyNames[0]]: item[keyNames[0]] } : item;
            
            await docClient.send(new DeleteCommand({
              TableName: tableName,
              Key: key
            }));
          }
        }
        
        lastEvaluatedKey = scanResult.LastEvaluatedKey;
      } while (lastEvaluatedKey);
      
    } catch (error) {
      // Table might not exist, which is fine for reset
      console.log(`Table ${tableName} does not exist or is empty`);
    }
  }

  /**
   * Load example dataset into Redis
   */
  async loadRedisDataset(connection: ActiveConnection): Promise<void> {
    const client = connection.client as Redis;
    
    try {
      // Load hash sets
      for (const [key, value] of Object.entries(redisDataset.hashes)) {
        await client.hmset(key, value);
      }
      
      // Load sets
      for (const [key, members] of Object.entries(redisDataset.sets)) {
        if (members.length > 0) {
          await client.sadd(key, ...members);
        }
      }
      
      // Load sorted sets
      for (const [key, items] of Object.entries(redisDataset.sortedSets)) {
        const args: (string | number)[] = [];
        for (const item of items) {
          args.push(item.score, item.member);
        }
        if (args.length > 0) {
          await client.zadd(key, ...args);
        }
      }
      
      console.log('Redis example dataset loaded successfully');
    } catch (error) {
      console.error('Failed to load Redis dataset:', error);
      throw error;
    }
  }

  /**
   * Reset Redis database (flush all data and reload dataset)
   */
  async resetRedisDatabase(connection: ActiveConnection): Promise<void> {
    const client = connection.client as Redis;
    
    try {
      // Clear all data
      await client.flushdb();
      
      // Reload dataset
      await this.loadRedisDataset(connection);
      
      console.log('Redis database reset and dataset reloaded');
    } catch (error) {
      console.error('Failed to reset Redis database:', error);
      throw error;
    }
  }

  /**
   * Load example dataset into Elasticsearch/OpenSearch
   */
  async loadElasticsearchDataset(connection: ActiveConnection): Promise<void> {
    const client = connection.client as OpenSearchClient;
    
    try {
      // Create indices with mappings and load documents
      for (const [indexName, indexData] of Object.entries(elasticsearchDataset.indices)) {
        // Delete index if it exists
        try {
          await client.indices.delete({ index: indexName });
        } catch (error) {
          // Index doesn't exist, which is fine
        }
        
        // Create index with mappings
        await client.indices.create({
          index: indexName,
          body: {
            mappings: indexData.mappings as any
          }
        });
        
        // Index documents
        for (const doc of indexData.documents) {
          await client.index({
            index: indexName,
            id: doc.id,
            body: doc
          });
        }
      }
      
      // Refresh indices to make documents searchable
      await client.indices.refresh({ index: '_all' });
      
      console.log('Elasticsearch example dataset loaded successfully');
    } catch (error) {
      console.error('Failed to load Elasticsearch dataset:', error);
      throw error;
    }
  }

  /**
   * Reset Elasticsearch database (delete all indices and reload dataset)
   */
  async resetElasticsearchDatabase(connection: ActiveConnection): Promise<void> {
    const client = connection.client as OpenSearchClient;
    
    try {
      // Delete all indices
      for (const indexName of Object.keys(elasticsearchDataset.indices)) {
        try {
          await client.indices.delete({ index: indexName });
        } catch (error) {
          // Index doesn't exist, which is fine
        }
      }
      
      // Reload dataset
      await this.loadElasticsearchDataset(connection);
      
      console.log('Elasticsearch database reset and dataset reloaded');
    } catch (error) {
      console.error('Failed to reset Elasticsearch database:', error);
      throw error;
    }
  }

  /**
   * Load dataset based on database type
   */
  async loadDataset(connection: ActiveConnection): Promise<void> {
    switch (connection.config.type) {
      case 'postgresql':
        await this.loadPostgreSQLDataset(connection);
        break;
      case 'mongodb':
        await this.loadMongoDBDataset(connection);
        break;
      case 'dynamodb':
        await this.loadDynamoDBDataset(connection);
        break;
      case 'redis':
        await this.loadRedisDataset(connection);
        break;
      case 'elasticsearch':
        await this.loadElasticsearchDataset(connection);
        break;
      default:
        throw new Error(`Unsupported database type: ${connection.config.type}`);
    }
  }

  /**
   * Reset database based on database type
   */
  async resetDatabase(connection: ActiveConnection): Promise<void> {
    switch (connection.config.type) {
      case 'postgresql':
        await this.resetPostgreSQLDatabase(connection);
        break;
      case 'mongodb':
        await this.resetMongoDBDatabase(connection);
        break;
      case 'dynamodb':
        await this.resetDynamoDBDatabase(connection);
        break;
      case 'redis':
        await this.resetRedisDatabase(connection);
        break;
      case 'elasticsearch':
        await this.resetElasticsearchDatabase(connection);
        break;
      default:
        throw new Error(`Unsupported database type: ${connection.config.type}`);
    }
  }

  /**
   * Ensure DynamoDB tables exist before loading data
   */
  private async ensureDynamoDBTables(client: DynamoDBClient): Promise<void> {
    try {
      // Get list of existing tables
      const listTablesResult = await client.send(new ListTablesCommand({}));
      const existingTables = listTablesResult.TableNames || [];

      // Define required tables with their schemas
      const requiredTables = [
        {
          name: 'users',
          keySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          attributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }]
        },
        {
          name: 'orders',
          keySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          attributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }]
        },
        {
          name: 'products',
          keySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          attributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }]
        },
        {
          name: 'categories',
          keySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          attributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }]
        },
        {
          name: 'reviews',
          keySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          attributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }]
        },
        {
          name: 'main',
          keySchema: [
            { AttributeName: 'PK', KeyType: 'HASH' },
            { AttributeName: 'SK', KeyType: 'RANGE' }
          ],
          attributeDefinitions: [
            { AttributeName: 'PK', AttributeType: 'S' },
            { AttributeName: 'SK', AttributeType: 'S' }
          ]
        }
      ];

      // Create missing tables
      for (const table of requiredTables) {
        if (!existingTables.includes(table.name)) {
          await client.send(new CreateTableCommand({
            TableName: table.name,
            KeySchema: table.keySchema,
            AttributeDefinitions: table.attributeDefinitions,
            BillingMode: 'PAY_PER_REQUEST'
          }));

          // Wait for table to become active
          let tableActive = false;
          let attempts = 0;
          const maxAttempts = 30;

          while (!tableActive && attempts < maxAttempts) {
            try {
              const describeResult = await client.send(new DescribeTableCommand({
                TableName: table.name
              }));
              
              if (describeResult.Table?.TableStatus === 'ACTIVE') {
                tableActive = true;
              } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
              }
            } catch (error) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }
          }
        }
      }

      console.log('DynamoDB tables ensured and ready');
    } catch (error) {
      console.error('Failed to ensure DynamoDB tables:', error);
      throw error;
    }
  }
}

export const datasetManager = new DatasetManager();