import { ConnectionManager } from '../src/connection-manager';
import { DatabaseConnection } from '../src/types';

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let mockDatabaseClient: any;
  let mockConfig: DatabaseConnection;

  beforeEach(() => {
    connectionManager = new ConnectionManager();
    mockDatabaseClient = {
      query: jest.fn(),
      close: jest.fn()
    };
    mockConfig = {
      id: 'test-connection',
      name: 'Test Database',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'testuser',
      password: 'testpass'
    };
  });

  describe('Connection Registration', () => {
    it('should register a database connection', () => {
      connectionManager.registerConnection('test-id', mockDatabaseClient, mockConfig);
      
      const connections = connectionManager.getActiveConnections();
      expect(connections.has('test-id')).toBe(true);
      expect(connections.get('test-id')?.config).toEqual(mockConfig);
    });

    it('should mark connection as connected', () => {
      connectionManager.registerConnection('test-id', mockDatabaseClient, mockConfig);
      
      const connection = connectionManager.getActiveConnections().get('test-id');
      expect(connection?.isConnected).toBe(true);
      expect(connection?.client).toBe(mockDatabaseClient);
    });

    it('should store connection configuration', () => {
      connectionManager.registerConnection('test-id', mockDatabaseClient, mockConfig);
      
      const configs = connectionManager.getConnectionConfigs();
      expect(configs.has('test-id')).toBe(true);
      expect(configs.get('test-id')).toEqual(mockConfig);
    });
  });

  describe('Query Execution', () => {
    beforeEach(() => {
      connectionManager.registerConnection('test-id', mockDatabaseClient, mockConfig);
    });

    it('should execute a universal query and return results', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Test' }] };
      mockDatabaseClient.query.mockResolvedValue(mockResult);

      const query = 'FIND users WHERE id = 1';
      const result = await connectionManager.executeQuery('test-id', query);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockResult);
      expect(result.translatedQuery).toBe("SELECT * FROM users WHERE id = 1;");
      expect(result.originalQuery).toBe(query);
    });

    it('should handle query parsing errors', async () => {
      const invalidQuery = 'INVALID QUERY SYNTAX';
      
      await expect(connectionManager.executeQuery('test-id', invalidQuery))
        .rejects.toThrow();
    });

    it('should handle database execution errors', async () => {
      const dbError = new Error('Database connection failed');
      mockDatabaseClient.query.mockRejectedValue(dbError);

      const query = 'FIND users';
      
      await expect(connectionManager.executeQuery('test-id', query))
        .rejects.toThrow('Database connection failed');
    });

    it('should throw error for non-existent connection', async () => {
      const query = 'FIND users';
      
      await expect(connectionManager.executeQuery('non-existent-id', query))
        .rejects.toThrow('No active connection found for ID: non-existent-id');
    });
  });

  describe('Multiple Database Types', () => {
    it('should handle PostgreSQL connections', async () => {
      const pgConfig = { ...mockConfig, type: 'postgresql' as const };
      connectionManager.registerConnection('pg-conn', mockDatabaseClient, pgConfig);

      mockDatabaseClient.query.mockResolvedValue({ rows: [] });

      const result = await connectionManager.executeQuery('pg-conn', 'FIND users');
      expect(result.translatedQuery).toBe("SELECT * FROM users;");
    });

    it('should handle MongoDB connections', async () => {
      const mongoConfig = { ...mockConfig, type: 'mongodb' as const };
      const mongoClient = {
        collection: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          })
        })
      };
      
      connectionManager.registerConnection('mongo-conn', mongoClient, mongoConfig);

      const result = await connectionManager.executeQuery('mongo-conn', 'FIND users');
      expect(result.translatedQuery).toEqual({
        collection: 'users',
        operation: 'find',
        query: {},
        projection: {}
      });
    });

    it('should handle DynamoDB connections', async () => {
      const dynamoConfig = { ...mockConfig, type: 'dynamodb' as const };
      const dynamoClient = {
        scan: jest.fn().mockReturnValue({
          promise: jest.fn().mockResolvedValue({ Items: [] })
        })
      };
      
      connectionManager.registerConnection('dynamo-conn', dynamoClient, dynamoConfig);

      const result = await connectionManager.executeQuery('dynamo-conn', 'FIND users');
      expect(result.translatedQuery).toEqual({
        TableName: 'users',
        operation: 'scan'
      });
    });

    it('should handle Elasticsearch connections', async () => {
      const esConfig = { ...mockConfig, type: 'elasticsearch' as const };
      const esClient = {
        search: jest.fn().mockResolvedValue({ body: { hits: { hits: [] } } })
      };
      
      connectionManager.registerConnection('es-conn', esClient, esConfig);

      const result = await connectionManager.executeQuery('es-conn', 'FIND users');
      expect(result.translatedQuery).toEqual({
        index: 'users',
        body: { query: { match_all: {} } }
      });
    });

    it('should handle Redis connections', async () => {
      const redisConfig = { ...mockConfig, type: 'redis' as const };
      const redisClient = {
        scan: jest.fn().mockResolvedValue(['0', []])
      };
      
      connectionManager.registerConnection('redis-conn', redisClient, redisConfig);

      const result = await connectionManager.executeQuery('redis-conn', 'FIND users');
      expect(result.translatedQuery).toEqual({
        operation: 'SCAN',
        pattern: 'users:*',
        count: 1000
      });
    });
  });

  describe('Connection Management', () => {
    it('should track last used timestamp', async () => {
      connectionManager.registerConnection('test-id', mockDatabaseClient, mockConfig);
      
      const beforeTime = new Date();
      mockDatabaseClient.query.mockResolvedValue({ rows: [] });
      
      await connectionManager.executeQuery('test-id', 'FIND users');
      
      const connection = connectionManager.getActiveConnections().get('test-id');
      expect(connection?.lastUsed.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('should remove connections', () => {
      connectionManager.registerConnection('test-id', mockDatabaseClient, mockConfig);
      expect(connectionManager.getActiveConnections().has('test-id')).toBe(true);
      
      connectionManager.removeConnection('test-id');
      expect(connectionManager.getActiveConnections().has('test-id')).toBe(false);
    });

    it('should list all active connections', () => {
      connectionManager.registerConnection('conn1', mockDatabaseClient, mockConfig);
      connectionManager.registerConnection('conn2', mockDatabaseClient, {
        ...mockConfig,
        id: 'conn2',
        name: 'Second Connection'
      });

      const connections = connectionManager.listConnections();
      expect(connections).toHaveLength(2);
      expect(connections[0].name).toBe('Test Database');
      expect(connections[1].name).toBe('Second Connection');
    });

    it('should check connection health', () => {
      connectionManager.registerConnection('test-id', mockDatabaseClient, mockConfig);
      
      const isHealthy = connectionManager.isConnectionHealthy('test-id');
      expect(isHealthy).toBe(true);
      
      const isHealthyNonExistent = connectionManager.isConnectionHealthy('non-existent');
      expect(isHealthyNonExistent).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed queries gracefully', async () => {
      connectionManager.registerConnection('test-id', mockDatabaseClient, mockConfig);
      
      const malformedQuery = 'FIND'; // Missing table name
      
      await expect(connectionManager.executeQuery('test-id', malformedQuery))
        .rejects.toThrow();
    });

    it('should provide detailed error information', async () => {
      connectionManager.registerConnection('test-id', mockDatabaseClient, mockConfig);
      
      const dbError = new Error('Table does not exist');
      mockDatabaseClient.query.mockRejectedValue(dbError);

      try {
        await connectionManager.executeQuery('test-id', 'FIND non_existent_table');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Table does not exist');
      }
    });
  });
});