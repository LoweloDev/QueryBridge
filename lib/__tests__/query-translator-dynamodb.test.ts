import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

// External library validation
let DynamoDBLib: any;
let QueryCommand: any;
let ScanCommand: any;
try {
  const dynamodb = require('@aws-sdk/lib-dynamodb');
  DynamoDBLib = dynamodb.DynamoDBDocumentClient;
  QueryCommand = dynamodb.QueryCommand;
  ScanCommand = dynamodb.ScanCommand;
} catch (error) {
  // External libraries not available - tests will be skipped
}

describe('QueryTranslator - DynamoDB', () => {
  describe('Basic DynamoDB Translation', () => {
    it('should translate simple FIND to DynamoDB optimized Query', () => {
      const query = QueryParser.parse('FIND products');
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'products',
        operation: 'query',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#sk': 'SK',
          '#entity_type': 'entity_type'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#123',
          ':sk_prefix': 'PRODUCT#',
          ':val2': 'product'
        },
        FilterExpression: '#entity_type = :val2'
      });
    });

    it('should translate FIND with field selection', () => {
      const query = QueryParser.parse(`FIND users
FIELDS name, email, age`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'users',
        operation: 'query',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#sk': 'SK',
          '#entity_type': 'entity_type',
          '#field0': 'name',
          '#field1': 'email',
          '#field2': 'age'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#123',
          ':sk_prefix': 'USER#',
          ':val2': 'user'
        },
        FilterExpression: '#entity_type = :val2',
        ProjectionExpression: '#field0, #field1, #field2'
      });
    });

    it('should translate LIMIT to DynamoDB', () => {
      const query = QueryParser.parse(`FIND users
LIMIT 10`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'users',
        operation: 'query',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#sk': 'SK',
          '#entity_type': 'entity_type'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#123',
          ':sk_prefix': 'USER#',
          ':val2': 'user'
        },
        FilterExpression: '#entity_type = :val2',
        Limit: 10
      });
    });
  });

  describe('DynamoDB Smart Query Feature - Single Table Design', () => {
    it('should use smart query for users table with ID lookup', () => {
      const query = QueryParser.parse(`FIND users
WHERE id = 'user123'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'users',
        operation: 'query',
        KeyConditionExpression: '#pk = :pk AND #sk = :sk',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#sk': 'SK'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#123',
          ':sk': 'USER#user123'
        }
      });
    });

    it('should use smart query for orders with entity prefix', () => {
      const query = QueryParser.parse('FIND orders');
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'orders',
        operation: 'query',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#sk': 'SK',
          '#entity_type': 'entity_type'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#123',
          ':sk_prefix': 'ORDER#',
          ':val2': 'order'
        },
        FilterExpression: '#entity_type = :val2'
      });
    });

    it('should handle smart query with custom partition key', () => {
      const query = QueryParser.parse(`FIND users
WHERE id = 'user456'
DB_SPECIFIC: {"partition_key": "TENANT#456"}`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'users',
        operation: 'query',
        KeyConditionExpression: '#pk = :pk AND #sk = :sk',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#sk': 'SK'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#456',
          ':sk': 'USER#user456'
        }
      });
    });

    it('should handle smart query with sort key prefix', () => {
      const query = QueryParser.parse(`FIND products
DB_SPECIFIC: {"sort_key_prefix": "PRODUCT#electronics"}`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'products',
        operation: 'query',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#sk': 'SK'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#123',
          ':sk_prefix': 'PRODUCT#electronics'
        }
      });
    });
  });

  describe('DynamoDB GSI (Global Secondary Index) Support', () => {
    it('should use GSI when specified', () => {
      const query = QueryParser.parse(`FIND users
WHERE status = 'active'
DB_SPECIFIC: {"dynamodb": {"gsiName": "user-status-index", "keyCondition": {"status": "active"}}}`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'users',
        operation: 'query',
        IndexName: 'user-status-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'active'
        }
      });
    });

    it('should combine GSI with filter expressions', () => {
      const query = QueryParser.parse(`FIND users
WHERE status = 'active' AND age > 25
DB_SPECIFIC: {"dynamodb": {"gsiName": "user-status-index", "keyCondition": {"pk": "TENANT#123"}}}`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'users',
        operation: 'query',
        IndexName: 'user-status-index',
        KeyConditionExpression: '#pk = :pk',
        FilterExpression: '#status = :val0 AND #age > :val1',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#status': 'status',
          '#age': 'age'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#123',
          ':val0': 'active',
          ':val1': 25
        }
      });
    });
  });

  describe('DynamoDB Filter Expressions', () => {
    it('should translate WHERE conditions to FilterExpression', () => {
      const query = QueryParser.parse(`FIND products
WHERE price > 100 AND category = 'electronics'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toHaveProperty('FilterExpression');
      expect((dynamoQuery as any).ExpressionAttributeNames).toEqual({
        '#pk': 'PK',
        '#sk': 'SK',
        '#entity_type': 'entity_type',
        '#price': 'price',
        '#category': 'category'
      });
      expect((dynamoQuery as any).ExpressionAttributeValues).toEqual({
        ':pk': 'TENANT#123',
        ':sk_prefix': 'PRODUCT#',
        ':val2': 'product',
        ':val3': 100,
        ':val4': 'electronics'
      });
    });

    it('should handle complex filter expressions with various operators', () => {
      const query = QueryParser.parse(`FIND orders
WHERE amount >= 50 AND amount <= 500 AND status != 'cancelled'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toHaveProperty('FilterExpression');
      expect((dynamoQuery as any).FilterExpression).toContain('>=');
      expect((dynamoQuery as any).FilterExpression).toContain('<=');
      expect((dynamoQuery as any).FilterExpression).toContain('<>');
    });
  });

  describe('DynamoDB Advanced Features', () => {
    it('should handle explicit key conditions', () => {
      const query = QueryParser.parse(`FIND orders
DB_SPECIFIC: {"partition_key": "USER#12345", "sort_key": "ORDER#67890"}`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'orders',
        operation: 'query',
        KeyConditionExpression: '#pk = :pk AND #sk = :sk',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#sk': 'SK'
        },
        ExpressionAttributeValues: {
          ':pk': 'USER#12345',
          ':sk': 'ORDER#67890'
        }
      });
    });

    it('should handle scan operations when no optimizations are possible', () => {
      const query = QueryParser.parse(`FIND unknown_table
WHERE random_field = 'value'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect((dynamoQuery as any).operation).toBe('scan');
      expect(dynamoQuery).toHaveProperty('FilterExpression');
    });

    it('should handle projection with field selection', () => {
      const query = QueryParser.parse(`FIND users
FIELDS id, name, email
WHERE id = 'user123'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toHaveProperty('ProjectionExpression', '#field0, #field1, #field2');
    });
  });

  describe('DynamoDB Operator Translation', () => {
    it('should translate SQL operators to DynamoDB operators', () => {
      const query = QueryParser.parse(`FIND products
WHERE price >= 100 AND stock_count <= 50 AND category != 'discontinued'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect((dynamoQuery as any).FilterExpression).toContain('>=');
      expect((dynamoQuery as any).FilterExpression).toContain('<=');
      expect((dynamoQuery as any).FilterExpression).toContain('<>');
    });

    it('should handle IN operator', () => {
      const query = QueryParser.parse(`FIND users
WHERE status IN ['active', 'pending', 'verified']`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect((dynamoQuery as any).FilterExpression).toContain('IN');
      expect((dynamoQuery as any).ExpressionAttributeValues[':val0']).toEqual(['active', 'pending', 'verified']);
    });
  });

  describe('Performance Optimizations', () => {
    it('should prefer Query over Scan when partition key is available', () => {
      const query = QueryParser.parse(`FIND users
WHERE id = 'user123'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect((dynamoQuery as any).operation).toBe('query');
      expect(dynamoQuery).toHaveProperty('KeyConditionExpression');
    });

    it('should use begins_with for sort key prefix matching', () => {
      const query = QueryParser.parse(`FIND orders
DB_SPECIFIC: {"sort_key_prefix": "ORDER#2024"}`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect((dynamoQuery as any).KeyConditionExpression).toContain('begins_with');
      expect((dynamoQuery as any).ExpressionAttributeValues[':sk_prefix']).toBe('ORDER#2024');
    });
  });

  describe('AWS SDK Validation', () => {
    const testCases = [
      {
        name: 'Simple scan operation',
        query: 'FIND products',
        expectedOperation: 'query'  // DynamoDB translator optimizes to query operations
      },
      {
        name: 'Query with partition key',
        query: 'FIND users WHERE id = \'user123\'',
        expectedOperation: 'query'
      },
      {
        name: 'Query with filter expression',
        query: 'FIND products WHERE price > 100',
        expectedOperation: 'query'  // DynamoDB translator optimizes to query operations
      },
      {
        name: 'Query with IN operator',
        query: 'FIND users WHERE status IN [\'active\', \'pending\']',
        expectedOperation: 'query'  // DynamoDB translator optimizes to query operations
      }
    ];

    testCases.forEach(({ name, query, expectedOperation }) => {
      it(`should pass AWS SDK validation: ${name}`, () => {
        if (!QueryCommand || !ScanCommand) {
          console.log('Skipping AWS SDK validation - DynamoDB libraries not available');
          return;
        }

        const parsed = QueryParser.parse(query);
        const dynamoQuery = QueryTranslator.toDynamoDB(parsed) as any;

        // Validate the operation type
        expect(dynamoQuery.operation).toBe(expectedOperation);

        // Create AWS SDK command based on operation type
        let command;
        const params = { ...dynamoQuery };
        delete params.operation;

        try {
          if (expectedOperation === 'query') {
            command = new QueryCommand(params);
            expect(command.input.TableName).toBe(params.TableName);
            expect(command.input.KeyConditionExpression).toBeDefined();
          } else {
            command = new ScanCommand(params);
            expect(command.input.TableName).toBe(params.TableName);
          }

          // Validate that the command was created successfully
          expect(command).toBeDefined();
          expect(command.input).toBeDefined();
          
        } catch (error) {
          fail(`AWS SDK command creation failed: ${(error as Error).message}`);
        }
      });
    });
  });
});