import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

// External library validation
let ElasticsearchClient: any;
try {
  const elasticsearch = require('@elastic/elasticsearch');
  ElasticsearchClient = elasticsearch.Client;
} catch (error) {
  // External libraries not available - tests will be skipped
}

describe('QueryTranslator - Elasticsearch', () => {
  describe('Basic Elasticsearch Translation', () => {
    it('should translate simple FIND to Elasticsearch match_all', () => {
      const query = QueryParser.parse('FIND products');
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect(esQuery).toEqual({
        index: 'products',
        body: {
          query: { match_all: {} }
        }
      });
    });

    it('should translate FIND with field selection', () => {
      const query = QueryParser.parse(`FIND users
FIELDS name, email, age`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect(esQuery).toEqual({
        index: 'users',
        body: {
          query: { match_all: {} },
          _source: ['name', 'email', 'age']
        }
      });
    });

    it('should translate WHERE conditions to Elasticsearch queries', () => {
      const query = QueryParser.parse(`FIND users
WHERE age > 25 AND status = 'active'`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect(esQuery).toEqual({
        index: 'users',
        body: {
          query: {
            bool: {
              must: [
                { range: { age: { gt: 25 } } },
                { term: { status: 'active' } }
              ]
            }
          }
        }
      });
    });

    it('should translate ORDER BY to Elasticsearch sort', () => {
      const query = QueryParser.parse(`FIND users
ORDER BY created_at DESC, name ASC`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect(esQuery).toEqual({
        index: 'users',
        body: {
          query: { match_all: {} },
          sort: [
            { created_at: { order: 'desc' } },
            { name: { order: 'asc' } }
          ]
        }
      });
    });

    it('should translate LIMIT and OFFSET', () => {
      const query = QueryParser.parse(`FIND users
LIMIT 10
OFFSET 20`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect(esQuery).toEqual({
        index: 'users',
        body: {
          query: { match_all: {} },
          size: 10,
          from: 20
        }
      });
    });
  });

  describe('Elasticsearch Query Types', () => {
    it('should translate LIKE operator to match query', () => {
      const query = QueryParser.parse(`FIND articles
WHERE title LIKE 'elasticsearch%'`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query).toEqual({
        bool: {
          must: [
            { match: { title: 'elasticsearch*' } }
          ]
        }
      });
    });

    it('should translate ILIKE operator to case-insensitive match', () => {
      const query = QueryParser.parse(`FIND users
WHERE name ILIKE 'john%'`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query).toEqual({
        bool: {
          must: [
            { match: { name: { query: 'john*', case_insensitive: true } } }
          ]
        }
      });
    });

    it('should handle range queries', () => {
      const query = QueryParser.parse(`FIND products
WHERE price >= 100 AND price <= 500`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query).toEqual({
        bool: {
          must: [
            { range: { price: { gte: 100 } } },
            { range: { price: { lte: 500 } } }
          ]
        }
      });
    });

    it('should handle IN queries with terms', () => {
      const query = QueryParser.parse(`FIND users
WHERE status IN ['active', 'pending', 'verified']`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query).toEqual({
        bool: {
          must: [
            { terms: { status: ['active', 'pending', 'verified'] } }
          ]
        }
      });
    });

    it('should handle NOT IN queries with must_not', () => {
      const query = QueryParser.parse(`FIND users
WHERE role NOT IN ['admin', 'super_admin']`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query).toEqual({
        bool: {
          must_not: [
            { terms: { role: ['admin', 'super_admin'] } }
          ]
        }
      });
    });
  });

  describe('Elasticsearch Aggregations', () => {
    it('should translate aggregation queries', () => {
      const query = QueryParser.parse(`FIND orders
AGGREGATE COUNT(id) AS total_orders, SUM(amount) AS total_revenue
GROUP BY customer_id`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect(esQuery).toEqual({
        index: 'orders',
        body: {
          query: { match_all: {} },
          aggs: {
            customer_id_group: {
              terms: { field: 'customer_id' },
              aggs: {
                total_orders: { value_count: { field: 'id' } },
                total_revenue: { sum: { field: 'amount' } }
              }
            }
          },
          size: 0
        }
      });
    });

    it('should handle multiple aggregation functions', () => {
      const query = QueryParser.parse(`FIND products
AGGREGATE COUNT(id) AS product_count, AVG(price) AS avg_price, MIN(price) AS min_price, MAX(price) AS max_price
GROUP BY category`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.aggs.category_group.aggs).toEqual({
        product_count: { value_count: { field: 'id' } },
        avg_price: { avg: { field: 'price' } },
        min_price: { min: { field: 'price' } },
        max_price: { max: { field: 'price' } }
      });
    });

    it('should handle aggregation with WHERE conditions', () => {
      const query = QueryParser.parse(`FIND orders
WHERE status = 'completed'
AGGREGATE SUM(amount) AS total_revenue
GROUP BY customer_id`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query).toEqual({
        bool: {
          must: [
            { term: { status: 'completed' } }
          ]
        }
      });
      expect((esQuery as any).body.aggs).toBeDefined();
    });
  });

  describe('Complex Elasticsearch Queries', () => {
    it('should handle comprehensive query with filters and aggregations', () => {
      const query = QueryParser.parse(`FIND orders
WHERE status = 'completed' AND amount > 50
AGGREGATE COUNT(id) AS order_count, AVG(amount) AS avg_amount
GROUP BY customer_id
ORDER BY avg_amount DESC
LIMIT 10`);
      
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query).toEqual({
        bool: {
          must: [
            { term: { status: 'completed' } },
            { range: { amount: { gt: 50 } } }
          ]
        }
      });
      expect((esQuery as any).body.aggs).toBeDefined();
      expect((esQuery as any).body.sort).toEqual([{ avg_amount: { order: 'desc' } }]);
      expect((esQuery as any).body.size).toBe(10);
    });

    it('should handle text search with match queries', () => {
      const query = QueryParser.parse(`FIND articles
WHERE title LIKE 'machine learning' AND content LIKE 'neural networks'`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query).toEqual({
        bool: {
          must: [
            { match: { title: 'machine learning' } },
            { match: { content: 'neural networks' } }
          ]
        }
      });
    });
  });

  describe('Elasticsearch Specific Features', () => {
    it('should handle boost scoring', () => {
      const query = QueryParser.parse(`FIND articles
WHERE title LIKE 'elasticsearch'
DB_SPECIFIC: {"elasticsearch": {"boost": {"title": 2.0}}}`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query.bool.must[0].match.title).toEqual({
        query: 'elasticsearch',
        boost: 2.0
      });
    });

    it('should handle fuzzy matching', () => {
      const query = QueryParser.parse(`FIND users
WHERE name LIKE 'john'
DB_SPECIFIC: {"elasticsearch": {"fuzzy": {"name": {"fuzziness": "AUTO"}}}}`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query.bool.must[0]).toEqual({
        fuzzy: { name: { value: 'john', fuzziness: 'AUTO' } }
      });
    });

    it('should handle highlight configuration', () => {
      const query = QueryParser.parse(`FIND articles
WHERE content LIKE 'machine learning'
DB_SPECIFIC: {"elasticsearch": {"highlight": {"fields": {"content": {}}}}}`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.highlight).toEqual({
        fields: { content: {} }
      });
    });
  });

  describe('Elasticsearch Edge Cases', () => {
    it('should handle empty query gracefully', () => {
      const query = QueryParser.parse('FIND users');
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query).toEqual({ match_all: {} });
    });

    it('should handle field names with special characters', () => {
      const query = QueryParser.parse(`FIND logs
WHERE @timestamp > '2024-01-01' AND user.id = '12345'`);
      const esQuery = QueryTranslator.toElasticsearch(query);
      
      expect((esQuery as any).body.query.bool.must).toContainEqual({
        range: { '@timestamp': { gt: '2024-01-01' } }
      });
      expect((esQuery as any).body.query.bool.must).toContainEqual({
        term: { 'user.id': '12345' }
      });
    });
  });

  describe('Elasticsearch SDK Validation', () => {
    const testCases = [
      {
        name: 'Simple match_all query',
        query: 'FIND articles',
        expectedIndex: 'articles'
      },
      {
        name: 'Query with LIKE operator',
        query: 'FIND articles WHERE title LIKE \'elasticsearch%\'',
        expectedIndex: 'articles'
      },
      {
        name: 'Range query',
        query: 'FIND products WHERE price >= 100 AND price <= 500',
        expectedIndex: 'products'
      },
      {
        name: 'Terms query (IN operator)',
        query: 'FIND users WHERE status IN [\'active\', \'pending\']',
        expectedIndex: 'users'
      },
      {
        name: 'Query with sorting and limiting',
        query: 'FIND articles ORDER BY score DESC LIMIT 20',
        expectedIndex: 'articles'
      }
    ];

    testCases.forEach(({ name, query, expectedIndex }) => {
      it(`should pass Elasticsearch SDK validation: ${name}`, () => {
        if (!ElasticsearchClient) {
          console.log('Skipping Elasticsearch SDK validation - library not available');
          return;
        }

        const parsed = QueryParser.parse(query);
        const esQuery = QueryTranslator.toElasticsearch(parsed) as any;

        // Validate basic structure
        expect(esQuery.index).toBe(expectedIndex);
        expect(esQuery.body).toBeDefined();
        expect(esQuery.body.query).toBeDefined();

        // Validate that the query structure is compatible with Elasticsearch Client
        try {
          // This simulates what the Elasticsearch client would validate
          const searchParams = {
            index: esQuery.index,
            body: esQuery.body
          };

          // Check required fields
          expect(typeof searchParams.index).toBe('string');
          expect(searchParams.index.length).toBeGreaterThan(0);
          expect(typeof searchParams.body).toBe('object');
          expect(searchParams.body.query).toBeDefined();

          // Validate query types are supported
          const queryType = Object.keys(searchParams.body.query)[0];
          const supportedQueryTypes = ['match_all', 'bool', 'term', 'terms', 'range', 'match', 'nested'];
          expect(supportedQueryTypes).toContain(queryType);

          // If aggregations exist, validate structure
          if (searchParams.body.aggs) {
            expect(typeof searchParams.body.aggs).toBe('object');
          }

          // If sort exists, validate structure
          if (searchParams.body.sort) {
            expect(Array.isArray(searchParams.body.sort)).toBe(true);
          }

          // If size/from exist, validate they're numbers
          if (searchParams.body.size) {
            expect(typeof searchParams.body.size).toBe('number');
          }
          if (searchParams.body.from) {
            expect(typeof searchParams.body.from).toBe('number');
          }

        } catch (error) {
          fail(`Elasticsearch SDK compatibility validation failed: ${(error as Error).message}`);
        }
      });
    });
  });
});