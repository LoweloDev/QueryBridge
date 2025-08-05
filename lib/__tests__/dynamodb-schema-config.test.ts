/**
 * Test DynamoDB Schema Configuration
 * This file tests the new configuration-based approach for DynamoDB key names
 */

import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

describe('DynamoDB Schema Configuration', () => {
  
  it('should use configured partition key name instead of hardcoded PK', () => {
    const query = QueryParser.parse(`
      FIND users
      DB_SPECIFIC: partition_key="USER#123"
    `);
    
    const schemaConfig = {
      partitionKey: 'userId',  // Custom key name
      sortKey: 'timestamp'
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    expect(result).toMatchObject({
      TableName: 'users',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'userId'  // Should use configured name, not 'PK'
      },
      ExpressionAttributeValues: {
        ':pk': 'USER#123'
      }
    });
  });

  it('should use configured sort key name instead of hardcoded SK', () => {
    const query = QueryParser.parse(`
      FIND orders
      DB_SPECIFIC: partition_key="USER#123", sort_key_prefix="ORDER#"
    `);
    
    const schemaConfig = {
      partitionKey: 'customPK',
      sortKey: 'customSK'
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    expect(result).toMatchObject({
      TableName: 'orders',
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
      ExpressionAttributeNames: {
        '#pk': 'customPK',
        '#sk': 'customSK'  // Should use configured name, not 'SK'
      },
      ExpressionAttributeValues: {
        ':pk': 'USER#123',
        ':sk_prefix': 'ORDER#'
      }
    });
  });

  it('should fall back to PK/SK when no schema config provided', () => {
    const query = QueryParser.parse(`
      FIND users
      DB_SPECIFIC: partition_key="USER#123"
    `);
    
    // No schema config provided
    const result = QueryTranslator.toDynamoDB(query);
    
    expect(result).toMatchObject({
      TableName: 'users',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'PK'  // Should fall back to default
      },
      ExpressionAttributeValues: {
        ':pk': 'USER#123'
      }
    });
  });

  it('should handle traditional table design with id field', () => {
    const query = QueryParser.parse(`
      FIND products
      WHERE id = "product-123"
    `);
    
    const schemaConfig = {
      partitionKey: 'productId',  // Traditional table design
      // No sort key
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    expect(result).toMatchObject({
      TableName: 'products',
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: {
        '#id': 'productId'  // Should use configured partition key name
      },
      ExpressionAttributeValues: {
        ':id': 'product-123'
      }
    });
  });

});