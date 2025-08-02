/**
 * Mock Database Manager
 * 
 * This provides actual mock database implementations that can execute queries,
 * not just return static data. Used only when real database connections fail.
 */

export class MockDatabaseManager {
  private mockDatabases: Map<string, MockDatabase> = new Map();

  /**
   * Create a mock database of specified type
   */
  createMockDatabase(connectionId: string, type: string): MockDatabase {
    let mockDb: MockDatabase;

    switch (type) {
      case 'postgresql':
      case 'mysql':
        mockDb = new MockSQLDatabase();
        break;
      case 'mongodb':
        mockDb = new MockMongoDatabase();
        break;
      case 'redis':
        mockDb = new MockRedisDatabase();
        break;
      case 'dynamodb':
        mockDb = new MockDynamoDBDatabase();
        break;
      case 'elasticsearch':
        mockDb = new MockElasticsearchDatabase();
        break;
      default:
        throw new Error(`Mock database not implemented for type: ${type}`);
    }

    this.mockDatabases.set(connectionId, mockDb);
    console.log(`Created mock ${type} database for connection ${connectionId}`);
    return mockDb;
  }

  getMockDatabase(connectionId: string): MockDatabase | undefined {
    return this.mockDatabases.get(connectionId);
  }

  removeMockDatabase(connectionId: string): void {
    this.mockDatabases.delete(connectionId);
  }
}

export abstract class MockDatabase {
  protected data: any[] = [];

  constructor() {
    this.seedData();
  }

  abstract execute(query: any): Promise<any>;
  protected abstract seedData(): void;
}

class MockSQLDatabase extends MockDatabase {
  protected seedData(): void {
    this.data = [
      { id: 1, name: "Alice Johnson", email: "alice@example.com", status: "active", created_at: new Date() },
      { id: 2, name: "Bob Smith", email: "bob@example.com", status: "active", created_at: new Date() },
      { id: 3, name: "Carol Williams", email: "carol@example.com", status: "inactive", created_at: new Date() },
      { id: 4, name: "David Brown", email: "david@example.com", status: "active", created_at: new Date() }
    ];
  }

  async execute(query: any): Promise<any> {
    if (typeof query === 'string') {
      // Parse basic SQL queries
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('select')) {
        let results = [...this.data];
        
        // Basic WHERE clause parsing
        if (lowerQuery.includes('where')) {
          const whereMatch = query.match(/where\s+(\w+)\s*=\s*['"](.*?)['"]|where\s+(\w+)\s*=\s*(\d+)/i);
          if (whereMatch) {
            const [, field1, value1, field2, value2] = whereMatch;
            const field = field1 || field2;
            const value = value1 || value2;
            
            results = results.filter(row => 
              row[field] && row[field].toString().toLowerCase() === value.toLowerCase()
            );
          }
        }
        
        // Basic LIMIT parsing
        const limitMatch = query.match(/limit\s+(\d+)/i);
        if (limitMatch) {
          const limit = parseInt(limitMatch[1]);
          results = results.slice(0, limit);
        }
        
        return { rows: results };
      }
    }
    
    return { rows: this.data };
  }
}

class MockMongoDatabase extends MockDatabase {
  protected seedData(): void {
    this.data = [
      { _id: "mock_001", name: "Alice Johnson", email: "alice@example.com", status: "active" },
      { _id: "mock_002", name: "Bob Smith", email: "bob@example.com", status: "active" },
      { _id: "mock_003", name: "Carol Williams", email: "carol@example.com", status: "inactive" },
      { _id: "mock_004", name: "David Brown", email: "david@example.com", status: "active" }
    ];
  }

  async execute(query: any): Promise<any> {
    if (query.operation === 'find') {
      let results = [...this.data];
      
      // Apply filter
      if (query.filter) {
        results = results.filter(doc => {
          return Object.entries(query.filter).every(([key, value]) => {
            return doc[key] === value;
          });
        });
      }
      
      // Apply projection
      if (query.projection) {
        results = results.map(doc => {
          const projected: any = {};
          for (const field of Object.keys(query.projection)) {
            if (query.projection[field] === 1 && doc[field] !== undefined) {
              projected[field] = doc[field];
            }
          }
          return projected;
        });
      }
      
      // Apply limit
      if (query.limit) {
        results = results.slice(0, query.limit);
      }
      
      return results;
    }
    
    return this.data;
  }
}

class MockRedisDatabase extends MockDatabase {
  private keyValueStore: Map<string, string> = new Map();

