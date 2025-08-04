/**
 * Test complex Redis query generation that matches the screenshot scenario
 */

import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

describe('Redis Complex Query Generation', () => {
  
  it('should generate comprehensive Redis query for complex WHERE conditions, ORDER BY, and aggregations', () => {
    const query = QueryParser.parse(`
      FIND users
      WHERE
        age > 25 AND
        status = "active" AND
        created_at > "2023-01-01"
      ORDER BY created_at DESC
      LIMIT 50
      AGGREGATE
        count: COUNT(*),
        avg_age: AVG(age),
        total_orders: SUM(order_count)
      GROUP BY status
    `);
    
    const result = QueryTranslator.toRedis(query) as any;
    
    // Should now generate a comprehensive Redis Search query instead of basic SCAN
    expect(result).toMatchObject({
      operation: 'FT.SEARCH',
      index: 'users_idx',
      query: expect.stringContaining('@age:[25 +inf]'),
      limit: { offset: 0, num: 50 },
      sortBy: { field: 'created_at', direction: 'DESC' },
      aggregations: expect.arrayContaining([
        expect.objectContaining({ function: 'COUNT' }),
        expect.objectContaining({ function: 'AVG', field: 'age' }),
        expect.objectContaining({ function: 'SUM', field: 'order_count' })
      ]),
      note: expect.stringContaining('RediSearch module')
    });
    
    // Verify the search query contains all conditions
    expect(result.query).toContain('@age:[25 +inf]');
    expect(result.query).toContain('@status:{active}');
    expect(result.query).toContain('@created_at:[2023-01-01 +inf]');
  });

  it('should generate Redis Search query for range conditions', () => {
    const query = QueryParser.parse(`
      FIND products
      WHERE price >= 10 AND price <= 100
      ORDER BY price ASC
    `);
    
    const result = QueryTranslator.toRedis(query) as any;
    
    expect(result).toMatchObject({
      operation: 'FT.SEARCH',
      index: 'products_idx',
      query: '@price:[10 100]', // Combined range query
      sortBy: { field: 'price', direction: 'ASC' }
    });
  });

  it('should generate Redis Search query for IN conditions', () => {
    const query = QueryParser.parse(`
      FIND orders
      WHERE status IN ["pending", "processing", "shipped"]
      LIMIT 20
    `);
    
    const result = QueryTranslator.toRedis(query) as any;
    
    expect(result).toMatchObject({
      operation: 'FT.SEARCH',
      index: 'orders_idx',
      query: '(@status:{pending}|@status:{processing}|@status:{shipped})',
      limit: { offset: 0, num: 20 }
    });
  });

  it('should fall back to SCAN for simple queries without complex features', () => {
    const query = QueryParser.parse(`
      FIND users
      WHERE id = "user123"
    `);
    
    const result = QueryTranslator.toRedis(query);
    
    // Should use simple GET operation for single key lookup
    expect(result).toMatchObject({
      operation: 'GET',
      key: 'users:user123'
    });
  });

  it('should generate basic SCAN for queries without WHERE conditions', () => {
    const query = QueryParser.parse(`
      FIND users
      LIMIT 100
    `);
    
    const result = QueryTranslator.toRedis(query);
    
    // Simple query should still use SCAN (no complex features)
    expect(result).toMatchObject({
      operation: 'SCAN',
      pattern: 'users:*',
      count: 100
    });
  });

});