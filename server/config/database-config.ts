export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mongodb' | 'elasticsearch' | 'dynamodb' | 'redis';
  config: Record<string, any>;
}

export interface DatabaseConfig {
  connections: DatabaseConnection[];
  // Future: Authentication, SSL, connection pools, etc.
}

// Default configuration for local development
export const localDatabaseConfig: DatabaseConfig = {
  connections: [
    {
      id: 'postgresql-local',
      name: 'PostgreSQL - Local',
      type: 'postgresql',
      config: {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'postgres',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        ssl: false
      }
    },
    {
      id: 'mongodb-local',
      name: 'MongoDB - Local',
      type: 'mongodb',
      config: {
        url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
        database: 'queryflow_dev',
        options: {
          useUnifiedTopology: true,
          maxPoolSize: 10
        }
      }
    },
    {
      id: 'dynamodb-local',
      name: 'DynamoDB - Local',
      type: 'dynamodb',
      config: {
        region: 'local',
        endpoint: 'http://localhost:8000',
        accessKeyId: 'local',
        secretAccessKey: 'local',
        ssl: false
      }
    },
    {
      id: 'elasticsearch-postgresql',
      name: 'Elasticsearch - PostgreSQL Layer',
      type: 'elasticsearch',
      config: {
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        indexPattern: 'postgresql_*',
        sourceDatabase: 'postgresql-local'
      }
    },
    {
      id: 'elasticsearch-dynamodb',
      name: 'Elasticsearch - DynamoDB Layer',
      type: 'elasticsearch',
      config: {
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9201',
        indexPattern: 'dynamodb_*',
        sourceDatabase: 'dynamodb-local'
      }
    },
    {
      id: 'redis-local',
      name: 'Redis - Local',
      type: 'redis',
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        modules: ['search', 'graph']
      }
    }
  ]
};