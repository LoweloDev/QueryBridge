import { QueryLanguage } from "./types";

export class QueryTranslator {
  static toSQL(query: QueryLanguage): string {
    let sql = '';

    if (query.operation === 'FIND') {
      // SELECT clause
      if (query.fields && query.fields.length > 0) {
        sql = `SELECT ${query.fields.join(', ')}`;
      } else {
        sql = 'SELECT *';
      }

      // FROM clause - handle subTable (schema/database/alias/index)
      let fromTable = query.table;
      if (query.subTable) {
        fromTable = `${query.subTable}.${query.table}`;
      }
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

      // ORDER BY clause
      if (query.orderBy && query.orderBy.length > 0) {
        const orderFields = query.orderBy.map(order =>
          `${order.field} ${order.direction}`
        );
        sql += ` ORDER BY ${orderFields.join(', ')}`;
      }

      // LIMIT clause
      if (query.limit) {
        sql += ` LIMIT ${query.limit}`;
      }

      // // Add semicolon for SQL compatibility
      // sql += ';';
    }

    return sql;
  }















  static toRedis(query: QueryLanguage): object {
    // Redis is a key-value store, so we need to handle queries differently
    const operation = query.operation;
    const key = query.table;

    // Normalize namespace for common entity collections (users -> user:*)
    const singularFromPlural = (name: string): string => {
      if (!name) return name;
      if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
      if (name.endsWith('ses')) return name.slice(0, -2); // e.g., classes -> class
      if (name.endsWith('s')) return name.slice(0, -1);
      return name;
    };

    if (operation === 'FIND') {
      // If table looks like a concrete key (contains ':'), handle hash immediately
      if (key && key.includes(':') && (!query.where || query.where.length === 0)) {
        return { operation: 'HGETALL', key };
      }

      // If querying a collection (e.g., users) with conditions, emit a SCAN_FILTER plan
      if (query.where && query.where.length > 0 && key && !key.includes(':')) {
        const namespace = singularFromPlural(key);
        return {
          operation: 'SCAN_FILTER',
          pattern: `${namespace}:*`,
          count: query.limit || 100,
          filters: query.where.map(w => ({ field: w.field, operator: w.operator, value: w.value }))
        };
      }

      // No WHERE clause
      if (!query.where || query.where.length === 0) {
        // If key is a collection name, list keys under its namespace
        if (key && !key.includes(':')) {
          const namespace = singularFromPlural(key);
          return { operation: 'SCAN', pattern: `${namespace}:*`, count: query.limit || 100 };
        }
        // Otherwise treat as direct key
        return { operation: 'GET', key };
      }

      // Fallbacks for other cases
      const conditions = query.where;
      const likeCondition = conditions.find(c => c.operator === 'LIKE');
      if (likeCondition) {
        return { operation: 'SCAN', pattern: likeCondition.value.replace(/%/g, '*'), count: query.limit || 100 };
      }

      const rangeConditions = conditions.filter(c => ['>', '>=', '<', '<='].includes(c.operator));
      if (rangeConditions.length > 0) {
        return { operation: 'SCAN', pattern: '*', count: query.limit || 100 };
      }

      if (conditions.length === 1 && conditions[0].operator === '=') {
        return { operation: 'GET', key: conditions[0].value };
      }

      return { operation: 'GET', key };
    }

    // Default fallback
    return { operation: 'GET', key };
  }
}
