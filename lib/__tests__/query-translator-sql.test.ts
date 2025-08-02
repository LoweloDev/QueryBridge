import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

describe('QueryTranslator - SQL/PostgreSQL', () => {
  describe('Basic SQL Translation', () => {
    it('should translate simple FIND query to SQL', () => {
      const query = QueryParser.parse('FIND users');
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT * FROM users;');
    });

    it('should translate FIND with field selection', () => {
      const query = QueryParser.parse(`FIND users
FIELDS name, email, age`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT name, email, age FROM users;');
    });

    it('should translate WHERE conditions', () => {
      const query = QueryParser.parse(`FIND users
WHERE age > 25 AND status = 'active'`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe("SELECT * FROM users WHERE age > 25 AND status = 'active';");
    });

    it('should translate ORDER BY clause', () => {
      const query = QueryParser.parse(`FIND users
ORDER BY created_at DESC, name ASC`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT * FROM users ORDER BY created_at DESC, name ASC;');
    });

    it('should translate LIMIT clause', () => {
      const query = QueryParser.parse(`FIND users
LIMIT 10`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT * FROM users LIMIT 10;');
    });
  });

  describe('Advanced SQL Features', () => {
    it('should translate JOIN queries', () => {
      const query = QueryParser.parse(`FIND users
LEFT JOIN orders ON users.id = orders.user_id
INNER JOIN products ON orders.product_id = products.id`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT * FROM users LEFT JOIN orders ON users.id = orders.user_id INNER JOIN products ON orders.product_id = products.id;');
    });

    it('should translate aggregation with GROUP BY', () => {
      const query = QueryParser.parse(`FIND orders
AGGREGATE COUNT(id) AS total_orders, SUM(amount) AS total_amount
GROUP BY customer_id`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT customer_id, COUNT(id) AS total_orders, SUM(amount) AS total_amount FROM orders GROUP BY customer_id;');
    });

    it('should translate complex aggregation with HAVING', () => {
      const query = QueryParser.parse(`FIND orders
AGGREGATE COUNT(id) AS order_count, AVG(amount) AS avg_amount
GROUP BY customer_id
HAVING order_count > 5`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT customer_id, COUNT(id) AS order_count, AVG(amount) AS avg_amount FROM orders GROUP BY customer_id;');
    });

    it('should handle ORDER BY with GROUP BY correctly', () => {
      const query = QueryParser.parse(`FIND orders
AGGREGATE COUNT(id) AS order_count, SUM(amount) AS total_amount
GROUP BY customer_id
ORDER BY total_amount DESC`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT customer_id, COUNT(id) AS order_count, SUM(amount) AS total_amount FROM orders GROUP BY customer_id ORDER BY SUM(amount) DESC;');
    });
  });

  describe('Complex SQL Queries', () => {
    it('should translate comprehensive query with all features', () => {
      const query = QueryParser.parse(`FIND orders
FIELDS customer_id, status, amount
LEFT JOIN customers ON orders.customer_id = customers.id
WHERE orders.status = 'completed' AND orders.amount > 100
ORDER BY orders.created_at DESC
LIMIT 50`);
      
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe("SELECT customer_id, status, amount FROM orders LEFT JOIN customers ON orders.customer_id = customers.id WHERE orders.status = 'completed' AND orders.amount > 100 ORDER BY orders.created_at DESC LIMIT 50;");
    });

    it('should handle string values with proper quoting', () => {
      const query = QueryParser.parse(`FIND users
WHERE name = 'John Doe' AND city = 'New York'`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe("SELECT * FROM users WHERE name = 'John Doe' AND city = 'New York';");
    });

    it('should handle numeric values without quoting', () => {
      const query = QueryParser.parse(`FIND products
WHERE price > 99.99 AND stock_count <= 10`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT * FROM products WHERE price > 99.99 AND stock_count <= 10;');
    });
  });

  describe('Edge Cases', () => {
    it('should handle FULL OUTER JOIN correctly', () => {
      const query = QueryParser.parse(`FIND users
FULL JOIN profiles ON users.id = profiles.user_id`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT * FROM users FULL OUTER JOIN profiles ON users.id = profiles.user_id;');
    });

    it('should handle table aliases in JOINs', () => {
      const query = QueryParser.parse(`FIND users
LEFT JOIN orders o ON users.id = o.user_id`);
      const sql = QueryTranslator.toSQL(query);
      
      expect(sql).toBe('SELECT * FROM users LEFT JOIN orders o ON users.id = o.user_id;');
    });
  });
});