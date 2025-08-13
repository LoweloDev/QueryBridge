import { QueryParser, QueryTranslator } from '../src';

describe('DynamoDB Inline Attribute Configuration', () => {
  it('should use inline partition_key_attribute instead of schema config', () => {
    const universalQuery = 'FIND users DB_SPECIFIC: partition_key="USER#123", partition_key_attribute="custom_pk"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'users',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should use inline sort_key_attribute instead of schema config', () => {
    const universalQuery = 'FIND orders DB_SPECIFIC: partition_key="USER#123", sort_key_prefix="ORDER#", sort_key_attribute="custom_sk"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'orders',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should use inline attributes for both partition and sort keys', () => {
    const universalQuery = 'FIND items DB_SPECIFIC: partition_key="STORE#789", sort_key="ITEM#123", partition_key_attribute="entity_id", sort_key_attribute="entity_type"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'items',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should use inline partition_key_attribute with sort_key_prefix', () => {
    const universalQuery = 'FIND products DB_SPECIFIC: partition_key="CATEGORY#electronics", sort_key_prefix="PRODUCT#", partition_key_attribute="category_key"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'products',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should use inline sort_key_attribute with sort_key_prefix', () => {
    const universalQuery = 'FIND inventory DB_SPECIFIC: partition_key="WAREHOUSE#A", sort_key_prefix="ITEM#", sort_key_attribute="item_sort_key"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'inventory',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should trigger DB_SPECIFIC handling when only inline attributes are specified', () => {
    const universalQuery = 'FIND tables DB_SPECIFIC: partition_key_attribute="custom_pk", sort_key_attribute="custom_sk"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    // Should trigger DB_SPECIFIC handling but without actual key values, 
    // should not create KeyConditionExpression
    expect(result).toEqual({
      operation: 'QUERY',
      table: 'tables',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should fall back to defaults when no schema config and no inline attributes', () => {
    const universalQuery = 'FIND defaults DB_SPECIFIC: partition_key="DEFAULT#123", sort_key="ITEM#456"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'defaults',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should mix inline attributes with schema config fallback', () => {
    const universalQuery = 'FIND mixed DB_SPECIFIC: partition_key="MIX#123", sort_key="SORT#456", partition_key_attribute="override_pk"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'mixed',
      error: 'DynamoDB support will be implemented separately'
    });
  });
});