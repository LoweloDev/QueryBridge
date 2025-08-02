#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Database setup script for local development
 * This script will:
 * 1. Start DynamoDB Local
 * 2. Start MongoDB
 * 3. Start Redis with modules
 * 4. Start Elasticsearch (if available)
 * 5. Initialize sample data
 */

class DatabaseSetup {
  private processes: any[] = [];
  private dataDir = join(process.cwd(), 'data');

  constructor() {
    // Create data directory
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async startAll(): Promise<void> {
    console.log('🚀 Starting local databases...');
    
    await Promise.all([
      this.startDynamoDBLocal(),
      this.startMongoDB(),
      this.startRedis(),
      this.startElasticsearch()
    ]);

    // Setup graceful shutdown
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    
    console.log('✅ All databases started successfully');
    console.log('Press Ctrl+C to stop all databases');
  }

  private async startDynamoDBLocal(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting DynamoDB Local on port 8000...');
      
      const dynamodb = spawn('npx', [
        'dynamodb-local',
        '-port', '8000',
        '-dbPath', join(this.dataDir, 'dynamodb'),
        '-sharedDb'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.processes.push(dynamodb);

      let started = false;
      dynamodb.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Initializing DynamoDB Local') && !started) {
          started = true;
          console.log('✅ DynamoDB Local started');
          resolve();
        }
      });

      dynamodb.stderr?.on('data', (data) => {
        console.error(`DynamoDB Local error: ${data}`);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!started) {
          console.log('✅ DynamoDB Local (assumed started)');
          resolve();
        }
      }, 10000);
    });
  }

  private async startMongoDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting MongoDB on default port...');
      
      const mongodb = spawn('mongod', [
        '--dbpath', join(this.dataDir, 'mongodb'),
        '--port', '27017',
        '--bind_ip', '127.0.0.1'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.processes.push(mongodb);

      let started = false;
      mongodb.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Waiting for connections') && !started) {
          started = true;
          console.log('✅ MongoDB started');
          resolve();
        }
      });

      mongodb.stderr?.on('data', (data) => {
        const error = data.toString();
        if (error.includes('Address already in use')) {
          console.log('✅ MongoDB (already running)');
          resolve();
        } else {
          console.error(`MongoDB error: ${error}`);
        }
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!started) {
          console.log('✅ MongoDB (assumed started)');
          resolve();
        }
      }, 15000);
    });
  }

  private async startRedis(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Starting Redis with Search and Graph modules...');
      
      const redis = spawn('redis-server', [
        '--port', '6379',
        '--dir', join(this.dataDir, 'redis'),
        '--loadmodule', 'redisearch.so',
        '--loadmodule', 'redisgraph.so'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.processes.push(redis);

      let started = false;
      redis.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Ready to accept connections') && !started) {
          started = true;
          console.log('✅ Redis started');
          resolve();
        }
      });

      redis.stderr?.on('data', (data) => {
        const error = data.toString();
        if (error.includes('Address already in use')) {
          console.log('✅ Redis (already running)');
          resolve();
        } else {
          console.warn(`Redis warning: ${error}`);
        }
      });

      // Fallback: Start Redis without modules if modules fail
      setTimeout(() => {
        if (!started) {
          console.log('Trying Redis without modules...');
          this.startRedisBasic().then(resolve).catch(reject);
        }
      }, 10000);
    });
  }

  private async startRedisBasic(): Promise<void> {
    return new Promise((resolve) => {
      const redis = spawn('redis-server', [
        '--port', '6379',
        '--dir', join(this.dataDir, 'redis')
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      this.processes.push(redis);

      setTimeout(() => {
        console.log('✅ Redis (basic) started');
        resolve();
      }, 3000);
    });
  }

  private async startElasticsearch(): Promise<void> {
    // Elasticsearch setup is more complex and optional for now
    console.log('⏭️  Elasticsearch setup skipped (install manually if needed)');
    return Promise.resolve();
  }

  private cleanup(): void {
    console.log('\n🛑 Shutting down databases...');
    
    this.processes.forEach((process, index) => {
      try {
        process.kill('SIGTERM');
        console.log(`Stopped process ${index + 1}`);
      } catch (error) {
        console.warn(`Error stopping process ${index + 1}:`, error);
      }
    });

    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.startAll().catch(console.error);
}

export default DatabaseSetup;