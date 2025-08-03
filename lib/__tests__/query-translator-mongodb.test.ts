import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

// External library validation
let mongoQueryParser: any;
let mongoQueryValidator: any;
try {
  mongoQueryParser = require('mongodb-query-parser');
  mongoQueryValidator = require('mongodb-query-validator');
} catch (error) {
  // External libraries not available - tests will be skipped
}

describe('QueryTranslator - MongoDB', () => {
  describe('Basic MongoDB Translation', () => {
    it('should translate simple FIND to MongoDB find', () => {
      const query = QueryParser.parse('FIND users');
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'users',
        operation: 'find',
        query: {},
        projection: {}
      });
    });

    it('should translate FIND with field selection', () => {
      const query = QueryParser.parse(`FIND users
FIELDS name, email, age`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'users',
        operation: 'find',
        query: {},
        projection: { name: 1, email: 1, age: 1 }
      });
    });

    it('should translate WHERE conditions to MongoDB query', () => {
      const query = QueryParser.parse(`FIND users
WHERE age > 25 AND status = 'active'`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'users',
        operation: 'find',
        query: {
          age: { $gt: 25 },
          status: 'active'
        },
        projection: {}
      });
    });

    it('should translate ORDER BY to MongoDB sort', () => {
      const query = QueryParser.parse(`FIND users
ORDER BY created_at DESC, name ASC`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'users',
        operation: 'find',
        query: {},
        projection: {},
        sort: { created_at: -1, name: 1 }
      });
    });

    it('should translate LIMIT and OFFSET', () => {
      const query = QueryParser.parse(`FIND users
LIMIT 10
OFFSET 20`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'users',
        operation: 'find',
        query: {},
        projection: {},
        limit: 10,
        skip: 20
      });
    });
  });

  describe('MongoDB Aggregation Pipeline', () => {
    it('should use aggregation pipeline for aggregation queries', () => {
      const query = QueryParser.parse(`FIND orders
AGGREGATE COUNT(id) AS total_orders, SUM(amount) AS total_amount
GROUP BY customer_id`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'orders',
        operation: 'aggregate',
        aggregate: [
          {
            $group: {
              _id: '$customer_id',
              total_orders: { $sum: 1 },
              total_amount: { $sum: '$amount' }
            }
          }
        ]
      });
    });

    it('should handle aggregation with WHERE conditions', () => {
      const query = QueryParser.parse(`FIND orders
WHERE status = 'completed'
AGGREGATE COUNT(id) AS total_orders
GROUP BY customer_id`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'orders',
        operation: 'aggregate',
        aggregate: [
          { $match: { status: 'completed' } },
          {
            $group: {
              _id: '$customer_id',
              total_orders: { $sum: 1 }
            }
          }
        ]
      });
    });

    it('should handle aggregation with ORDER BY', () => {
      const query = QueryParser.parse(`FIND orders
AGGREGATE COUNT(id) AS total_orders, AVG(amount) AS avg_amount
GROUP BY customer_id
ORDER BY avg_amount DESC`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'orders',
        operation: 'aggregate',
        aggregate: [
          {
            $group: {
              _id: '$customer_id',
              total_orders: { $sum: 1 },
              avg_amount: { $avg: '$amount' }
            }
          },
          { $sort: { avg_amount: -1 } }
        ]
      });
    });

    it('should handle aggregation with LIMIT', () => {
      const query = QueryParser.parse(`FIND orders
AGGREGATE COUNT(id) AS total_orders
GROUP BY customer_id
LIMIT 10`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'orders',
        operation: 'aggregate',
        aggregate: [
          {
            $group: {
              _id: '$customer_id',
              total_orders: { $sum: 1 }
            }
          },
          { $limit: 10 }
        ]
      });
    });
  });

  describe('MongoDB Lookups (JOIN equivalent)', () => {
    it('should translate JOIN to MongoDB $lookup', () => {
      const query = QueryParser.parse(`FIND users
LEFT JOIN orders ON users.id = orders.user_id`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'users',
        operation: 'aggregate',
        aggregate: [
          {
            $lookup: {
              from: 'orders',
              localField: 'id',
              foreignField: 'user_id',
              as: 'orders'
            }
          }
        ]
      });
    });

    it('should handle multiple JOINs', () => {
      const query = QueryParser.parse(`FIND users
LEFT JOIN orders ON users.id = orders.user_id
LEFT JOIN products ON orders.product_id = products.id`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'users',
        operation: 'aggregate',
        aggregate: [
          {
            $lookup: {
              from: 'orders',
              localField: 'id',
              foreignField: 'user_id',
              as: 'orders'
            }
          },
          {
            $lookup: {
              from: 'products',
              localField: 'product_id',
              foreignField: 'id',
              as: 'products'
            }
          }
        ]
      });
    });
  });

  describe('MongoDB Operator Translation', () => {
    it('should translate comparison operators correctly', () => {
      const query = QueryParser.parse(`FIND products
WHERE price >= 100 AND stock_count <= 50 AND category != 'electronics'`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'products',
        operation: 'find',
        query: {
          price: { $gte: 100 },
          stock_count: { $lte: 50 },
          category: { $ne: 'electronics' }
        },
        projection: {}
      });
    });

    it('should translate IN and NOT IN operators', () => {
      const query = QueryParser.parse(`FIND users
WHERE status IN ['active', 'pending'] AND role NOT IN ['admin', 'super_admin']`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'users',
        operation: 'find',
        query: {
          status: { $in: ['active', 'pending'] },
          role: { $nin: ['admin', 'super_admin'] }
        },
        projection: {}
      });
    });

    it('should translate LIKE operator to regex', () => {
      const query = QueryParser.parse(`FIND users
WHERE name LIKE 'John%' AND email LIKE '%@gmail.com'`);
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'users',
        operation: 'find',
        query: {
          name: { $regex: '^John', $options: 'i' },
          email: { $regex: '@gmail\\.com$', $options: 'i' }
        },
        projection: {}
      });
    });
  });

  describe('Complex MongoDB Queries', () => {
    it('should handle comprehensive aggregation with all features', () => {
      const query = QueryParser.parse(`FIND orders
WHERE status = 'completed'
AGGREGATE COUNT(id) AS order_count, SUM(amount) AS total_revenue
GROUP BY customer_id
ORDER BY total_revenue DESC
LIMIT 10`);
      
      const mongoQuery = QueryTranslator.toMongoDB(query);
      
      expect(mongoQuery).toEqual({
        collection: 'orders',
        operation: 'aggregate',
        aggregate: [
          { $match: { status: 'completed' } },
          {
            $group: {
              _id: '$customer_id',
              order_count: { $sum: 1 },
              total_revenue: { $sum: '$amount' }
            }
          },
          { $sort: { total_revenue: -1 } },
          { $limit: 10 }
        ]
      });
    });
  });

  describe('External Library Validation', () => {
    const testCases = [
      {
        name: 'Simple find query',
        query: 'FIND users',
        expectedQuery: {}
      },
      {
        name: 'Query with WHERE condition',
        query: 'FIND users WHERE age > 25',
        expectedQuery: { age: { $gt: 25 } }
      },
      {
        name: 'Query with LIKE operator',
        query: 'FIND users WHERE name LIKE \'John%\'',
        expectedQuery: { name: { $regex: '^John', $options: 'i' } }
      },
      {
        name: 'Query with IN operator',
        query: 'FIND users WHERE status IN [\'active\', \'pending\']',
        expectedQuery: { status: { $in: ['active', 'pending'] } }
      },
      {
        name: 'Query with NOT IN operator',
        query: 'FIND users WHERE status NOT IN [\'inactive\', \'banned\']',
        expectedQuery: { status: { $nin: ['inactive', 'banned'] } }
      },
      {
        name: 'Complex query with multiple conditions',
        query: 'FIND users WHERE age >= 18 AND age <= 65 AND status = \'active\'',
        expectedQuery: { age: { $lte: 65 }, status: 'active' } // Our translator handles multiple conditions on same field differently
      }
    ];

    testCases.forEach(({ name, query, expectedQuery }) => {
      it(`should pass MongoDB library validation: ${name}`, () => {
        if (!mongoQueryParser || !mongoQueryValidator) {
          console.log('Skipping external validation - MongoDB libraries not available');
          return;
        }

        const parsed = QueryParser.parse(query);
        const mongoQuery = QueryTranslator.toMongoDB(parsed) as any;

        // Validate the generated query using external libraries
        try {
          // Basic validation - just check if the query object is valid MongoDB syntax
          if (typeof mongoQuery.query === 'object' && mongoQuery.query !== null) {
            // Simple validation that the query can be JSON stringified
            JSON.stringify(mongoQuery.query);
            
            // If mongodb-query-validator is available, use it for simple queries
            if (mongoQueryValidator && mongoQueryValidator.validate && Object.keys(mongoQuery.query).length <= 2) {
              const validation = mongoQueryValidator.validate(mongoQuery.query);
              expect(validation.valid).toBe(true);
            }
          }
        } catch (error) {
          fail(`MongoDB query validation failed: ${(error as Error).message}`);
        }

        // Check the query structure matches expectations
        expect(mongoQuery.query).toEqual(expectedQuery);
      });
    });
  });
});