import { QueryTranslator } from '../src/query-translator';
import { QueryParser } from '../src/query-parser';

describe('QueryTranslator - Redis', () => {
  describe('Basic Redis Translation', () => {
    it('should translate simple FIND to Redis SCAN', () => {
      const query = QueryParser.parse('FIND users');
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'SCAN',
        pattern: 'users:*',
        count: 1000
      });
    });

    it('should translate FIND with LIMIT', () => {
      const query = QueryParser.parse(`FIND users
LIMIT 50`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'SCAN',
        pattern: 'users:*',
        count: 50
      });
    });

    it('should handle key-value operations', () => {
      const query = QueryParser.parse(`FIND cache
WHERE key = 'user:123'`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'GET',
        key: 'user:123'
      });
    });
  });

  describe('RedisSearch (RediSearch) Support', () => {
    it('should translate text search to FT.SEARCH', () => {
      const query = QueryParser.parse(`FIND articles
WHERE title LIKE 'redis%'
DB_SPECIFIC: {"redis": {"search_index": "articles_idx"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'FT.SEARCH',
        index: 'articles_idx',
        query: 'title:redis*',
        limit: { offset: 0, num: 10 }
      });
    });

    it('should handle complex search queries', () => {
      const query = QueryParser.parse(`FIND products
WHERE name LIKE 'laptop' AND price > 500 AND category = 'electronics'
DB_SPECIFIC: {"redis": {"search_index": "products_idx"}}
LIMIT 20`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'FT.SEARCH',
        index: 'products_idx',
        query: 'name:laptop @price:[500 +inf] @category:{electronics}',
        limit: { offset: 0, num: 20 }
      });
    });

    it('should handle range queries in RediSearch', () => {
      const query = QueryParser.parse(`FIND events
WHERE timestamp >= 1640995200 AND timestamp <= 1672531200
DB_SPECIFIC: {"redis": {"search_index": "events_idx"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'FT.SEARCH',
        index: 'events_idx',
        query: '@timestamp:[1640995200 1672531200]',
        limit: { offset: 0, num: 10 }
      });
    });

    it('should handle text search with field specifications', () => {
      const query = QueryParser.parse(`FIND documents
WHERE title LIKE 'machine learning' AND content LIKE 'neural networks'
DB_SPECIFIC: {"redis": {"search_index": "docs_idx"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'FT.SEARCH',
        index: 'docs_idx',
        query: 'title:"machine learning" content:"neural networks"',
        limit: { offset: 0, num: 10 }
      });
    });
  });

  describe('Redis Data Structure Operations', () => {
    it('should handle Hash operations', () => {
      const query = QueryParser.parse(`FIND user_profiles
WHERE user_id = '12345'
DB_SPECIFIC: {"redis": {"data_type": "hash"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'HGETALL',
        key: 'user_profiles:12345'
      });
    });

    it('should handle Set operations', () => {
      const query = QueryParser.parse(`FIND user_tags
WHERE user_id = '12345'
DB_SPECIFIC: {"redis": {"data_type": "set"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'SMEMBERS',
        key: 'user_tags:12345'
      });
    });

    it('should handle Sorted Set operations', () => {
      const query = QueryParser.parse(`FIND leaderboard
WHERE score >= 1000
DB_SPECIFIC: {"redis": {"data_type": "zset"}}
LIMIT 10`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'ZRANGEBYSCORE',
        key: 'leaderboard',
        min: 1000,
        max: '+inf',
        limit: { offset: 0, count: 10 }
      });
    });

    it('should handle List operations', () => {
      const query = QueryParser.parse(`FIND recent_activities
WHERE user_id = '12345'
DB_SPECIFIC: {"redis": {"data_type": "list"}}
LIMIT 20`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'LRANGE',
        key: 'recent_activities:12345',
        start: 0,
        stop: 19
      });
    });
  });

  describe('Redis Graph (RedisGraph) Support', () => {
    it('should translate graph queries to Cypher', () => {
      const query = QueryParser.parse(`FIND users
LEFT JOIN follows ON users.id = follows.user_id
DB_SPECIFIC: {"redis": {"graph_name": "social_network"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'GRAPH.QUERY',
        graph: 'social_network',
        cypher: 'MATCH (users:User) OPTIONAL MATCH (users)-[:FOLLOWS]->(follows) RETURN users, follows'
      });
    });

    it('should handle graph pattern matching', () => {
      const query = QueryParser.parse(`FIND users
WHERE age > 25
LEFT JOIN friends ON users.id = friends.user_id
DB_SPECIFIC: {"redis": {"graph_name": "social_network"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'GRAPH.QUERY',
        graph: 'social_network',
        cypher: 'MATCH (users:User) WHERE users.age > 25 OPTIONAL MATCH (users)-[:FRIENDS_WITH]->(friends) RETURN users, friends'
      });
    });

    it('should handle graph aggregations', () => {
      const query = QueryParser.parse(`FIND users
AGGREGATE COUNT(id) AS user_count
GROUP BY location
DB_SPECIFIC: {"redis": {"graph_name": "social_network"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'GRAPH.QUERY',
        graph: 'social_network',
        cypher: 'MATCH (users:User) RETURN users.location, COUNT(users.id) AS user_count'
      });
    });
  });

  describe('Redis Pub/Sub Operations', () => {
    it('should handle subscription operations', () => {
      const query = QueryParser.parse(`FIND notifications
WHERE channel = 'user:123:updates'
DB_SPECIFIC: {"redis": {"operation": "subscribe"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'SUBSCRIBE',
        channels: ['user:123:updates']
      });
    });

    it('should handle pattern subscriptions', () => {
      const query = QueryParser.parse(`FIND events
WHERE pattern LIKE 'user:*:notifications'
DB_SPECIFIC: {"redis": {"operation": "psubscribe"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'PSUBSCRIBE',
        patterns: ['user:*:notifications']
      });
    });
  });

  describe('Redis Streams Support', () => {
    it('should handle stream reading operations', () => {
      const query = QueryParser.parse(`FIND activity_stream
WHERE stream_id > '1640995200000-0'
DB_SPECIFIC: {"redis": {"data_type": "stream"}}
LIMIT 100`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'XRANGE',
        key: 'activity_stream',
        start: '1640995200000-0',
        end: '+',
        count: 100
      });
    });

    it('should handle consumer group operations', () => {
      const query = QueryParser.parse(`FIND orders_stream
WHERE consumer_group = 'order_processors'
DB_SPECIFIC: {"redis": {"data_type": "stream", "consumer": "worker1", "group": "order_processors"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'XREADGROUP',
        group: 'order_processors',
        consumer: 'worker1',
        streams: { orders_stream: '>' },
        count: 10
      });
    });
  });

  describe('Redis Advanced Features', () => {
    it('should handle geospatial queries', () => {
      const query = QueryParser.parse(`FIND locations
WHERE lat = 40.7128 AND lon = -74.0060 AND radius <= 1000
DB_SPECIFIC: {"redis": {"data_type": "geo"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'GEORADIUS',
        key: 'locations',
        longitude: -74.0060,
        latitude: 40.7128,
        radius: 1000,
        unit: 'm'
      });
    });

    it('should handle HyperLogLog operations', () => {
      const query = QueryParser.parse(`FIND unique_visitors
WHERE date = '2024-01-01'
DB_SPECIFIC: {"redis": {"data_type": "hyperloglog"}}`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'PFCOUNT',
        keys: ['unique_visitors:2024-01-01']
      });
    });
  });

  describe('Redis Query Optimization', () => {
    it('should optimize key patterns for performance', () => {
      const query = QueryParser.parse(`FIND users
WHERE id = '12345'`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'GET',
        key: 'users:12345'
      });
    });

    it('should handle batch operations efficiently', () => {
      const query = QueryParser.parse(`FIND user_data
WHERE id IN ['123', '456', '789']`);
      const redisQuery = QueryTranslator.toRedis(query);
      
      expect(redisQuery).toEqual({
        operation: 'MGET',
        keys: ['user_data:123', 'user_data:456', 'user_data:789']
      });
    });
  });
});