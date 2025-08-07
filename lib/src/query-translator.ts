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

      // FROM clause - use explicit index if specified, otherwise use table
      const fromTable = query.index || query.table;
      sql += ` FROM ${fromTable}`;

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

      // Note: No semicolon added for compatibility with Elasticsearch SQL translate
    }

    return sql;
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
      for (const [field, range] of Array.from(rangeMap.entries())) {
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
    for (const [field, range] of Array.from(rangeMap.entries())) {
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
