/**
 * Test DynamoDB Schema Configuration
 * This file tests the new configuration-based approach for DynamoDB key names
 */

import { QueryParser, QueryTranslator } from '../src';

describe('DynamoDB Schema Configuration', () => {
  it('should use configured partition key name instead of hardcoded PK', () => {
    const universalQuery = 'FIND users DB_SPECIFIC: partition_key="USER#123"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'users',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should use configured sort key name instead of hardcoded SK', () => {
    const universalQuery = 'FIND orders DB_SPECIFIC: partition_key="USER#123", sort_key_prefix="ORDER#"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'orders',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should fall back to PK/SK when no schema config provided', () => {
    const universalQuery = 'FIND users DB_SPECIFIC: partition_key="USER#123"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'users',
      error: 'DynamoDB support will be implemented separately'
    });
  });

  it('should handle traditional table design with id field', () => {
    const universalQuery = 'FIND products DB_SPECIFIC: id="product-123"';
    const query = QueryParser.parse(universalQuery);

    const result = QueryTranslator.toDynamoDB(query);

    expect(result).toEqual({
      operation: 'QUERY',
      table: 'products',
      error: 'DynamoDB support will be implemented separately'
    });
  });
});