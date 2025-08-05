import { QueryParser } from '../src/query-parser';
import { QueryTranslator } from '../src/query-translator';

describe('DynamoDB Inline Attribute Configuration', () => {
  
  it('should use inline partition_key_attribute instead of schema config', () => {
    const query = QueryParser.parse(`
      FIND users
      DB_SPECIFIC: partition_key="USER#123", partition_key_attribute="custom_pk"
    `);
    
    const schemaConfig = {
      partitionKey: 'userId',  // This should be overridden
      sortKey: 'timestamp'
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    expect(result).toMatchObject({
      TableName: 'users',
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'custom_pk'  // Should use inline attribute, not 'userId'
      },
      ExpressionAttributeValues: {
        ':pk': 'USER#123'
      }
    });
  });

  it('should use inline sort_key_attribute instead of schema config', () => {
    const query = QueryParser.parse(`
      FIND orders
      DB_SPECIFIC: partition_key="USER#123", sort_key="ORDER#456", sort_key_attribute="custom_sk"
    `);
    
    const schemaConfig = {
      partitionKey: 'pk',
      sortKey: 'sk'  // This should be overridden
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    expect(result).toMatchObject({
      TableName: 'orders',
      KeyConditionExpression: '#pk = :pk AND #sk = :sk',
      ExpressionAttributeNames: {
        '#pk': 'pk',
        '#sk': 'custom_sk'  // Should use inline attribute, not 'sk'
      },
      ExpressionAttributeValues: {
        ':pk': 'USER#123',
        ':sk': 'ORDER#456'
      }
    });
  });

  it('should use inline attributes for both partition and sort keys', () => {
    const query = QueryParser.parse(`
      FIND items
      DB_SPECIFIC: partition_key="STORE#789", sort_key="ITEM#123", partition_key_attribute="entity_id", sort_key_attribute="entity_type"
    `);
    
    const schemaConfig = {
      partitionKey: 'PK',  // Both should be overridden
      sortKey: 'SK'
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    expect(result).toMatchObject({
      TableName: 'items',
      KeyConditionExpression: '#pk = :pk AND #sk = :sk',
      ExpressionAttributeNames: {
        '#pk': 'entity_id',  // Should use inline attribute
        '#sk': 'entity_type'  // Should use inline attribute
      },
      ExpressionAttributeValues: {
        ':pk': 'STORE#789',
        ':sk': 'ITEM#123'
      }
    });
  });

  it('should use inline partition_key_attribute with sort_key_prefix', () => {
    const query = QueryParser.parse(`
      FIND products
      DB_SPECIFIC: partition_key="CATEGORY#electronics", sort_key_prefix="PRODUCT#", partition_key_attribute="category_key"
    `);
    
    const schemaConfig = {
      partitionKey: 'pk',
      sortKey: 'sk'
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    expect(result).toMatchObject({
      TableName: 'products',
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
      ExpressionAttributeNames: {
        '#pk': 'category_key',  // Should use inline attribute
        '#sk': 'sk'  // Should use schema config since no inline override
      },
      ExpressionAttributeValues: {
        ':pk': 'CATEGORY#electronics',
        ':sk_prefix': 'PRODUCT#'
      }
    });
  });

  it('should use inline sort_key_attribute with sort_key_prefix', () => {
    const query = QueryParser.parse(`
      FIND inventory
      DB_SPECIFIC: partition_key="WAREHOUSE#A", sort_key_prefix="ITEM#", sort_key_attribute="item_sort_key"
    `);
    
    const schemaConfig = {
      partitionKey: 'warehouse_id',
      sortKey: 'item_id'
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    expect(result).toMatchObject({
      TableName: 'inventory',
      KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :sk_prefix)',
      ExpressionAttributeNames: {
        '#pk': 'warehouse_id',  // Should use schema config since no inline override
        '#sk': 'item_sort_key'  // Should use inline attribute
      },
      ExpressionAttributeValues: {
        ':pk': 'WAREHOUSE#A',
        ':sk_prefix': 'ITEM#'
      }
    });
  });

  it('should trigger DB_SPECIFIC handling when only inline attributes are specified', () => {
    const query = QueryParser.parse(`
      FIND tables
      DB_SPECIFIC: partition_key_attribute="custom_partition", sort_key_attribute="custom_sort"
    `);
    
    const schemaConfig = {
      partitionKey: 'PK',
      sortKey: 'SK'
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    // Should trigger DB_SPECIFIC handling but without actual key values, 
    // should not create KeyConditionExpression
    expect(result).toMatchObject({
      TableName: 'tables'
    });
    expect(result).not.toHaveProperty('KeyConditionExpression');
  });

  it('should fall back to defaults when no schema config and no inline attributes', () => {
    const query = QueryParser.parse(`
      FIND defaults
      DB_SPECIFIC: partition_key="DEFAULT#123", sort_key="ITEM#456"
    `);
    
    // No schema config provided
    const result = QueryTranslator.toDynamoDB(query);
    
    expect(result).toMatchObject({
      TableName: 'defaults',
      KeyConditionExpression: '#pk = :pk AND #sk = :sk',
      ExpressionAttributeNames: {
        '#pk': 'PK',  // Should use default
        '#sk': 'SK'   // Should use default
      },
      ExpressionAttributeValues: {
        ':pk': 'DEFAULT#123',
        ':sk': 'ITEM#456'
      }
    });
  });

  it('should mix inline attributes with schema config fallback', () => {
    const query = QueryParser.parse(`
      FIND mixed
      DB_SPECIFIC: partition_key="MIX#123", sort_key="SORT#456", partition_key_attribute="override_pk"
    `);
    
    const schemaConfig = {
      partitionKey: 'original_pk',
      sortKey: 'configured_sk'
    };
    
    const result = QueryTranslator.toDynamoDB(query, schemaConfig);
    
    expect(result).toMatchObject({
      TableName: 'mixed',
      KeyConditionExpression: '#pk = :pk AND #sk = :sk',
      ExpressionAttributeNames: {
        '#pk': 'override_pk',     // Should use inline override
        '#sk': 'configured_sk'    // Should use schema config (no inline override)
      },
      ExpressionAttributeValues: {
        ':pk': 'MIX#123',
        ':sk': 'SORT#456'
      }
    });
  });
});