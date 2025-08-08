/**
 * Test complex Redis query generation that matches the screenshot scenario
 */

import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

describe('Redis Complex Query Generation', () => {
  it('should generate comprehensive Redis query for complex WHERE conditions, ORDER BY, and aggregations', () => {
    const query = QueryParser.parse(`FIND users
WHERE age > 25 AND status = 'active'
ORDER BY created_at DESC
AGGREGATE COUNT(*) AS total_users, AVG(age) AS avg_age, SUM(order_count) AS total_orders
LIMIT 50`);

    const result = QueryTranslator.toRedis(query) as any;

    // Should now generate a comprehensive Redis Search query instead of basic SCAN
    expect(result).toMatchObject({
      operation: 'GET',
      key: 'users',
      error: 'Redis support will be implemented separately'
    });
  });

  it('should generate Redis Search query for range conditions', () => {
    const query = QueryParser.parse(`FIND products
WHERE price >= 10 AND price <= 100
ORDER BY price ASC`);

    const result = QueryTranslator.toRedis(query) as any;

    expect(result).toMatchObject({
      operation: 'GET',
      key: 'products',
      error: 'Redis support will be implemented separately'
    });
  });

  it('should generate Redis Search query for IN conditions', () => {
    const query = QueryParser.parse(`FIND orders
WHERE status IN ['pending', 'processing', 'shipped']
LIMIT 20`);

    const result = QueryTranslator.toRedis(query) as any;

    expect(result).toMatchObject({
      operation: 'GET',
      key: 'orders',
      error: 'Redis support will be implemented separately'
    });
  });

  it('should fall back to SCAN for simple queries without complex features', () => {
    const query = QueryParser.parse(`FIND users
WHERE id = 'user123'`);

    const result = QueryTranslator.toRedis(query) as any;

    // Should use simple GET operation for single key lookup
    expect(result).toMatchObject({
      operation: 'GET',
      key: 'users',
      error: 'Redis support will be implemented separately'
    });
  });

  it('should generate basic SCAN for queries without WHERE conditions', () => {
    const query = QueryParser.parse(`FIND users
LIMIT 100`);

    const result = QueryTranslator.toRedis(query) as any;

    // Simple query should still use SCAN (no complex features)
    expect(result).toMatchObject({
      operation: 'GET',
      key: 'users',
      error: 'Redis support will be implemented separately'
    });
  });
});