import { QueryLanguage } from "./types";

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
          return condStr;
        });
        
        // Join conditions with logical operators
        const whereClause = [];
        for (let i = 0; i < query.where.length; i++) {
          whereClause.push(conditions[i]);
          if (i < query.where.length - 1 && query.where[i].logical) {
            whereClause.push(` ${query.where[i].logical} `);
          }
        }
        
        sql += ` WHERE ${whereClause.join('')}`;
      }
      
      // GROUP BY clause
      if (query.groupBy && query.groupBy.length > 0) {
        sql += ` GROUP BY ${query.groupBy.join(', ')}`;
      }
      
      // ORDER BY clause (must handle GROUP BY compatibility)
      if (query.orderBy && query.orderBy.length > 0) {
        const orderFields = query.orderBy.map(order => {
          // If we have GROUP BY, only allow ordering by grouped columns or aggregated expressions
          if (query.groupBy && query.groupBy.length > 0) {
            // Check if the order field is in GROUP BY
            if (query.groupBy.includes(order.field)) {
              return `${order.field} ${order.direction}`;
            }
            // For aggregated fields, we need to use the aggregate expression
            if (query.aggregate) {
              const matchingAgg = query.aggregate.find(agg => 
                agg.alias === order.field || agg.field === order.field
              );
              if (matchingAgg) {
                const aggExpr = `${matchingAgg.function}(${matchingAgg.field})`;
                return `${aggExpr} ${order.direction}`;
              }
            }
            // Skip non-grouped, non-aggregated fields when GROUP BY is present
            return null;
          }
          return `${order.field} ${order.direction}`;
        }).filter(Boolean);
        
        if (orderFields.length > 0) {
          sql += ` ORDER BY ${orderFields.join(', ')}`;
        }
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
        mongoQuery.collection = query.table;
        mongoQuery.operation = 'aggregate';
        mongoQuery.aggregate = [];
        
        // Start with match stage for WHERE conditions
        if (query.where && query.where.length > 0) {
          const matchConditions = this.buildMongoMatchConditions(query.where);
          if (Object.keys(matchConditions).length > 0) {
            mongoQuery.aggregate.push({ $match: matchConditions });
          }
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
            
            // Only unwind for INNER joins, not LEFT joins in simple lookups
            if (join.type === 'INNER') {
              mongoQuery.aggregate.push({
                $unwind: {
                  path: `$${join.alias || join.table}`,
                  preserveNullAndEmptyArrays: false
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
            if (query.groupBy.length === 1) {
              groupStage._id = `$${query.groupBy[0]}`;
            } else {
              for (const field of query.groupBy) {
                groupStage._id[field] = `$${field}`;
              }
            }
          } else {
            groupStage._id = null; // Global aggregation
          }
          
          if (query.aggregate) {
            for (const agg of query.aggregate) {
              if (agg.function === 'COUNT') {
                groupStage[agg.alias || agg.field] = { $sum: 1 };
              } else {
                const mongoAggFunc = this.sqlToMongoAggregateFunction(agg.function);
                groupStage[agg.alias || agg.field] = { [mongoAggFunc]: `$${agg.field}` };
              }
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
        mongoQuery.collection = query.table;
        mongoQuery.operation = 'find';
        mongoQuery.query = {};
        mongoQuery.projection = {};
        
        if (query.where && query.where.length > 0) {
          const queryConditions = this.buildMongoMatchConditions(query.where);
          mongoQuery.query = queryConditions;
        }
        
        // Project specific fields
        if (query.fields && query.fields.length > 0) {
          for (const field of query.fields) {
            mongoQuery.projection[field] = 1;
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
        
        if (query.offset) {
          mongoQuery.skip = query.offset;
        }
      }
    }
    
    return mongoQuery;
  }
  
  private static buildMongoMatchConditions(whereConditions: any[]): any {
    const conditions: any = {};
    const orConditions: any[] = [];
    
    for (const condition of whereConditions) {
      if (condition.logical === 'OR') {
        // Handle OR by collecting conditions into $or array
        if (condition.operator === 'LIKE') {
          const regexValue = this.convertLikeToRegex(condition.value);
          orConditions.push({ [condition.field]: { $regex: regexValue, $options: 'i' } });
        } else if (condition.operator === 'IN') {
          const inValues = this.processInValues(condition.value);
          orConditions.push({ [condition.field]: { $in: inValues } });
        } else if (condition.operator === 'NOT IN') {
          const inValues = this.processInValues(condition.value);
          orConditions.push({ [condition.field]: { $nin: inValues } });
        } else if (condition.operator === '=') {
          orConditions.push({ [condition.field]: condition.value });
        } else {
          const mongoOperator = this.sqlToMongoOperator(condition.operator);
          if (mongoOperator) {
            orConditions.push({ [condition.field]: { [mongoOperator]: condition.value } });
          }
        }
      } else {
        // Handle AND conditions (default)
        if (condition.operator === 'LIKE') {
          const regexValue = this.convertLikeToRegex(condition.value);
          conditions[condition.field] = { $regex: regexValue, $options: 'i' };
        } else if (condition.operator === 'IN') {
          const inValues = this.processInValues(condition.value);
          conditions[condition.field] = { $in: inValues };
        } else if (condition.operator === 'NOT IN') {
          const inValues = this.processInValues(condition.value);
          conditions[condition.field] = { $nin: inValues };
        } else if (condition.operator === '=') {
          conditions[condition.field] = condition.value;
        } else {
          const mongoOperator = this.sqlToMongoOperator(condition.operator);
          if (mongoOperator) {
            conditions[condition.field] = { [mongoOperator]: condition.value };
          }
        }
      }
    }
    
    // If we have OR conditions, combine them with AND conditions
    if (orConditions.length > 0) {
      if (Object.keys(conditions).length > 0) {
        return { $and: [conditions, { $or: orConditions }] };
      } else {
        return { $or: orConditions };
      }
    }
    
    return conditions;
  }
  
  private static convertLikeToRegex(likePattern: string): string {
    // Convert SQL LIKE patterns to MongoDB regex
    // 'John%' -> '^John'
    // '%@gmail.com' -> '@gmail\\.com$'
    // '%pattern%' -> 'pattern'
    
    if (likePattern.startsWith('%') && likePattern.endsWith('%')) {
      // Pattern is in the middle
      return likePattern.slice(1, -1).replace(/\./g, '\\.');
    } else if (likePattern.startsWith('%')) {
      // Pattern at the end
      return likePattern.slice(1).replace(/\./g, '\\.') + '$';
    } else if (likePattern.endsWith('%')) {
      // Pattern at the beginning
      return '^' + likePattern.slice(0, -1).replace(/\./g, '\\.');
    } else {
      // Exact pattern
      return '^' + likePattern.replace(/\./g, '\\.') + '$';
    }
  }
  
  private static processInValues(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      // Handle different string formats: ['a','b'] or ["a","b"] or [a,b]
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          return JSON.parse(value.replace(/'/g, '"'));
        } catch {
          // If JSON parse fails, split by comma and clean up
          return value.slice(1, -1).split(',').map((v: string) => v.trim().replace(/['"]/g, ''));
        }
      } else {
        return [value];
      }
    }
    
    return [value];
  }
  
  static toElasticsearch(query: QueryLanguage): object {
    const esQuery: any = {
      index: query.table,
      body: {
        query: { bool: { must: [] } }
      }
    };
    
    if (query.operation === 'FIND') {
      // Check for Elasticsearch-specific features
      const esSpecific = query.dbSpecific?.elasticsearch;
      
      // Handle nested queries
      if (esSpecific?.nested) {
        esQuery.body.query = {
          nested: {
            path: esSpecific.nested.path,
            query: esSpecific.nested.query,
            score_mode: esSpecific.nested.scoreMode || 'avg'
          }
        };
      }
      // Handle parent-child relationships
      else if (esSpecific?.parentChild) {
        esQuery.body.query = {
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
        esQuery.body.query = {
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
            esQuery.body.query.bool.must.push(esCondition);
          }
        }
      } else {
        // Default to match_all if no conditions
        esQuery.body.query = { match_all: {} };
      }
      
      // Add aggregations with nested support
      if (query.aggregate && query.aggregate.length > 0) {
        esQuery.body.aggs = {};
        
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
            esQuery.body.aggs.group_by = {
              terms: { field: groupField },
              aggs: {},
            };
            
            for (const agg of query.aggregate) {
              const esAggFunc = this.sqlToESAggregateFunction(agg.function);
              esQuery.body.aggs.group_by.aggs[agg.alias || agg.field] = {
                [esAggFunc]: { field: agg.field },
              };
            }
          }
        } else {
          for (const agg of query.aggregate) {
            const esAggFunc = this.sqlToESAggregateFunction(agg.function);
            esQuery.body.aggs[agg.alias || agg.field] = {
              [esAggFunc]: { field: agg.field },
            };
          }
        }
      }
      
      // Add sorting
      if (query.orderBy && query.orderBy.length > 0) {
        esQuery.body.sort = query.orderBy.map(order => ({
          [order.field]: { order: order.direction.toLowerCase() },
        }));
      }
      
      // Add size (limit) and from (offset)
      if (query.limit) {
        esQuery.body.size = query.limit;
      }
      
      if (query.offset) {
        esQuery.body.from = query.offset;
      }
      
      // Add source filtering for field selection
      if (query.fields && query.fields.length > 0) {
        esQuery.body._source = query.fields;
      }
    }
    
    return esQuery;
  }
  
  static toDynamoDB(query: QueryLanguage): object {
    const dynamoQuery: any = {
      TableName: query.table,
    };
    
    if (query.operation === 'FIND') {
      // Enhanced single-table design support with intelligent entity mapping
      const entityTypeMapping = this.mapEntityTypeToSingleTable(query.table);
      
      // Check for explicit DB_SPECIFIC parameters first (legacy support)
      if (query.dbSpecific && (query.dbSpecific.partition_key || query.dbSpecific.sort_key)) {
        return this.buildExplicitDynamoQuery(query, dynamoQuery);
      }
      
      // Check for new dbSpecific.dynamodb format
      const dbSpecific = query.dbSpecific?.dynamodb;
      if (dbSpecific?.keyCondition) {
        return this.buildDbSpecificDynamoQuery(query, dynamoQuery, dbSpecific);
      }
      
      // Intelligent single-table design mapping
      if (entityTypeMapping) {
        return this.buildIntelligentDynamoQuery(query, dynamoQuery, entityTypeMapping);
      }
      
      // Fallback to traditional table query
      return this.buildTraditionalDynamoQuery(query, dynamoQuery);
    }
    
    return dynamoQuery;
  }
  
  private static mapEntityTypeToSingleTable(tableName: string): any {
    // Map common entity types to single-table design patterns
    const entityMappings: Record<string, any> = {
      'users': { 
        entityType: 'user',
        sortKeyPrefix: 'USER#',
        defaultTenant: 'TENANT#123' // Default tenant for demo
      },
      'orders': { 
        entityType: 'order',
        sortKeyPrefix: 'ORDER#',
        defaultTenant: 'TENANT#123'
      },
      'products': { 
        entityType: 'product',
        sortKeyPrefix: 'PRODUCT#',
        defaultTenant: 'TENANT#123'
      },
      'categories': { 
        entityType: 'category',
        sortKeyPrefix: 'CATEGORY#',
        defaultTenant: 'TENANT#123'
      },
      'order_items': { 
        entityType: 'order_item',
        sortKeyPrefix: 'ORDER#',
        defaultTenant: 'TENANT#123'
      },
      // Generic table names
      'tenant_data': {
        entityType: 'mixed',
        defaultTenant: 'TENANT#123'
      }
    };
    
    return entityMappings[tableName] || null;
  }
  
  private static buildExplicitDynamoQuery(query: QueryLanguage, dynamoQuery: any): object {
    // Handle explicit DB_SPECIFIC parameters (legacy support)
    const expressionAttributeNames: any = { '#pk': 'PK' };
    const expressionAttributeValues: any = {};
    const keyConditions: string[] = [];
    
    if (query.dbSpecific!.partition_key) {
      keyConditions.push('#pk = :pk');
      expressionAttributeValues[':pk'] = query.dbSpecific!.partition_key;
    }
    
    if (query.dbSpecific!.sort_key) {
      expressionAttributeNames['#sk'] = 'SK';
      keyConditions.push('#sk = :sk');
      expressionAttributeValues[':sk'] = query.dbSpecific!.sort_key;
    } else if (query.dbSpecific!.sort_key_prefix) {
      // Support sort key prefix for efficient begins_with queries
      expressionAttributeNames['#sk'] = 'SK';
      keyConditions.push('begins_with(#sk, :sk_prefix)');
      expressionAttributeValues[':sk_prefix'] = query.dbSpecific!.sort_key_prefix;
    }
    
    dynamoQuery.KeyConditionExpression = keyConditions.join(' AND ');
    dynamoQuery.ExpressionAttributeNames = expressionAttributeNames;
    dynamoQuery.ExpressionAttributeValues = expressionAttributeValues;
    
    // Handle WHERE conditions as FilterExpression
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
    
    return this.addProjectionAndLimits(query, dynamoQuery);
  }
  
  private static buildDbSpecificDynamoQuery(query: QueryLanguage, dynamoQuery: any, dbSpecific: any): object {
    // Handle new dbSpecific.dynamodb format
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
    
    dynamoQuery.operation = 'query';
    return this.addProjectionAndLimits(query, dynamoQuery);
  }
  
  private static buildIntelligentDynamoQuery(query: QueryLanguage, dynamoQuery: any, entityMapping: any): object {
    // Build intelligent single-table design query with enhanced partition support
    const expressionAttributeNames: any = { '#pk': 'PK' };
    const expressionAttributeValues: any = {};
    const keyConditions: string[] = [];
    
    // Support explicit partition key from DB_SPECIFIC or use default tenant
    const partitionKey = query.dbSpecific?.partition_key || entityMapping.defaultTenant;
    keyConditions.push('#pk = :pk');
    expressionAttributeValues[':pk'] = partitionKey;
    
    // Check for specific entity ID in WHERE conditions
    const entityIdCondition = query.where?.find(condition => 
      condition.field === 'id' || condition.field.endsWith('_id')
    );
    
    // Handle sort key conditions with multiple strategies
    if (query.dbSpecific?.sort_key) {
      // Explicit sort key provided
      expressionAttributeNames['#sk'] = 'SK';
      keyConditions.push('#sk = :sk');
      expressionAttributeValues[':sk'] = query.dbSpecific.sort_key;
    } else if (query.dbSpecific?.sort_key_prefix) {
      // Sort key prefix for efficient begins_with queries
      expressionAttributeNames['#sk'] = 'SK';
      keyConditions.push('begins_with(#sk, :sk_prefix)');
      expressionAttributeValues[':sk_prefix'] = query.dbSpecific.sort_key_prefix;
    } else if (entityIdCondition && entityMapping.sortKeyPrefix) {
      // Intelligent entity ID mapping
      expressionAttributeNames['#sk'] = 'SK';
      keyConditions.push('#sk = :sk');
      
      let sortKeyValue = String(entityIdCondition.value);
      if (!sortKeyValue.startsWith(entityMapping.sortKeyPrefix)) {
        sortKeyValue = `${entityMapping.sortKeyPrefix}${sortKeyValue}`;
      }
      expressionAttributeValues[':sk'] = sortKeyValue;
      
      // Remove the ID condition from WHERE since it's now part of the key condition
      query.where = query.where?.filter(condition => condition !== entityIdCondition);
    } else if (entityMapping.sortKeyPrefix && !query.dbSpecific?.partition_key) {
      // Query all entities of this type with prefix
      expressionAttributeNames['#sk'] = 'SK';
      keyConditions.push('begins_with(#sk, :sk_prefix)');
      expressionAttributeValues[':sk_prefix'] = entityMapping.sortKeyPrefix;
    }
    
    dynamoQuery.KeyConditionExpression = keyConditions.join(' AND ');
    dynamoQuery.ExpressionAttributeNames = expressionAttributeNames;
    dynamoQuery.ExpressionAttributeValues = expressionAttributeValues;
    
    // Add entity type filter if we're querying all entities of a type and no explicit partition was specified
    if (entityMapping.entityType !== 'mixed' && !entityIdCondition && !query.dbSpecific?.partition_key) {
      if (!query.where) query.where = [];
      query.where.push({
        field: 'entity_type',
        operator: '=',
        value: entityMapping.entityType
      });
    }
    
    // Handle remaining WHERE conditions as FilterExpression
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
    
    dynamoQuery.operation = 'query';
    return this.addProjectionAndLimits(query, dynamoQuery);
  }
  
  private static buildTraditionalDynamoQuery(query: QueryLanguage, dynamoQuery: any): object {
    // Fallback to scan operation for traditional queries
    dynamoQuery.operation = 'scan';
    
    if (query.where && query.where.length > 0) {
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
    }
    
    return this.addProjectionAndLimits(query, dynamoQuery);
  }
  
  private static addProjectionAndLimits(query: QueryLanguage, dynamoQuery: any): object {
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
        return { bool: { must_not: [{ term: { [field]: value } }] } };
      case 'IN':
        return { terms: { [field]: Array.isArray(value) ? value : [value] } };
      case 'NOT IN':
        return { bool: { must_not: [{ terms: { [field]: Array.isArray(value) ? value : [value] } }] } };
      case '>':
        return { range: { [field]: { gt: value } } };
      case '<':
        return { range: { [field]: { lt: value } } };
      case '>=':
        return { range: { [field]: { gte: value } } };
      case '<=':
        return { range: { [field]: { lte: value } } };
      case 'LIKE':
        return { match: { [field]: value.replace('%', '*') } };
      case 'ILIKE':
        return { match: { [field]: { query: value.replace('%', '*'), case_insensitive: true } } };
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
    const dbSpecific = query.dbSpecific?.redis;
    
    // Handle specific Redis operations from DB_SPECIFIC
    if (dbSpecific) {
      if (dbSpecific.operation === 'subscribe') {
        return {
          operation: 'SUBSCRIBE',
          channels: query.where?.map(w => w.value) || []
        };
      }
      
      if (dbSpecific.operation === 'psubscribe') {
        return {
          operation: 'PSUBSCRIBE',
          patterns: query.where?.map(w => w.value) || []
        };
      }
      
      if (dbSpecific.search_index) {
        return this.toRedisSearch(query);
      }
      
      if (dbSpecific.graph_name) {
        return this.toRedisGraph(query, dbSpecific.graph_name);
      }
      
      if (dbSpecific.data_type) {
        return this.toRedisDataStructure(query, dbSpecific);
      }
    }
    
    // Check for specific key lookup
    const keyCondition = query.where?.find(w => w.field === 'key' && w.operator === '=');
    if (keyCondition) {
      return {
        operation: 'GET',
        key: keyCondition.value
      };
    }
    
    // Check for batch key lookup
    const inCondition = query.where?.find(w => w.field === 'id' && w.operator === 'IN');
    if (inCondition && Array.isArray(inCondition.value)) {
      return {
        operation: 'MGET',
        keys: inCondition.value.map(id => `${query.table}:${id}`)
      };
    }
    
    // Default to SCAN operation
    return {
      operation: 'SCAN',
      pattern: `${query.table}:*`,
      count: query.limit || 1000
    };
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
  
  private static toRedisGraph(query: QueryLanguage, graphName?: string): object {
    const graphQuery: any = {
      operation: 'GRAPH.QUERY',
      graph: graphName || query.table,
      cypher: ''
    };
    
    // Build Cypher-like query
    let cypherQuery = `MATCH (${query.table}:${query.table.charAt(0).toUpperCase() + query.table.slice(1).slice(0, -1)})`;
    
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
    
    graphQuery.cypher = cypherQuery;
    return graphQuery;
  }
  
  private static toRedisDataStructure(query: QueryLanguage, dbSpecific: any): object {
    const dataType = dbSpecific.data_type;
    
    switch (dataType) {
      case 'hash': {
        const keyCondition = query.where?.find(w => w.field.includes('id'));
        if (keyCondition) {
          return {
            operation: 'HGETALL',
            key: `${query.table}:${keyCondition.value}`
          };
        }
        break;
      }
      
      case 'set': {
        const keyCondition = query.where?.find(w => w.field.includes('id'));
        if (keyCondition) {
          return {
            operation: 'SMEMBERS',
            key: `${query.table}:${keyCondition.value}`
          };
        }
        break;
      }
      
      case 'zset': {
        const scoreCondition = query.where?.find(w => w.field === 'score');
        if (scoreCondition) {
          return {
            operation: 'ZRANGEBYSCORE',
            key: query.table,
            min: scoreCondition.operator === '>=' ? scoreCondition.value : scoreCondition.value + 1,
            max: '+inf',
            limit: query.limit ? { offset: 0, count: query.limit } : undefined
          };
        }
        break;
      }
      
      case 'list': {
        const keyCondition = query.where?.find(w => w.field.includes('id'));
        if (keyCondition) {
          return {
            operation: 'LRANGE',
            key: `${query.table}:${keyCondition.value}`,
            start: 0,
            stop: query.limit ? query.limit - 1 : -1
          };
        }
        break;
      }
      
      case 'stream': {
        const streamIdCondition = query.where?.find(w => w.field === 'stream_id');
        if (streamIdCondition) {
          return {
            operation: 'XRANGE',
            key: query.table,
            start: streamIdCondition.value,
            end: '+',
            count: query.limit || 100
          };
        }
        
        if (dbSpecific.consumer && dbSpecific.group) {
          return {
            operation: 'XREADGROUP',
            group: dbSpecific.group,
            consumer: dbSpecific.consumer,
            streams: { [query.table]: '>' },
            count: query.limit || 10
          };
        }
        break;
      }
      
      case 'geo': {
        const latCondition = query.where?.find(w => w.field === 'lat');
        const lonCondition = query.where?.find(w => w.field === 'lon');
        const radiusCondition = query.where?.find(w => w.field === 'radius');
        
        if (latCondition && lonCondition && radiusCondition) {
          return {
            operation: 'GEORADIUS',
            key: query.table,
            longitude: lonCondition.value,
            latitude: latCondition.value,
            radius: radiusCondition.value,
            unit: 'm'
          };
        }
        break;
      }
      
      case 'hyperloglog': {
        const dateCondition = query.where?.find(w => w.field === 'date');
        if (dateCondition) {
          return {
            operation: 'PFCOUNT',
            keys: [`${query.table}:${dateCondition.value}`]
          };
        }
        break;
      }
    }
    
    // Fallback to basic operations
    return {
      operation: 'SCAN',
      pattern: `${query.table}:*`,
      count: query.limit || 1000
    };
  }
}