  protected seedData(): void {
    this.keyValueStore.set('user:1', JSON.stringify({ name: "Alice Johnson", status: "active" }));
    this.keyValueStore.set('user:2', JSON.stringify({ name: "Bob Smith", status: "active" }));
    this.keyValueStore.set('user:3', JSON.stringify({ name: "Carol Williams", status: "inactive" }));
    this.keyValueStore.set('session:abc123', '{"userId": 1, "active": true}');
  }

  async execute(query: any): Promise<any> {
    if (query.operation === 'get') {
      return this.keyValueStore.get(query.key) || null;
    }
    
    if (query.operation === 'keys') {
      const pattern = query.pattern || '*';
      const keys = Array.from(this.keyValueStore.keys());
      
      if (pattern === '*') {
        return { keys };
      }
      
      // Simple pattern matching
      const regex = new RegExp(pattern.replace('*', '.*'));
      return { keys: keys.filter(key => regex.test(key)) };
    }
    
    return { keys: Array.from(this.keyValueStore.keys()) };
  }
}

class MockDynamoDBDatabase extends MockDatabase {
  protected seedData(): void {
    this.data = [
      { 
        PK: { S: "TENANT#123" }, 
        SK: { S: "USER#1" }, 
        name: { S: "Alice Johnson" }, 
        status: { S: "active" },
        entity_type: { S: "user" }
      },
      { 
        PK: { S: "TENANT#123" }, 
        SK: { S: "USER#2" }, 
        name: { S: "Bob Smith" }, 
        status: { S: "active" },
        entity_type: { S: "user" }
      },
      { 
        PK: { S: "TENANT#456" }, 
        SK: { S: "USER#3" }, 
        name: { S: "Carol Williams" }, 
        status: { S: "inactive" },
        entity_type: { S: "user" }
      }
    ];
  }

  async execute(query: any): Promise<any> {
    if (query.operation === 'scan') {
      let results = [...this.data];
      
      // Apply filter expressions (basic)
      if (query.FilterExpression) {
        // Very basic filter parsing - in real implementation would be more sophisticated
        results = results.filter(item => {
          if (query.FilterExpression.includes('active')) {
            return item.status?.S === 'active';
          }
          return true;
        });
      }
      
      return { Items: results };
    }
    
    if (query.operation === 'query') {
      // Basic key condition handling
      let results = this.data;
      
      if (query.KeyConditionExpression) {
        // Simple PK matching
        const pkMatch = query.KeyConditionExpression.match(/PK\s*=\s*:pk/);
        if (pkMatch && query.ExpressionAttributeValues?.[':pk']) {
          const pkValue = query.ExpressionAttributeValues[':pk'].S;
          results = results.filter(item => item.PK.S === pkValue);
        }
      }
      
      return { Items: results };
    }
    
    return { Items: this.data };
  }
}

class MockElasticsearchDatabase extends MockDatabase {
  protected seedData(): void {
    this.data = [
      { name: "Alice Johnson", email: "alice@example.com", status: "active", score: 1.0 },
      { name: "Bob Smith", email: "bob@example.com", status: "active", score: 0.95 },
      { name: "Carol Williams", email: "carol@example.com", status: "inactive", score: 0.8 },
      { name: "David Brown", email: "david@example.com", status: "active", score: 0.9 }
    ];
  }

  async execute(query: any): Promise<any> {
    let results = [...this.data];
    
    if (query.body?.query) {
      // Handle different query types
      if (query.body.query.match_all) {
        // Return all documents
      } else if (query.body.query.match) {
        // Basic text matching
        const field = Object.keys(query.body.query.match)[0];
        const value = query.body.query.match[field];
        
        results = results.filter(doc => 
          doc[field] && doc[field].toString().toLowerCase().includes(value.toLowerCase())
        );
      } else if (query.body.query.term) {
        // Exact term matching
        const field = Object.keys(query.body.query.term)[0];
        const value = query.body.query.term[field];
        
        results = results.filter(doc => doc[field] === value);
      }
    }
    
    // Apply size limit
    if (query.body?.size) {
      results = results.slice(0, query.body.size);
    }
    
    return {
      hits: {
        total: { value: results.length, relation: "eq" },
        hits: results.map(doc => ({
          _source: doc,
          _score: doc.score || 1.0
        }))
      }
    };
  }
}