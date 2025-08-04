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
      body: {}
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
        const mustConditions: any[] = [];
        const mustNotConditions: any[] = [];
        
        for (const condition of query.where) {
          const esCondition = this.sqlToESCondition(condition);
          if (esCondition) {
            // Handle NOT conditions separately
            if (condition.operator === '!=' || condition.operator === 'NOT IN') {
              mustNotConditions.push(esCondition);
            } else {
              mustConditions.push(esCondition);
            }
          }
        }
        
        // Build query structure based on what conditions we have
        if (mustConditions.length > 0 || mustNotConditions.length > 0) {
          const boolQuery: any = { bool: {} };
          
          if (mustConditions.length > 0) {
            boolQuery.bool.must = mustConditions;
          }
          
          if (mustNotConditions.length > 0) {
            boolQuery.bool.must_not = mustNotConditions;
          }
          
          esQuery.body.query = boolQuery;
        }
      } else {
        // Default to match_all if no conditions
        esQuery.body.query = { match_all: {} };
      }
      
      // Add aggregations with nested support
      if (query.aggregate && query.aggregate.length > 0) {
        esQuery.body.aggs = {};
        
        if (query.groupBy && query.groupBy.length > 0) {
          const groupField = query.groupBy[0];
          const groupName = `${groupField}_group`;
          
          // Check if grouping on nested field
          if (groupField.includes('.')) {
            const [nestedPath, nestedField] = groupField.split('.', 2);
            esQuery.body.aggs[groupName] = {
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
              const aggName = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
              esQuery.body.aggs[groupName].aggs.group_by.aggs[aggName] = {
                [esAggFunc]: { field: agg.field }
              };
            }
          } else {
            esQuery.body.aggs[groupName] = {
              terms: { field: groupField },
              aggs: {},
            };
            
            for (const agg of query.aggregate) {
              const esAggFunc = this.sqlToESAggregateFunction(agg.function);
              const aggName = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
              esQuery.body.aggs[groupName].aggs[aggName] = {
                [esAggFunc]: { field: agg.field },
              };
            }
          }
          
          // Set size to 0 for aggregation-only queries
          esQuery.body.size = 0;
        } else {
          // Global aggregations without grouping
          for (const agg of query.aggregate) {
            const esAggFunc = this.sqlToESAggregateFunction(agg.function);
            const aggName = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
            esQuery.body.aggs[aggName] = {
              [esAggFunc]: { field: agg.field },
            };
          }
          
          // Set size to 0 for aggregation-only queries
          esQuery.body.size = 0;
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
      
      // Add Elasticsearch-specific features
      if (esSpecific) {
        // Add boost scoring
        if (esSpecific.boost && esQuery.body.query.bool?.must) {
          for (const mustCondition of esQuery.body.query.bool.must) {
            if (mustCondition.match) {
              const fieldName = Object.keys(mustCondition.match)[0];
              if (esSpecific.boost[fieldName]) {
                if (typeof mustCondition.match[fieldName] === 'string') {
                  mustCondition.match[fieldName] = {
                    query: mustCondition.match[fieldName],
                    boost: esSpecific.boost[fieldName]
                  };
                } else {
                  mustCondition.match[fieldName].boost = esSpecific.boost[fieldName];
                }
              }
            }
          }
        }
        
        // Add fuzzy matching
        if (esSpecific.fuzzy && esQuery.body.query.bool?.must) {
          for (let i = 0; i < esQuery.body.query.bool.must.length; i++) {
            const mustCondition = esQuery.body.query.bool.must[i];
            if (mustCondition.match) {
              const fieldName = Object.keys(mustCondition.match)[0];
              if (esSpecific.fuzzy[fieldName]) {
                const value = typeof mustCondition.match[fieldName] === 'string' 
                  ? mustCondition.match[fieldName] 
                  : mustCondition.match[fieldName].query;
                
                esQuery.body.query.bool.must[i] = {
                  fuzzy: {
                    [fieldName]: {
                      value: value,
                      ...esSpecific.fuzzy[fieldName]
                    }
                  }
                };
              }
            }
          }
        }
        
        // Add highlighting
        if (esSpecific.highlight) {
          esQuery.body.highlight = esSpecific.highlight;
        }
      }
    }
    
    return esQuery;
  }
  
  static toDynamoDB(query: QueryLanguage, schemaConfig?: { partitionKey?: string; sortKey?: string; globalSecondaryIndexes?: Array<{ name: string; partitionKey: string; sortKey?: string; }>; }): object {
    if (query.operation !== 'FIND') {
      return { TableName: query.table };
    }

    const dynamoQuery: any = {
      TableName: query.table,
    };

    // Handle DB_SPECIFIC for advanced DynamoDB features
    if (query.dbSpecific?.partition_key || query.dbSpecific?.sort_key || 
        query.dbSpecific?.partition_key_attribute || query.dbSpecific?.sort_key_attribute) {
      return this.buildDBSpecificDynamoQuery(query, dynamoQuery, schemaConfig);
    }

    // Check if this is a primary key query (efficient Query operation)
    const primaryKeyCondition = query.where?.find(w => 
      (w.field === 'id' || w.field.endsWith('_id')) && w.operator === '='
    );

    if (primaryKeyCondition) {
      // Use Query operation for primary key lookups
      return this.buildDynamoQueryOperation(query, dynamoQuery, primaryKeyCondition, schemaConfig);
    }

    // Default to Scan operation with filters
    return this.buildDynamoScanOperation(query, dynamoQuery);
  }
  
  private static buildDBSpecificDynamoQuery(query: QueryLanguage, dynamoQuery: any, schemaConfig?: { partitionKey?: string; sortKey?: string; globalSecondaryIndexes?: Array<{ name: string; partitionKey: string; sortKey?: string; }>; }): object {
    // Handle explicit DB_SPECIFIC parameters for single-table design
    const expressionAttributeNames: any = {};
    const expressionAttributeValues: any = {};
    const keyConditions: string[] = [];

    // Get actual key names - inline attributes override schema config, fall back to defaults
    const partitionKeyName = query.dbSpecific!.partition_key_attribute || schemaConfig?.partitionKey || 'PK';
    const sortKeyName = query.dbSpecific!.sort_key_attribute || schemaConfig?.sortKey || 'SK';

    // Handle partition key
    if (query.dbSpecific!.partition_key) {
      expressionAttributeNames['#pk'] = partitionKeyName;
      keyConditions.push('#pk = :pk');
      expressionAttributeValues[':pk'] = query.dbSpecific!.partition_key;
    }

    // Handle sort key
    if (query.dbSpecific!.sort_key) {
      expressionAttributeNames['#sk'] = sortKeyName;
      keyConditions.push('#sk = :sk');
      expressionAttributeValues[':sk'] = query.dbSpecific!.sort_key;
    } else if (query.dbSpecific!.sort_key_prefix) {
      expressionAttributeNames['#sk'] = sortKeyName;
      keyConditions.push('begins_with(#sk, :sk_prefix)');
      expressionAttributeValues[':sk_prefix'] = query.dbSpecific!.sort_key_prefix;
    }

    if (keyConditions.length > 0) {
      dynamoQuery.KeyConditionExpression = keyConditions.join(' AND ');
      dynamoQuery.ExpressionAttributeNames = expressionAttributeNames;
      dynamoQuery.ExpressionAttributeValues = expressionAttributeValues;
    }

    // Add filters for WHERE conditions
    this.addDynamoFilters(query, dynamoQuery);

    // Add projection and limits
    return this.addDynamoProjectionAndLimits(query, dynamoQuery);
  }
  
  private static buildDynamoQueryOperation(query: QueryLanguage, dynamoQuery: any, primaryKeyCondition: any, schemaConfig?: { partitionKey?: string; sortKey?: string; globalSecondaryIndexes?: Array<{ name: string; partitionKey: string; sortKey?: string; }>; }): object {
    // Use Query operation for efficient primary key lookups
    const expressionAttributeNames: any = {};
    const expressionAttributeValues: any = {};

    // Set up primary key condition using actual key name from schema
    const keyFieldName = primaryKeyCondition.field;
    const actualKeyName = schemaConfig?.partitionKey || keyFieldName;
    expressionAttributeNames[`#${keyFieldName}`] = actualKeyName;
    expressionAttributeValues[`:${keyFieldName}`] = primaryKeyCondition.value;
    dynamoQuery.KeyConditionExpression = `#${keyFieldName} = :${keyFieldName}`;

    dynamoQuery.ExpressionAttributeNames = expressionAttributeNames;
    dynamoQuery.ExpressionAttributeValues = expressionAttributeValues;

    // Filter out primary key condition from WHERE and add remaining as filters
    const otherConditions = query.where?.filter(w => w !== primaryKeyCondition) || [];
    if (otherConditions.length > 0) {
      const tempQuery = { ...query, where: otherConditions };
      this.addDynamoFilters(tempQuery, dynamoQuery);
    }

    return this.addDynamoProjectionAndLimits(query, dynamoQuery);
  }
  
  private static buildDynamoScanOperation(query: QueryLanguage, dynamoQuery: any): object {
    // Use Scan operation for non-primary key queries
    this.addDynamoFilters(query, dynamoQuery);
    return this.addDynamoProjectionAndLimits(query, dynamoQuery);
  }

  private static addDynamoFilters(query: QueryLanguage, dynamoQuery: any): void {
    if (!query.where || query.where.length === 0) return;

    const filterExpressions: string[] = [];
    const expressionAttributeValues = dynamoQuery.ExpressionAttributeValues || {};
    const expressionAttributeNames = dynamoQuery.ExpressionAttributeNames || {};

    for (const condition of query.where) {
      // Ensure unique placeholder numbering by counting existing placeholders  
      let placeholderNum = 0;
      const existingVals = Object.keys(expressionAttributeValues).filter(k => k.startsWith(':val'));
      if (existingVals.length > 0) {
        const nums = existingVals.map(k => parseInt(k.replace(':val', ''), 10)).filter(n => !isNaN(n));
        placeholderNum = nums.length > 0 ? Math.max(...nums) + 1 : 0;
      }
      
      const placeholder = `:val${placeholderNum}`;
      const namePlaceholder = `#${condition.field.replace(/[^a-zA-Z0-9]/g, '_')}`;

      expressionAttributeNames[namePlaceholder] = condition.field;
      
      if (condition.operator === 'IN') {
        // Handle IN operator with array values
        let values = condition.value;
        if (typeof values === 'string') {
          // Parse array string - handle proper array format
          values = values.replace(/[\[\]()]/g, '').split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        }
        if (Array.isArray(values)) {
          const inPlaceholders = values.map((_, i) => `${placeholder}_${i}`);
          values.forEach((val, i) => {
            expressionAttributeValues[`${placeholder}_${i}`] = val;
          });
          filterExpressions.push(`${namePlaceholder} IN (${inPlaceholders.join(', ')})`);
        }
      } else {
        expressionAttributeValues[placeholder] = condition.value;
        const dynamoOperator = this.sqlToDynamoOperator(condition.operator);
        filterExpressions.push(`${namePlaceholder} ${dynamoOperator} ${placeholder}`);
      }
    }

    if (filterExpressions.length > 0) {
      dynamoQuery.FilterExpression = filterExpressions.join(' AND ');
      dynamoQuery.ExpressionAttributeValues = expressionAttributeValues;
      dynamoQuery.ExpressionAttributeNames = expressionAttributeNames;
    }
  }

  private static addDynamoProjectionAndLimits(query: QueryLanguage, dynamoQuery: any): object {
    // Projection (select specific attributes)
    if (query.fields && query.fields.length > 0) {
      if (!dynamoQuery.ExpressionAttributeNames) {
        dynamoQuery.ExpressionAttributeNames = {};
      }
      
      dynamoQuery.ProjectionExpression = query.fields.map((field, index) => {
        const namePlaceholder = `#field${index}`;
        dynamoQuery.ExpressionAttributeNames[namePlaceholder] = field;
        return namePlaceholder;
      }).join(', ');
    }

    // Limit
    if (query.limit) {
      dynamoQuery.Limit = query.limit;
    }

    // DynamoDB doesn't support complex aggregations natively - throw error
    if (query.aggregate && query.aggregate.length > 0) {
      throw new Error('DynamoDB does not support native aggregations (COUNT, SUM, AVG, etc.). Consider using application-level processing or switch to a different database type.');
    }
    
    if (query.groupBy && query.groupBy.length > 0) {
      throw new Error('DynamoDB does not support GROUP BY operations. Consider using application-level processing or switch to a different database type.');
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
    let value = condition.value;
    
    // Process array values for IN operations
    if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
      if (typeof value === 'string') {
        value = this.processInValues(value);
      } else if (!Array.isArray(value)) {
        value = [value];
      }
    }
    
    switch (condition.operator) {
      case '=':
        return { term: { [field]: value } };
      case '!=':
        return { term: { [field]: value } }; // Will be handled by must_not in parent
      case 'IN':
        return { terms: { [field]: value } };
      case 'NOT IN':
        return { terms: { [field]: value } }; // Will be handled by must_not in parent
      case '>':
        return { range: { [field]: { gt: value } } };
      case '<':
        return { range: { [field]: { lt: value } } };
      case '>=':
        return { range: { [field]: { gte: value } } };
      case '<=':
        return { range: { [field]: { lte: value } } };
      case 'LIKE':
        // Convert SQL LIKE patterns to Elasticsearch patterns
        const likePattern = value.replace(/%/g, '*');
        return { match: { [field]: likePattern } };
      case 'ILIKE':
        // Case-insensitive LIKE
        const ilikePattern = value.replace(/%/g, '*');
        return { match: { [field]: { query: ilikePattern, case_insensitive: true } } };
      default:
        return null;
    }
  }

  private static sqlToESAggregateFunction(sqlFunction: string): string {
    const mapping: Record<string, string> = {
      'COUNT': 'value_count',
      'SUM': 'sum',
      'AVG': 'avg',
      'MIN': 'min',
      'MAX': 'max'
    };
    
    return mapping[sqlFunction] || 'value_count';
  }
  

  
  private static sqlToDynamoOperator(sqlOp: string): string {
    const mapping: Record<string, string> = {
      '=': '=',
      '!=': '<>',
      '<': '<',
      '>': '>',
      '<=': '<=',
      '>=': '>=',
      'IN': 'IN',
      'NOT IN': 'NOT IN'
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
    
    // Check for specific key lookup (more flexible field matching)
    const keyCondition = query.where?.find(w => 
      (w.field === 'key' || w.field === 'id' || w.field.includes('_id') || w.field.includes('key')) && 
      w.operator === '='
    );
    if (keyCondition) {
      // For hash IDs, format as table:id
      if (keyCondition.field.includes('_id') || keyCondition.field === 'id') {
        return {
          operation: 'GET',
          key: `${query.table}:${keyCondition.value}`
        };
      }
      return {
        operation: 'GET',
        key: keyCondition.value
      };
    }
    
    // Check for batch key lookup  
    const inCondition = query.where?.find(w => w.field === 'id' && w.operator === 'IN');
    if (inCondition) {
      let values = inCondition.value;
      if (typeof values === 'string') {
        // Parse array string like "[123, 456, 789]" or "['123', '456', '789']"
        const cleanValue = values.replace(/[\[\]]/g, '').trim();
        if (cleanValue) {
          values = cleanValue.split(',').map(v => v.trim().replace(/['"]/g, ''));
        } else {
          values = [];
        }
      }
      
      if (Array.isArray(values) && values.length > 0) {
        return {
          operation: 'MGET',
          keys: values.map(id => `${query.table}:${id}`)
        };
      }
    }
    
    // Check if query has complex features that require Redis Search
    const hasComplexFeatures = (
      (query.where && query.where.length > 1) ||  // Multiple conditions
      (query.where && query.where.some(w => w.operator !== '=' && w.operator !== 'IN')) ||  // Non-equality operators
      (query.where && query.where.some(w => w.operator === 'IN')) ||  // IN operations
      query.orderBy ||  // Sorting
      query.aggregate   // Aggregations
    );

    if (hasComplexFeatures) {
      // Auto-enable Redis Search for complex queries
      return {
        operation: 'FT.SEARCH',
        index: `${query.table}_idx`,
        query: this.buildRedisSearchQuery(query),
        limit: { offset: query.offset || 0, num: query.limit || 10 },
        sortBy: query.orderBy ? { field: query.orderBy[0].field, direction: query.orderBy[0].direction } : undefined,
        aggregations: query.aggregate ? this.buildRedisAggregations(query.aggregate) : undefined
      };
    }

    // Default to SCAN operation for simple queries
    return {
      operation: 'SCAN',
      pattern: `${query.table}:*`,
      count: query.limit || 1000
    };
  }
  
  private static toRedisSearch(query: QueryLanguage): object {
    const dbSpecific = query.dbSpecific?.redis;
    const searchQuery: any = {
      operation: 'FT.SEARCH',
      index: dbSpecific?.search_index || `${query.table}_idx`,
      query: '*',
      limit: { offset: 0, num: query.limit || 10 }
    };
    
    // Build search query string  
    if (query.where && query.where.length > 0) {
      // Handle range queries specially - combine >= and <= for same field
      const conditions = [...query.where];
      const rangeMap = new Map<string, { min?: any, max?: any }>();
      const nonRangeConditions = [];

      for (const condition of conditions) {
        if ((condition.operator === '>=' || condition.operator === '>') && 
            conditions.some(c => c.field === condition.field && (c.operator === '<=' || c.operator === '<'))) {
          // This is part of a range query
          if (!rangeMap.has(condition.field)) {
            rangeMap.set(condition.field, {});
          }
          const range = rangeMap.get(condition.field)!;
          range.min = condition.value;
        } else if ((condition.operator === '<=' || condition.operator === '<') &&
                   conditions.some(c => c.field === condition.field && (c.operator === '>=' || c.operator === '>'))) {
          // This is part of a range query
          if (!rangeMap.has(condition.field)) {
            rangeMap.set(condition.field, {});
          }
          const range = rangeMap.get(condition.field)!;
          range.max = condition.value;
        } else {
          nonRangeConditions.push(condition);
        }
      }

      const queryParts = [];

      // Handle range queries
      for (const [field, range] of rangeMap.entries()) {
        if (range.min !== undefined && range.max !== undefined) {
          queryParts.push(`@${field}:[${range.min} ${range.max}]`);
        } else if (range.min !== undefined) {
          queryParts.push(`@${field}:[${range.min} +inf]`);
        } else if (range.max !== undefined) {
          queryParts.push(`@${field}:[-inf ${range.max}]`);
        }
      }

      // Handle non-range conditions
      for (const condition of nonRangeConditions) {
        if (rangeMap.has(condition.field)) continue; // Skip - already handled as range
        
        switch (condition.operator) {
          case '=':
            queryParts.push(`@${condition.field}:{${condition.value}}`);
            break;
          case '!=':
            queryParts.push(`-@${condition.field}:{${condition.value}}`);
            break;
          case '>':
            queryParts.push(`@${condition.field}:[${condition.value} +inf]`);
            break;
          case '<':
            queryParts.push(`@${condition.field}:[-inf ${condition.value}]`);
            break;
          case '>=':
            queryParts.push(`@${condition.field}:[${condition.value} +inf]`);
            break;
          case '<=':
            queryParts.push(`@${condition.field}:[-inf ${condition.value}]`);
            break;
          case 'LIKE':
            const likeValue = condition.value.toString().replace('%', '*');
            // Handle quoted strings for exact phrase matching
            if (likeValue.includes(' ')) {
              queryParts.push(`${condition.field}:"${likeValue.replace('*', '')}"`);
            } else {
              queryParts.push(`${condition.field}:${likeValue}`);
            }
            break;
          case 'IN':
            const values = Array.isArray(condition.value) ? condition.value : [condition.value];
            queryParts.push(`@${condition.field}:{${values.join('|')}}`);
            break;
          default:
            queryParts.push(`@${condition.field}:{${condition.value}}`);
        }
      }
      
      searchQuery.query = queryParts.join(' ');
    }
    
    // Handle aggregation
    if (query.aggregate && query.aggregate.length > 0) {
      searchQuery.operation = 'FT.AGGREGATE';
    }
    
    // Update limit for specific cases
    if (query.limit) {
      searchQuery.limit = { offset: 0, num: query.limit };
    }
    
    return searchQuery;
  }

  private static buildRedisSearchQuery(query: QueryLanguage): string {
    if (!query.where || query.where.length === 0) {
      return '*';
    }

    const queryParts = [];
    
    // Handle range queries specially - combine >= and <= for same field
    const conditions = [...query.where];
    const rangeMap = new Map<string, { min?: any, max?: any }>();
    const nonRangeConditions = [];

    for (const condition of conditions) {
      if ((condition.operator === '>=' || condition.operator === '>') && 
          conditions.some(c => c.field === condition.field && (c.operator === '<=' || c.operator === '<'))) {
        // This is part of a range query
        if (!rangeMap.has(condition.field)) {
          rangeMap.set(condition.field, {});
        }
        const range = rangeMap.get(condition.field)!;
        range.min = condition.value;
      } else if ((condition.operator === '<=' || condition.operator === '<') &&
                 conditions.some(c => c.field === condition.field && (c.operator === '>=' || c.operator === '>'))) {
        // This is part of a range query
        if (!rangeMap.has(condition.field)) {
          rangeMap.set(condition.field, {});
        }
        const range = rangeMap.get(condition.field)!;
        range.max = condition.value;
      } else {
        nonRangeConditions.push(condition);
      }
    }

    // Handle range queries
    for (const [field, range] of rangeMap.entries()) {
      if (range.min !== undefined && range.max !== undefined) {
        queryParts.push(`@${field}:[${range.min} ${range.max}]`);
      } else if (range.min !== undefined) {
        queryParts.push(`@${field}:[${range.min} +inf]`);
      } else if (range.max !== undefined) {
        queryParts.push(`@${field}:[-inf ${range.max}]`);
      }
    }

    // Handle non-range conditions
    for (const condition of nonRangeConditions) {
      if (rangeMap.has(condition.field)) continue; // Skip - already handled as range
      
      switch (condition.operator) {
        case '=':
          queryParts.push(`@${condition.field}:{${condition.value}}`);
          break;
        case '!=':
          queryParts.push(`-@${condition.field}:{${condition.value}}`);
          break;
        case '>':
          queryParts.push(`@${condition.field}:[${condition.value} +inf]`);
          break;
        case '<':
          queryParts.push(`@${condition.field}:[-inf ${condition.value}]`);
          break;
        case '>=':
          queryParts.push(`@${condition.field}:[${condition.value} +inf]`);
          break;
        case '<=':
          queryParts.push(`@${condition.field}:[-inf ${condition.value}]`);
          break;
        case 'IN':
          let values = condition.value;
          if (typeof values === 'string') {
            const cleanValue = values.replace(/[\[\]]/g, '').trim();
            if (cleanValue) {
              values = cleanValue.split(',').map(v => v.trim().replace(/['"]/g, ''));
            } else {
              values = [];
            }
          }
          if (Array.isArray(values)) {
            const inQuery = values.map(v => `@${condition.field}:{${v}}`).join('|');
            queryParts.push(`(${inQuery})`);
          }
          break;
        case 'LIKE':
          const likePattern = condition.value.replace(/%/g, '*');
          queryParts.push(`@${condition.field}:${likePattern}`);
          break;
        case 'ILIKE':
          const ilikePattern = condition.value.replace(/%/g, '*');
          queryParts.push(`@${condition.field}:${ilikePattern}`);
          break;
      }
    }

    return queryParts.join(' ');
  }

  private static buildRedisAggregations(aggregations: any[]): any[] {
    return aggregations.map(agg => {
      switch (agg.function) {
        case 'COUNT':
          return {
            operation: 'REDUCE',
            function: 'COUNT',
            field: agg.field,
            alias: agg.alias || 'count'
          };
        case 'SUM':
          return {
            operation: 'REDUCE',
            function: 'SUM',
            field: agg.field,
            alias: agg.alias || 'sum'
          };
        case 'AVG':
          return {
            operation: 'REDUCE',
            function: 'AVG',
            field: agg.field,
            alias: agg.alias || 'avg'
          };
        case 'MIN':
          return {
            operation: 'REDUCE',
            function: 'MIN',
            field: agg.field,
            alias: agg.alias || 'min'
          };
        case 'MAX':
          return {
            operation: 'REDUCE',
            function: 'MAX',
            field: agg.field,
            alias: agg.alias || 'max'
          };
        default:
          return {
            operation: 'REDUCE',
            function: 'COUNT',
            field: agg.field,
            alias: agg.alias || 'count'
          };
      }
    });
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
          case '=': return `${query.table}.${condition.field} = ${value}`;
          case '!=': return `${query.table}.${condition.field} <> ${value}`;
          case '>': return `${query.table}.${condition.field} > ${value}`;
          case '<': return `${query.table}.${condition.field} < ${value}`;
          case '>=': return `${query.table}.${condition.field} >= ${value}`;
          case '<=': return `${query.table}.${condition.field} <= ${value}`;
          case 'LIKE': return `${query.table}.${condition.field} CONTAINS ${value}`;
          default: return `${query.table}.${condition.field} = ${value}`;
        }
      });
      
      cypherQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Handle JOINs as graph relationships (after WHERE clause)
    if (query.joins && query.joins.length > 0) {
      for (const joinClause of query.joins) {
        // Determine relationship type based on table name or use generic connection
        let relationshipType = 'CONNECTED_TO';
        if (joinClause.table === 'follows') {
          relationshipType = 'FOLLOWS';
        } else if (joinClause.table === 'friends') {
          relationshipType = 'FRIENDS_WITH';
        }
        
        cypherQuery += ` OPTIONAL MATCH (${query.table})-[:${relationshipType}]->(${joinClause.table})`;
      }
    }
    
    // RETURN clause with aggregation
    if (query.aggregate && query.aggregate.length > 0) {
      const aggregations = query.aggregate.map(agg => {
        const func = agg.function.toUpperCase(); // Use uppercase for Cypher
        return `${func}(${query.table}.${agg.field}) AS ${agg.alias || agg.field}`;
      });
      
      if (query.groupBy && query.groupBy.length > 0) {
        const groupFields = query.groupBy.map(field => `${query.table}.${field}`);
        cypherQuery += ` RETURN ${groupFields.join(', ')}, ${aggregations.join(', ')}`;
      } else {
        cypherQuery += ` RETURN ${aggregations.join(', ')}`;
      }
    } else if (query.fields && query.fields.length > 0) {
      const returnFields = query.fields.map(field => `${query.table}.${field}`);
      cypherQuery += ` RETURN ${returnFields.join(', ')}`;
    } else if (query.joins && query.joins.length > 0) {
      // Include joined tables in the return
      const returnClause = [query.table, ...query.joins.map(j => j.table)].join(', ');
      cypherQuery += ` RETURN ${returnClause}`;
    } else {
      cypherQuery += ` RETURN ${query.table}`;
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
