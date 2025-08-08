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

      // // Add semicolon for SQL compatibility
      // sql += ';';
    }

    return sql;
  }















  static toRedis(query: QueryLanguage): object {
    // For now, Redis will be handled separately as mentioned by the user
    // This is a placeholder for future Redis-specific implementation
    return {
      operation: 'GET',
      key: query.table,
      error: 'Redis support will be implemented separately'
    };
  }
}
