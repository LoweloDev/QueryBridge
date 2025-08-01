import { QueryLanguage } from "@shared/schema";

export class QueryTranslator {
  static toSQL(query: QueryLanguage): string {
    let sql = '';
    
    if (query.operation === 'FIND') {
      // SELECT clause
      if (query.aggregate && query.aggregate.length > 0) {
        const selectFields = [];
        if (query.groupBy) {
          selectFields.push(...query.groupBy);
        }
        selectFields.push(...query.aggregate.map(agg => 
          `${agg.function}(${agg.field}) AS ${agg.alias || agg.field}`
        ));
        sql = `SELECT ${selectFields.join(', ')}`;
      } else {
        sql = 'SELECT *';
      }
      
      // FROM clause
      sql += ` FROM ${query.table}`;
      
      // WHERE clause
      if (query.where && query.where.length > 0) {
        const conditions = query.where.map((condition, index) => {
          let condStr = `${condition.field} ${condition.operator} `;
          if (typeof condition.value === 'string') {
            condStr += `'${condition.value}'`;
          } else {
            condStr += condition.value;
          }
          
          if (index < query.where!.length - 1 && condition.logical) {
            condStr += ` ${condition.logical} `;
          }
          
          return condStr;
        });
        sql += ` WHERE ${conditions.join('')}`;
      }
      
      // GROUP BY clause
      if (query.groupBy && query.groupBy.length > 0) {
        sql += ` GROUP BY ${query.groupBy.join(', ')}`;
      }
      
      // ORDER BY clause
      if (query.orderBy && query.orderBy.length > 0) {
        const orderFields = query.orderBy.map(order => `${order.field} ${order.direction}`);
        sql += ` ORDER BY ${orderFields.join(', ')}`;
      }
      
      // LIMIT clause
      if (query.limit) {
        sql += ` LIMIT ${query.limit}`;
      }
      
      sql += ';';
    }
    
    return sql;
  }
  
  static toMongoDB(query: QueryLanguage): object {
    const mongoQuery: any = {};
    
    if (query.operation === 'FIND') {
      // Build match stage
      if (query.where && query.where.length > 0) {
        mongoQuery.find = {};
        for (const condition of query.where) {
          const mongoOperator = this.sqlToMongoOperator(condition.operator);
          if (mongoOperator) {
            mongoQuery.find[condition.field] = { [mongoOperator]: condition.value };
          } else {
            mongoQuery.find[condition.field] = condition.value;
          }
        }
      }
      
      // Build aggregation pipeline
      if (query.aggregate || query.groupBy) {
        mongoQuery.aggregate = [];
        
        if (query.where) {
          mongoQuery.aggregate.push({ $match: mongoQuery.find || {} });
        }
        
        if (query.groupBy || query.aggregate) {
          const groupStage: any = { _id: {} };
          
          if (query.groupBy) {
            for (const field of query.groupBy) {
              groupStage._id[field] = `$${field}`;
            }
          }
          
          if (query.aggregate) {
            for (const agg of query.aggregate) {
              const mongoAggFunc = this.sqlToMongoAggregateFunction(agg.function);
              groupStage[agg.alias || agg.field] = { [mongoAggFunc]: `$${agg.field}` };
            }
          }
          
          mongoQuery.aggregate.push({ $group: groupStage });
        }
        
        if (query.orderBy) {
          const sortStage: any = {};
          for (const order of query.orderBy) {
            sortStage[order.field] = order.direction === 'DESC' ? -1 : 1;
          }
          mongoQuery.aggregate.push({ $sort: sortStage });
        }
        
        if (query.limit) {
          mongoQuery.aggregate.push({ $limit: query.limit });
        }
      } else {
        // Simple find query
        if (query.orderBy) {
          mongoQuery.sort = {};
          for (const order of query.orderBy) {
            mongoQuery.sort[order.field] = order.direction === 'DESC' ? -1 : 1;
          }
        }
        
        if (query.limit) {
          mongoQuery.limit = query.limit;
        }
      }
    }
    
    return mongoQuery;
  }
  
  static toElasticsearch(query: QueryLanguage): object {
    const esQuery: any = {
      query: { bool: { must: [] } },
    };
    
    if (query.operation === 'FIND') {
      // Build query conditions
      if (query.where && query.where.length > 0) {
        for (const condition of query.where) {
          const esCondition = this.sqlToESCondition(condition);
          if (esCondition) {
            esQuery.query.bool.must.push(esCondition);
          }
        }
      }
      
      // Add aggregations
      if (query.aggregate && query.aggregate.length > 0) {
        esQuery.aggs = {};
        
        if (query.groupBy) {
          const groupField = query.groupBy[0]; // ES typically groups by one field at a time
          esQuery.aggs.group_by = {
            terms: { field: groupField },
            aggs: {},
          };
          
          for (const agg of query.aggregate) {
            const esAggFunc = this.sqlToESAggregateFunction(agg.function);
            esQuery.aggs.group_by.aggs[agg.alias || agg.field] = {
              [esAggFunc]: { field: agg.field },
            };
          }
        } else {
          for (const agg of query.aggregate) {
            const esAggFunc = this.sqlToESAggregateFunction(agg.function);
            esQuery.aggs[agg.alias || agg.field] = {
              [esAggFunc]: { field: agg.field },
            };
          }
        }
      }
      
      // Add sorting
      if (query.orderBy && query.orderBy.length > 0) {
        esQuery.sort = query.orderBy.map(order => ({
          [order.field]: { order: order.direction.toLowerCase() },
        }));
      }
      
      // Add size (limit)
      if (query.limit) {
        esQuery.size = query.limit;
      }
    }
    
    return esQuery;
  }
  
