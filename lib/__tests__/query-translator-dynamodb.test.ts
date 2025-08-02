import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

describe('QueryTranslator - DynamoDB', () => {
  describe('Basic DynamoDB Translation', () => {
    it('should translate simple FIND to DynamoDB Scan', () => {
      const query = QueryParser.parse('FIND products');
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'products',
        operation: 'scan'
      });
    });

    it('should translate FIND with field selection', () => {
      const query = QueryParser.parse(`FIND users
FIELDS name, email, age`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'users',
        operation: 'scan',
        ProjectionExpression: 'name, email, age'
      });
    });

    it('should translate LIMIT to DynamoDB', () => {
      const query = QueryParser.parse(`FIND users
LIMIT 10`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'users',
        operation: 'scan',
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
          '#sk': 'SK'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#123',
          ':sk_prefix': 'ORDER#'
        },
        FilterExpression: '#entity_type = :val0',
        ExpressionAttributeNames: {
          '#pk': 'PK',
          '#sk': 'SK',
          '#entity_type': 'entity_type'
        },
        ExpressionAttributeValues: {
          ':pk': 'TENANT#123',
          ':sk_prefix': 'ORDER#',
          ':val0': 'order'
        }
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
DB_SPECIFIC: {"dynamodb": {"gsiName": "user-status-index", "keyCondition": {"status": "active"}}}`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toEqual({
        TableName: 'users',
        operation: 'query',
        IndexName: 'user-status-index',
        KeyConditionExpression: '#status = :status',
        FilterExpression: '#age > :val0',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#age': 'age'
        },
        ExpressionAttributeValues: {
          ':status': 'active',
          ':val0': 25
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
      expect(dynamoQuery.ExpressionAttributeNames).toEqual({
        '#price': 'price',
        '#category': 'category'
      });
      expect(dynamoQuery.ExpressionAttributeValues).toEqual({
        ':val0': 100,
        ':val1': 'electronics'
      });
    });

    it('should handle complex filter expressions with various operators', () => {
      const query = QueryParser.parse(`FIND orders
WHERE amount >= 50 AND amount <= 500 AND status != 'cancelled'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toHaveProperty('FilterExpression');
      expect(dynamoQuery.FilterExpression).toContain('>=');
      expect(dynamoQuery.FilterExpression).toContain('<=');
      expect(dynamoQuery.FilterExpression).toContain('<>');
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
      
      expect(dynamoQuery.operation).toBe('scan');
      expect(dynamoQuery).toHaveProperty('FilterExpression');
    });

    it('should handle projection with field selection', () => {
      const query = QueryParser.parse(`FIND users
FIELDS id, name, email
WHERE id = 'user123'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery).toHaveProperty('ProjectionExpression', 'id, name, email');
    });
  });

  describe('DynamoDB Operator Translation', () => {
    it('should translate SQL operators to DynamoDB operators', () => {
      const query = QueryParser.parse(`FIND products
WHERE price >= 100 AND stock_count <= 50 AND category != 'discontinued'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery.FilterExpression).toContain('>=');
      expect(dynamoQuery.FilterExpression).toContain('<=');
      expect(dynamoQuery.FilterExpression).toContain('<>');
    });

    it('should handle IN operator', () => {
      const query = QueryParser.parse(`FIND users
WHERE status IN ['active', 'pending', 'verified']`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery.FilterExpression).toContain('IN');
      expect(dynamoQuery.ExpressionAttributeValues[':val0']).toEqual(['active', 'pending', 'verified']);
    });
  });

  describe('Performance Optimizations', () => {
    it('should prefer Query over Scan when partition key is available', () => {
      const query = QueryParser.parse(`FIND users
WHERE id = 'user123'`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery.operation).toBe('query');
      expect(dynamoQuery).toHaveProperty('KeyConditionExpression');
    });

    it('should use begins_with for sort key prefix matching', () => {
      const query = QueryParser.parse(`FIND orders
DB_SPECIFIC: {"sort_key_prefix": "ORDER#2024"}`);
      const dynamoQuery = QueryTranslator.toDynamoDB(query);
      
      expect(dynamoQuery.KeyConditionExpression).toContain('begins_with');
      expect(dynamoQuery.ExpressionAttributeValues[':sk_prefix']).toBe('ORDER#2024');
    });
  });
});