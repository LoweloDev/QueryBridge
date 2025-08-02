import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

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
});