  static toDynamoDB(query: QueryLanguage): object {
    const dynamoQuery: any = {
      TableName: query.table,
    };
    
    if (query.operation === 'FIND') {
      // DynamoDB has limited query capabilities, mainly for key-based access
      if (query.where && query.where.length > 0) {
        const keyConditions: any = {};
        const filterExpressions: string[] = [];
        const expressionAttributeValues: any = {};
        const expressionAttributeNames: any = {};
        
        for (const condition of query.where) {
          const placeholder = `:val${Object.keys(expressionAttributeValues).length}`;
          const namePlaceholder = `#${condition.field}`;
          
          expressionAttributeValues[placeholder] = condition.value;
          expressionAttributeNames[namePlaceholder] = condition.field;
          
          // Assume simple equality for key conditions (this is a simplified implementation)
          if (condition.operator === '=') {
            keyConditions[condition.field] = {
              AttributeValueList: [condition.value],
              ComparisonOperator: 'EQ',
            };
          } else {
            const dynamoOperator = this.sqlToDynamoOperator(condition.operator);
            filterExpressions.push(`${namePlaceholder} ${dynamoOperator} ${placeholder}`);
          }
        }
        
        if (Object.keys(keyConditions).length > 0) {
          dynamoQuery.KeyConditions = keyConditions;
        }
        
        if (filterExpressions.length > 0) {
          dynamoQuery.FilterExpression = filterExpressions.join(' AND ');
          dynamoQuery.ExpressionAttributeValues = expressionAttributeValues;
          dynamoQuery.ExpressionAttributeNames = expressionAttributeNames;
        }
      }
      
      if (query.limit) {
        dynamoQuery.Limit = query.limit;
      }
    }
    
    return dynamoQuery;
  }
  
  private static sqlToMongoOperator(sqlOp: string): string | null {
    const mapping: Record<string, string> = {
      '=': '$eq',
      '!=': '$ne',
      '<': '$lt',
      '>': '$gt',
      '<=': '$lte',
      '>=': '$gte',
      'IN': '$in',
      'NOT IN': '$nin',
    };
    return mapping[sqlOp] || null;
  }
  
  private static sqlToMongoAggregateFunction(sqlFunc: string): string {
    const mapping: Record<string, string> = {
      'COUNT': '$sum',
      'SUM': '$sum',
      'AVG': '$avg',
      'MIN': '$min',
      'MAX': '$max',
    };
    return mapping[sqlFunc] || '$sum';
  }
  
  private static sqlToESCondition(condition: any): object | null {
    const field = condition.field;
    const value = condition.value;
    
    switch (condition.operator) {
      case '=':
        return { term: { [field]: value } };
      case '!=':
        return { bool: { must_not: { term: { [field]: value } } } };
      case '>':
        return { range: { [field]: { gt: value } } };
      case '<':
        return { range: { [field]: { lt: value } } };
      case '>=':
        return { range: { [field]: { gte: value } } };
      case '<=':
        return { range: { [field]: { lte: value } } };
      case 'LIKE':
        return { wildcard: { [field]: `*${value}*` } };
      default:
        return null;
    }
  }
  
  private static sqlToESAggregateFunction(sqlFunc: string): string {
    const mapping: Record<string, string> = {
      'COUNT': 'value_count',
      'SUM': 'sum',
      'AVG': 'avg',
      'MIN': 'min',
      'MAX': 'max',
    };
    return mapping[sqlFunc] || 'value_count';
  }
  
  private static sqlToDynamoOperator(sqlOp: string): string {
    const mapping: Record<string, string> = {
      '=': '=',
      '!=': '<>',
      '<': '<',
      '>': '>',
      '<=': '<=',
      '>=': '>=',
    };
    return mapping[sqlOp] || '=';
  }
  
  static toRedis(query: QueryLanguage): object {
    const redisQuery: any = {
      operation: 'SCAN',
      pattern: '*',
    };
    
    if (query.operation === 'FIND') {
      // Redis has limited querying capabilities, mainly key-based operations
      if (query.where && query.where.length > 0) {
        // For Redis, we'll construct a pattern-based search
        const conditions = query.where.map(condition => {
          if (condition.operator === '=' && condition.field === 'key') {
            return condition.value;
          } else if (condition.operator === 'LIKE' && condition.field === 'key') {
            return condition.value.replace('%', '*');
          }
          return '*';
        });
        redisQuery.pattern = conditions.length > 0 ? conditions[0] : '*';
      }
      
      if (query.limit) {
        redisQuery.count = query.limit;
      }
      
      // Redis doesn't support complex aggregations in basic operations
      if (query.aggregate) {
        redisQuery.note = 'Redis has limited aggregation support. Consider using Redis modules like RedisGraph or RediSearch for complex queries.';
      }
    }
    
    return redisQuery;
  }
}
