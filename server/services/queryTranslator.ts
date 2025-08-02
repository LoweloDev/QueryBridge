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
      } else if (query.fields && query.fields.length > 0) {
        sql = `SELECT ${query.fields.join(', ')}`;
      } else {
        sql = 'SELECT *';
      }
      
      // FROM clause
      sql += ` FROM ${query.table}`;
      
      // JOIN clauses
      if (query.joins && query.joins.length > 0) {
        query.joins.forEach(join => {
          const joinType = join.type === 'FULL' ? 'FULL OUTER' : join.type;
          const tableRef = join.alias ? `${join.table} ${join.alias}` : join.table;
          sql += ` ${joinType} JOIN ${tableRef} ON ${join.on.left} ${join.on.operator} ${join.on.right}`;
        });
      }
      
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
      // Check if we need aggregation pipeline (for joins, aggregation, or grouping)
      const needsAggregation = query.joins || query.aggregate || query.groupBy || query.dbSpecific?.mongodb;
      
      if (needsAggregation) {
        mongoQuery.aggregate = [];
        
        // Start with match stage for WHERE conditions
        if (query.where && query.where.length > 0) {
          const matchStage: any = {};
          for (const condition of query.where) {
            const mongoOperator = this.sqlToMongoOperator(condition.operator);
            if (mongoOperator) {
              matchStage[condition.field] = { [mongoOperator]: condition.value };
            } else {
              matchStage[condition.field] = condition.value;
            }
          }
          mongoQuery.aggregate.push({ $match: matchStage });
        }
        
        // Add lookup stages for joins
        if (query.joins && query.joins.length > 0) {
          query.joins.forEach(join => {
            const lookupStage = {
              $lookup: {
                from: join.table,
                localField: join.on.left.split('.')[1] || join.on.left,
                foreignField: join.on.right.split('.')[1] || join.on.right,
                as: join.alias || join.table
              }
            };
            mongoQuery.aggregate.push(lookupStage);
            
            // Handle different join types
            if (join.type === 'INNER') {
              mongoQuery.aggregate.push({
                $match: { [join.alias || join.table]: { $ne: [] } }
              });
            }
            
            // Unwind for INNER and LEFT joins to flatten results
            if (join.type === 'INNER' || join.type === 'LEFT') {
              mongoQuery.aggregate.push({
                $unwind: {
                  path: `$${join.alias || join.table}`,
                  preserveNullAndEmptyArrays: join.type === 'LEFT'
                }
              });
            }
          });
        }
        
        // Custom MongoDB pipeline from dbSpecific
        if (query.dbSpecific?.mongodb?.pipeline) {
          mongoQuery.aggregate.push(...query.dbSpecific.mongodb.pipeline);
        }
        
        // Group stage for aggregation
        if (query.groupBy || query.aggregate) {
          const groupStage: any = { _id: {} };
          
          if (query.groupBy) {
            for (const field of query.groupBy) {
              groupStage._id[field] = `$${field}`;
            }
          } else {
            groupStage._id = null; // Global aggregation
          }
          
          if (query.aggregate) {
            for (const agg of query.aggregate) {
              const mongoAggFunc = this.sqlToMongoAggregateFunction(agg.function);
              groupStage[agg.alias || agg.field] = { [mongoAggFunc]: `$${agg.field}` };
            }
          }
          
          mongoQuery.aggregate.push({ $group: groupStage });
        }
        
        // Project stage for field selection
        if (query.fields && query.fields.length > 0) {
          const projectStage: any = {};
          for (const field of query.fields) {
            projectStage[field] = 1;
          }
          mongoQuery.aggregate.push({ $project: projectStage });
        }
        
        // Sort stage
        if (query.orderBy) {
          const sortStage: any = {};
          for (const order of query.orderBy) {
            sortStage[order.field] = order.direction === 'DESC' ? -1 : 1;
          }
          mongoQuery.aggregate.push({ $sort: sortStage });
        }
        
        // Limit stage
        if (query.limit) {
          mongoQuery.aggregate.push({ $limit: query.limit });
        }
        
        // Skip stage for offset
        if (query.offset) {
          mongoQuery.aggregate.unshift({ $skip: query.offset });
        }
        
      } else {
        // Simple find query without aggregation
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
        
        // Project specific fields
        if (query.fields && query.fields.length > 0) {
          mongoQuery.project = {};
          for (const field of query.fields) {
            mongoQuery.project[field] = 1;
          }
        }
        
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
      // Check for Elasticsearch-specific features
      const esSpecific = query.dbSpecific?.elasticsearch;
      
      // Handle nested queries
      if (esSpecific?.nested) {
        esQuery.query = {
          nested: {
            path: esSpecific.nested.path,
            query: esSpecific.nested.query,
            score_mode: esSpecific.nested.scoreMode || 'avg'
          }
        };
      }
      // Handle parent-child relationships
      else if (esSpecific?.parentChild) {
        esQuery.query = {
          has_child: {
            type: esSpecific.parentChild.type,
            query: { match_all: {} }
          }
        };
      }
      // Handle joins through nested objects
      else if (query.joins && query.joins.length > 0) {
        const joinQueries = query.joins.map(join => {
          return {
            nested: {
              path: join.table,
              query: {
                bool: {
                  must: [
                    { exists: { field: `${join.table}.${join.on.right}` } }
                  ]
                }
              }
            }
          };
        });
        
        // Start with JOIN queries  
        const mustConditions: any[] = [...joinQueries];
        
        // Add WHERE conditions to the main bool query
        if (query.where && query.where.length > 0) {
          for (const condition of query.where) {
            const esCondition = this.sqlToESCondition(condition);
            if (esCondition) {
              mustConditions.push(esCondition);
            }
          }
        }
        
        // Always use bool query structure when we have joins + where conditions
        esQuery.query = {
          bool: {
            must: mustConditions
          }
        };
      }
      // Standard WHERE conditions (no joins)
      else if (query.where && query.where.length > 0) {
        for (const condition of query.where) {
          const esCondition = this.sqlToESCondition(condition);
          if (esCondition) {
            esQuery.query.bool.must.push(esCondition);
          }
        }
      } else {
        // Default to match_all if no conditions
        esQuery.query = { match_all: {} };
      }
      
      // Add aggregations with nested support
      if (query.aggregate && query.aggregate.length > 0) {
        esQuery.aggs = {};
        
        if (query.groupBy) {
          const groupField = query.groupBy[0];
          
          // Check if grouping on nested field
          if (groupField.includes('.')) {
            const [nestedPath, nestedField] = groupField.split('.', 2);
            esQuery.aggs.nested_group = {
              nested: { path: nestedPath },
              aggs: {
                group_by: {
                  terms: { field: groupField },
                  aggs: {}
                }
              }
            };
            
            for (const agg of query.aggregate) {
              const esAggFunc = this.sqlToESAggregateFunction(agg.function);
              esQuery.aggs.nested_group.aggs.group_by.aggs[agg.alias || agg.field] = {
                [esAggFunc]: { field: agg.field }
              };
            }
          } else {
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
      
      // Add size (limit) and from (offset)
      if (query.limit) {
        esQuery.size = query.limit;
      }
      
      if (query.offset) {
        esQuery.from = query.offset;
      }
      
      // Add source filtering for field selection
      if (query.fields && query.fields.length > 0) {
        esQuery._source = query.fields;
      }
    }
    
    return esQuery;
  }
  
  static toDynamoDB(query: QueryLanguage): object {
    const dynamoQuery: any = {
      TableName: query.table,
    };
    
    if (query.operation === 'FIND') {
      // Check for single-table design patterns
      const dbSpecific = query.dbSpecific?.dynamodb;
      
      if (dbSpecific?.keyCondition) {
        // Use Key Condition for efficient querying
        const keyConditionExpression: string[] = [];
        const expressionAttributeValues: any = {};
        const expressionAttributeNames: any = {};
        
        // Partition Key condition
        keyConditionExpression.push('#pk = :pk');
        expressionAttributeNames['#pk'] = dbSpecific.partitionKey || 'PK';
        expressionAttributeValues[':pk'] = dbSpecific.keyCondition.pk;
        
        // Sort Key condition (optional)
        if (dbSpecific.keyCondition.sk && dbSpecific.sortKey) {
          keyConditionExpression.push('#sk = :sk');
          expressionAttributeNames['#sk'] = dbSpecific.sortKey;
          expressionAttributeValues[':sk'] = dbSpecific.keyCondition.sk;
        }
        
        dynamoQuery.KeyConditionExpression = keyConditionExpression.join(' AND ');
        dynamoQuery.ExpressionAttributeNames = expressionAttributeNames;
        dynamoQuery.ExpressionAttributeValues = expressionAttributeValues;
        
        // Use GSI if specified
        if (dbSpecific.gsiName) {
          dynamoQuery.IndexName = dbSpecific.gsiName;
        }
        
        // Add filter expressions for additional WHERE conditions
        if (query.where && query.where.length > 0) {
          const filterExpressions: string[] = [];
          
          for (const condition of query.where) {
            const placeholder = `:val${Object.keys(expressionAttributeValues).length}`;
            const namePlaceholder = `#${condition.field}`;
            
            expressionAttributeValues[placeholder] = condition.value;
            expressionAttributeNames[namePlaceholder] = condition.field;
            
            const dynamoOperator = this.sqlToDynamoOperator(condition.operator);
            filterExpressions.push(`${namePlaceholder} ${dynamoOperator} ${placeholder}`);
          }
          
          if (filterExpressions.length > 0) {
            dynamoQuery.FilterExpression = filterExpressions.join(' AND ');
          }
        }
        
      } else if (query.where && query.where.length > 0) {
        // Fallback to scan operation with filters
        dynamoQuery.operation = 'SCAN';
        const filterExpressions: string[] = [];
        const expressionAttributeValues: any = {};
        const expressionAttributeNames: any = {};
        
        for (const condition of query.where) {
          const placeholder = `:val${Object.keys(expressionAttributeValues).length}`;
          const namePlaceholder = `#${condition.field}`;
          
          expressionAttributeValues[placeholder] = condition.value;
          expressionAttributeNames[namePlaceholder] = condition.field;
          
          const dynamoOperator = this.sqlToDynamoOperator(condition.operator);
          filterExpressions.push(`${namePlaceholder} ${dynamoOperator} ${placeholder}`);
        }
        
        if (filterExpressions.length > 0) {
          dynamoQuery.FilterExpression = filterExpressions.join(' AND ');
          dynamoQuery.ExpressionAttributeValues = expressionAttributeValues;
          dynamoQuery.ExpressionAttributeNames = expressionAttributeNames;
        }
      } else {
        // Default to scan all items
        dynamoQuery.operation = 'SCAN';
      }
      
      // Projection (select specific attributes)
      if (query.fields && query.fields.length > 0) {
        dynamoQuery.ProjectionExpression = query.fields.map((field, index) => {
          const namePlaceholder = `#field${index}`;
          dynamoQuery.ExpressionAttributeNames = dynamoQuery.ExpressionAttributeNames || {};
          dynamoQuery.ExpressionAttributeNames[namePlaceholder] = field;
          return namePlaceholder;
        }).join(', ');
      }
      
      // Limit
      if (query.limit) {
        dynamoQuery.Limit = query.limit;
      }
      
      // Note: DynamoDB doesn't support complex aggregations natively
      if (query.aggregate) {
        dynamoQuery.note = 'DynamoDB aggregations require client-side processing or DynamoDB Streams + Lambda';
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
    const hasComplexQuery = query.where && query.where.length > 0;
    const hasAggregation = query.aggregate && query.aggregate.length > 0;
    const hasGroupBy = query.groupBy && query.groupBy.length > 0;
    
    // Use RedisSearch for complex queries with filtering and aggregation
    if (hasComplexQuery || hasAggregation || hasGroupBy) {
      return this.toRedisSearch(query);
    }
    
    // Use RedisGraph for relational-style queries
    if (query.orderBy && query.orderBy.length > 0) {
      return this.toRedisGraph(query);
    }
    
    // Fallback to basic Redis operations
    const redisQuery: any = {
      operation: 'SCAN',
      pattern: '*',
    };
    
    if (query.operation === 'FIND') {
      if (query.where && query.where.length > 0) {
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
    }
    
    return redisQuery;
  }
  
  private static toRedisSearch(query: QueryLanguage): object {
    const searchQuery: any = {
      module: 'RediSearch',
      command: 'FT.SEARCH',
      index: query.table,
      query: '*',
      options: {}
    };
    
    // Build search query string
    if (query.where && query.where.length > 0) {
      const queryParts = query.where.map(condition => {
        switch (condition.operator) {
          case '=':
            return `@${condition.field}:{${condition.value}}`;
          case '!=':
            return `-@${condition.field}:{${condition.value}}`;
          case '>':
            return `@${condition.field}:[${condition.value} +inf]`;
          case '<':
            return `@${condition.field}:[-inf ${condition.value}]`;
          case '>=':
            return `@${condition.field}:[${condition.value} +inf]`;
          case '<=':
            return `@${condition.field}:[-inf ${condition.value}]`;
          case 'LIKE':
            return `@${condition.field}:*${condition.value}*`;
          case 'IN':
            const values = Array.isArray(condition.value) ? condition.value : [condition.value];
            return `@${condition.field}:{${values.join('|')}}`;
          default:
            return `@${condition.field}:{${condition.value}}`;
        }
      });
      
      searchQuery.query = queryParts.join(' ');
    }
    
    // Add aggregation if present
    if (query.aggregate && query.aggregate.length > 0) {
      searchQuery.command = 'FT.AGGREGATE';
      searchQuery.pipeline = [];
      
      // Group by clause
      if (query.groupBy && query.groupBy.length > 0) {
        const groupBy = query.groupBy.map(field => `@${field}`);
        const reducers = query.aggregate.map(agg => {
          const func = agg.function.toLowerCase();
          return `REDUCE ${func.toUpperCase()} 1 @${agg.field} AS ${agg.alias || agg.field}`;
        });
        
        searchQuery.pipeline.push({
          operation: 'GROUPBY',
          fields: groupBy,
          reducers: reducers
        });
      } else {
        // Global aggregation
        const reducers = query.aggregate.map(agg => {
          const func = agg.function.toLowerCase();
          return `REDUCE ${func.toUpperCase()} 1 @${agg.field} AS ${agg.alias || agg.field}`;
        });
        
        searchQuery.pipeline.push({
          operation: 'GROUPBY',
          fields: [],
          reducers: reducers
        });
      }
    }
    
    // Sort by clause
    if (query.orderBy && query.orderBy.length > 0) {
      const sortBy = query.orderBy.map(order => `@${order.field} ${order.direction}`);
      searchQuery.pipeline = searchQuery.pipeline || [];
      searchQuery.pipeline.push({
        operation: 'SORTBY',
        fields: sortBy
      });
    }
    
    // Limit
    if (query.limit) {
      searchQuery.options.LIMIT = [0, query.limit];
    }
    
    // Return specific fields
    if (query.fields && query.fields.length > 0) {
      searchQuery.options.RETURN = query.fields.map(field => `@${field}`);
    }
    
    return searchQuery;
  }
  
  private static toRedisGraph(query: QueryLanguage): object {
    const graphQuery: any = {
      module: 'RedisGraph',
      command: 'GRAPH.QUERY',
      graph: query.table,
      query: ''
    };
    
    // Build Cypher-like query
    let cypherQuery = `MATCH (n:${query.table})`;
    
    // WHERE clause
    if (query.where && query.where.length > 0) {
      const whereConditions = query.where.map(condition => {
        let value = condition.value;
        if (typeof value === 'string') {
          value = `"${value}"`;
        }
        
        switch (condition.operator) {
          case '=': return `n.${condition.field} = ${value}`;
          case '!=': return `n.${condition.field} <> ${value}`;
          case '>': return `n.${condition.field} > ${value}`;
          case '<': return `n.${condition.field} < ${value}`;
          case '>=': return `n.${condition.field} >= ${value}`;
          case '<=': return `n.${condition.field} <= ${value}`;
          case 'LIKE': return `n.${condition.field} CONTAINS ${value}`;
          default: return `n.${condition.field} = ${value}`;
        }
      });
      
      cypherQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // RETURN clause with aggregation
    if (query.aggregate && query.aggregate.length > 0) {
      const aggregations = query.aggregate.map(agg => {
        const func = agg.function.toLowerCase();
        return `${func}(n.${agg.field}) AS ${agg.alias || agg.field}`;
      });
      
      if (query.groupBy && query.groupBy.length > 0) {
        const groupFields = query.groupBy.map(field => `n.${field}`);
        cypherQuery += ` RETURN ${groupFields.join(', ')}, ${aggregations.join(', ')}`;
      } else {
        cypherQuery += ` RETURN ${aggregations.join(', ')}`;
      }
    } else if (query.fields && query.fields.length > 0) {
      const returnFields = query.fields.map(field => `n.${field}`);
      cypherQuery += ` RETURN ${returnFields.join(', ')}`;
    } else {
      cypherQuery += ' RETURN n';
    }
    
    // ORDER BY clause
    if (query.orderBy && query.orderBy.length > 0) {
      const orderFields = query.orderBy.map(order => `n.${order.field} ${order.direction}`);
      cypherQuery += ` ORDER BY ${orderFields.join(', ')}`;
    }
    
    // LIMIT clause
    if (query.limit) {
      cypherQuery += ` LIMIT ${query.limit}`;
    }
    
    graphQuery.query = cypherQuery;
    return graphQuery;
  }
}
