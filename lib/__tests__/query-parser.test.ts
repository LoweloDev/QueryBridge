import { QueryParser } from '../src/query-parser';
import { QueryLanguage } from '../src/types';

describe('QueryParser', () => {
  describe('Basic Query Parsing', () => {
    it('should parse a simple FIND query', () => {
      const query = 'FIND users';
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.table).toBe('users');
    });

    it('should parse FIND with WHERE clause', () => {
      const query = `FIND users
WHERE age > 25 AND status = 'active'`;
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.table).toBe('users');
      expect(result.where).toHaveLength(2);
      expect(result.where![0]).toEqual({
        field: 'age',
        operator: '>',
        value: 25,
        logical: 'AND'
      });
      expect(result.where![1]).toEqual({
        field: 'status',
        operator: '=',
        value: 'active'
      });
    });

    it('should parse FIND with FIELDS selection', () => {
      const query = `FIND users
FIELDS name, email, age`;
      const result = QueryParser.parse(query);

      expect(result.fields).toEqual(['name', 'email', 'age']);
    });

    it('should parse FIND with ORDER BY', () => {
      const query = `FIND users
ORDER BY created_at DESC, name ASC`;
      const result = QueryParser.parse(query);

      expect(result.orderBy).toEqual([
        { field: 'created_at', direction: 'DESC' },
        { field: 'name', direction: 'ASC' }
      ]);
    });

    it('should parse FIND with LIMIT and OFFSET', () => {
      const query = `FIND users
LIMIT 10
OFFSET 20`;
      const result = QueryParser.parse(query);

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });
  });

  describe('Standardized Database Concept Mappings', () => {
    it('should parse PostgreSQL schema.table syntax', () => {
      const query = 'FIND public.users';
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.subTable).toBe('public');
      expect(result.table).toBe('users');
    });

    it('should parse MongoDB database.collection syntax', () => {
      const query = 'FIND test.users';
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.subTable).toBe('test');
      expect(result.table).toBe('users');
    });

    it('should parse Elasticsearch alias.index syntax', () => {
      const query = 'FIND logs.2024';
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.subTable).toBe('logs');
      expect(result.table).toBe('2024');
    });

    it('should parse DynamoDB table.index syntax', () => {
      const query = 'FIND users.user_id_idx';
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.subTable).toBe('users');
      expect(result.table).toBe('user_id_idx');
    });

    it('should handle field selection with subTable', () => {
      const query = 'FIND public.users (name, email)';
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.subTable).toBe('public');
      expect(result.table).toBe('users');
      expect(result.fields).toEqual(['name', 'email']);
    });

    it('should handle DynamoDB table.index syntax', () => {
      const query = 'FIND users.user_id_idx';
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.subTable).toBe('users');
      expect(result.table).toBe('user_id_idx');
    });
  });

  describe('Advanced Query Features', () => {
    it('should parse aggregation queries', () => {
      const query = `FIND orders
AGGREGATE COUNT(id) AS total_orders, SUM(amount) AS total_amount
GROUP BY customer_id`;
      const result = QueryParser.parse(query);

      expect(result.aggregate).toEqual([
        { function: 'COUNT', field: 'id', alias: 'total_orders' },
        { function: 'SUM', field: 'amount', alias: 'total_amount' }
      ]);
      expect(result.groupBy).toEqual(['customer_id']);
    });

    it('should parse JOIN queries', () => {
      const query = `FIND users
LEFT JOIN orders ON users.id = orders.user_id
INNER JOIN products ON orders.product_id = products.id`;
      const result = QueryParser.parse(query);

      expect(result.joins).toHaveLength(2);
      expect(result.joins![0]).toEqual({
        type: 'LEFT',
        table: 'orders',
        on: {
          left: 'users.id',
          operator: '=',
          right: 'orders.user_id'
        }
      });
      expect(result.joins![1]).toEqual({
        type: 'INNER',
        table: 'products',
        on: {
          left: 'orders.product_id',
          operator: '=',
          right: 'products.id'
        }
      });
    });

    it('should parse complex queries with all features', () => {
      const query = `FIND public.users
FIELDS name, email, age
LEFT JOIN public.orders ON users.id = orders.user_id
WHERE age > 25 AND status = 'active'
ORDER BY created_at DESC
LIMIT 50`;
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.subTable).toBe('public');
      expect(result.table).toBe('users');
      expect(result.fields).toEqual(['name', 'email', 'age']);
      expect(result.joins).toHaveLength(1);
      expect(result.where).toHaveLength(2);
      expect(result.orderBy).toEqual([
        { field: 'created_at', direction: 'DESC' }
      ]);
      expect(result.limit).toBe(50);
    });
  });

  describe('DB_SPECIFIC Removal', () => {
    it('should not parse DB_SPECIFIC clauses anymore', () => {
      const query = `FIND users
WHERE status = 'active'
DB_SPECIFIC: partition_key="USER#123"`;
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.table).toBe('users');
      expect(result.where).toHaveLength(1);
      // dbSpecific should not exist in the result
      expect(result).not.toHaveProperty('dbSpecific');
    });
  });

  describe('Complex Query Combinations', () => {
    it('should parse a comprehensive query with all features', () => {
      const query = `FIND orders
FIELDS customer_id, status, amount
LEFT JOIN customers ON orders.customer_id = customers.id
WHERE orders.status = 'completed' AND orders.amount > 100
AGGREGATE COUNT(orders.id) AS total_orders, AVG(orders.amount) AS avg_amount
GROUP BY orders.customer_id, orders.status
HAVING total_orders > 3
ORDER BY avg_amount DESC
LIMIT 50
OFFSET 10`;

      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.table).toBe('orders');
      expect(result.fields).toEqual(['customer_id', 'status', 'amount']);
      expect(result.joins).toHaveLength(1);
      expect(result.where).toHaveLength(2);
      expect(result.aggregate).toHaveLength(2);
      expect(result.groupBy).toEqual(['orders.customer_id', 'orders.status']);
      expect(result.having).toHaveLength(1);
      expect(result.orderBy).toEqual([{ field: 'avg_amount', direction: 'DESC' }]);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle queries with extra whitespace', () => {
      const query = `   FIND    users   
      WHERE    name   =   'john'    `;
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.table).toBe('users');
      expect(result.where![0].field).toBe('name');
      expect(result.where![0].value).toBe('john');
    });

    it('should handle empty sections gracefully', () => {
      const query = 'FIND users';
      const result = QueryParser.parse(query);

      expect(result.operation).toBe('FIND');
      expect(result.table).toBe('users');
      expect(result.where).toBeUndefined();
      expect(result.orderBy).toBeUndefined();
    });
  });
});