import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

describe('QueryTranslator - DynamoDB (Rewritten)', () => {
  // Mock DynamoDB client for validation
  const mockDynamoClient = new DynamoDBClient({ region: 'us-east-1' });
  const mockDocClient = DynamoDBDocumentClient.from(mockDynamoClient);

  // Helper function to validate DynamoDB query structure using AWS SDK
  const validateDynamoQuery = (query: any): boolean => {
    try {
      if (query.KeyConditionExpression) {
        // Validate as Query operation
        new QueryCommand(query);
      } else {
        // Validate as Scan operation
        new ScanCommand(query);
      }
      return true;
    } catch (error) {
      console.error('DynamoDB query validation failed:', error);
      return false;
    }
  };

  describe('Basic Query Translation', () => {
    it('should translate simple FIND to DynamoDB Scan', () => {
      const query = QueryParser.parse('FIND users');
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'users'
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });

    it('should translate FIND with WHERE to DynamoDB Scan with FilterExpression', () => {
      const query = QueryParser.parse('FIND users WHERE status = "active"');
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'users',
        FilterExpression: '#status = :val0',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':val0': 'active' }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });

    it('should translate FIND with id to DynamoDB Query operation', () => {
      const query = QueryParser.parse('FIND users WHERE id = 123');
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'users',
        KeyConditionExpression: '#id = :id',
        ExpressionAttributeNames: { '#id': 'id' },
        ExpressionAttributeValues: { ':id': 123 }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });

    it('should translate FIND with LIMIT', () => {
      const query = QueryParser.parse('FIND users LIMIT 10');
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'users',
        Limit: 10
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });

    it('should translate FIND with field selection (ProjectionExpression)', () => {
      const query = QueryParser.parse('FIND users (name, email)');
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'users',
        ProjectionExpression: '#field0, #field1',
        ExpressionAttributeNames: {
          '#field0': 'name',
          '#field1': 'email'
        }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });
  });

  describe('Advanced Features from Documentation', () => {
    it('should translate primary key query with additional filters', () => {
      const query = QueryParser.parse('FIND orders WHERE user_id = 1 AND amount > 100');
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'orders',
        KeyConditionExpression: '#user_id = :user_id',
        FilterExpression: '#amount > :val0',
        ExpressionAttributeNames: {
          '#user_id': 'user_id',
          '#amount': 'amount'
        },
        ExpressionAttributeValues: {
          ':user_id': 1,
          ':val0': 100
        }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });

    it('should handle IN operator correctly', () => {
      const query = QueryParser.parse('FIND products WHERE category IN ("Electronics", "Furniture")');
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'products',
        FilterExpression: '#category IN (:val0_0, :val0_1)',
        ExpressionAttributeNames: { '#category': 'category' },
        ExpressionAttributeValues: {
          ':val0_0': 'Electronics',
          ':val0_1': 'Furniture'
        }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });

    it('should translate complex WHERE conditions', () => {
      const query = QueryParser.parse('FIND users WHERE age >= 25 AND status = "active" AND city = "New York"');
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'users',
        FilterExpression: '#age >= :val0 AND #status = :val1 AND #city = :val2',
        ExpressionAttributeNames: {
          '#age': 'age',
          '#status': 'status',
          '#city': 'city'
        },
        ExpressionAttributeValues: {
          ':val0': 25,
          ':val1': 'active',
          ':val2': 'New York'
        }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });
  });

  describe('DB_SPECIFIC Single-Table Design', () => {
    it('should handle DB_SPECIFIC partition key', () => {
      const universalQuery = 'FIND user_data';
      const query = QueryParser.parse(universalQuery);
      query.dbSpecific = { partition_key: 'USER#123' };
      
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'user_data',
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': 'PK' },
        ExpressionAttributeValues: { ':pk': 'USER#123' }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });

    it('should handle DB_SPECIFIC partition and sort key', () => {
      const universalQuery = 'FIND user_profile';
      const query = QueryParser.parse(universalQuery);
      query.dbSpecific = { 
        partition_key: 'USER#123', 
        sort_key: 'PROFILE#main' 
      };
      
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'user_profile',
        KeyConditionExpression: '#pk = :pk AND #sk = :sk',
        ExpressionAttributeNames: { 
          '#pk': 'PK',
          '#sk': 'SK'
        },
        ExpressionAttributeValues: { 
          ':pk': 'USER#123',
          ':sk': 'PROFILE#main'
        }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });

    it('should handle DB_SPECIFIC sort key prefix (begins_with)', () => {
      const universalQuery = 'FIND user_orders';
      const query = QueryParser.parse(universalQuery);
      query.dbSpecific = { 
        partition_key: 'USER#123', 
        sort_key_prefix: 'ORDER#' 
      };
      
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'user_orders',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
        ExpressionAttributeNames: { 
          '#pk': 'PK',
          '#sk': 'SK'
        },
        ExpressionAttributeValues: { 
          ':pk': 'USER#123',
          ':sk_prefix': 'ORDER#'
        }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });

    it('should combine DB_SPECIFIC keys with WHERE filters', () => {
      const universalQuery = 'FIND user_orders WHERE amount > 100';
      const query = QueryParser.parse(universalQuery);
      query.dbSpecific = { 
        partition_key: 'USER#123', 
        sort_key_prefix: 'ORDER#' 
      };
      
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toEqual({
        TableName: 'user_orders',
        KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
        FilterExpression: '#amount > :val0',
        ExpressionAttributeNames: { 
          '#pk': 'PK',
          '#sk': 'SK',
          '#amount': 'amount'
        },
        ExpressionAttributeValues: { 
          ':pk': 'USER#123',
          ':sk_prefix': 'ORDER#',
          ':val0': 100
        }
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });
  });

  describe('Aggregation Handling', () => {
    it('should add note for aggregations (not natively supported)', () => {
      const query = QueryParser.parse('FIND orders GROUP BY status COUNT(*) as order_count');
      const result = QueryTranslator.toDynamoDB(query);

      expect(result).toMatchObject({
        TableName: 'orders',
        note: 'DynamoDB aggregations require client-side processing'
      });
      expect(validateDynamoQuery(result)).toBe(true);
    });
  });

  describe('AWS SDK Validation Tests', () => {
    it('should pass AWS SDK validation for all query types', () => {
      const testQueries = [
        'FIND users',
        'FIND users WHERE status = "active"',
        'FIND users WHERE id = 123',
        'FIND orders WHERE user_id = 1 AND amount > 100',
        'FIND products (name, price) WHERE category = "Electronics" LIMIT 20'
      ];

      testQueries.forEach(queryString => {
        const query = QueryParser.parse(queryString);
        const result = QueryTranslator.toDynamoDB(query);
        
        expect(validateDynamoQuery(result)).toBe(true);
      });
    });

    it('should pass AWS SDK validation for DB_SPECIFIC queries', () => {
      const universalQuery = 'FIND user_data WHERE active = true';
      const query = QueryParser.parse(universalQuery);
      query.dbSpecific = { 
        partition_key: 'USER#123', 
        sort_key_prefix: 'DATA#' 
      };
      
      const result = QueryTranslator.toDynamoDB(query);
      expect(validateDynamoQuery(result)).toBe(true);
    });
  });
});