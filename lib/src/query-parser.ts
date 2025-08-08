import { QueryLanguage, QueryLanguageSchema } from "./types";

export class QueryParser {
  static parse(queryString: string): QueryLanguage {
    // Enhanced parser that handles both single-line and multi-line queries
    const input = queryString.trim();

    // Check if it's a single-line query by checking if newlines exist
    const isSingleLine = !input.includes('\n');

    let lines: string[];
    if (isSingleLine) {
      // Split single-line query into logical sections
      lines = this.splitSingleLineQuery(input);
    } else {
      // Multi-line query
      lines = input.split('\n').map(line => line.trim()).filter(line => line);
    }

    const result: Partial<QueryLanguage> = {};
    let currentSection = '';
    let whereBuffer = '';
    let aggregateBuffer = '';

    for (const line of lines) {
      const upperLine = line.toUpperCase();

      if (upperLine.startsWith('FIND ')) {
        result.operation = 'FIND';
        const tablePart = line.substring(5).trim();

        // Check for field selection in parentheses: FIND users (name, email) or FIND public.users (name, email)
        const parenMatch = tablePart.match(/^([\w.]+)\s*\(([^)]+)\)/);
        if (parenMatch) {
          const tableIdentifier = parenMatch[1];
          result.fields = parenMatch[2].split(',').map(field => field.trim());

          // Check if tableIdentifier contains a dot (subTable.table)
          const dotMatch = tableIdentifier.match(/^(\w+)\.(\w+)/);
          if (dotMatch) {
            result.subTable = dotMatch[1];
            result.table = dotMatch[2];
          } else {
            result.table = tableIdentifier;
          }
        } else {
          // Extract table and subTable: FIND public.users or FIND test.users or FIND users.user_id_idx
          const dotMatch = tablePart.match(/^(\w+)\.(\w+)/);
          if (dotMatch) {
            result.subTable = dotMatch[1];
            result.table = dotMatch[2];
          } else {
            // Extract just the table name, not everything after FIND
            const firstSpace = tablePart.indexOf(' ');
            result.table = firstSpace > 0 ? tablePart.substring(0, firstSpace) : tablePart;
          }
        }
      } else if (upperLine.includes('JOIN')) {
        // Parse JOIN clauses (handle both "JOIN" and "LEFT JOIN", "RIGHT JOIN", etc.)
        if (!result.joins) result.joins = [];
        result.joins.push(this.parseJoin(line));
      } else if (upperLine.startsWith('WHERE')) {
        currentSection = 'WHERE';
        whereBuffer = line.substring(5).trim();
      } else if (upperLine.startsWith('ORDER BY')) {
        // Process any buffered WHERE clause first
        if (whereBuffer) {
          result.where = this.parseWhere(whereBuffer);
          whereBuffer = '';
        }
        currentSection = 'ORDER_BY';
        const orderClause = line.substring(8).trim();
        result.orderBy = this.parseOrderBy(orderClause);
      } else if (upperLine.startsWith('LIMIT')) {
        // Process any buffered WHERE clause first
        if (whereBuffer) {
          result.where = this.parseWhere(whereBuffer);
          whereBuffer = '';
        }
        currentSection = 'LIMIT';
        const limitValue = line.substring(5).trim();
        result.limit = parseInt(limitValue, 10);
      } else if (upperLine.startsWith('OFFSET')) {
        const offsetValue = line.substring(6).trim();
        result.offset = parseInt(offsetValue, 10);
      } else if (upperLine.startsWith('FIELDS')) {
        const fieldsClause = line.substring(6).trim();
        result.fields = fieldsClause.split(',').map(field => field.trim());
      } else if (upperLine.startsWith('AGGREGATE')) {
        // Process any buffered WHERE clause first
        if (whereBuffer) {
          result.where = this.parseWhere(whereBuffer);
          whereBuffer = '';
        }
        currentSection = 'AGGREGATE';
        aggregateBuffer = line.substring(9).trim();
      } else if (upperLine.startsWith('GROUP BY')) {
        // Process any buffered aggregate clause first
        if (aggregateBuffer) {
          result.aggregate = this.parseAggregate(aggregateBuffer);
          aggregateBuffer = '';
        }
        currentSection = 'GROUP_BY';
        const groupClause = line.substring(8).trim();
        result.groupBy = groupClause.split(',').map(field => field.trim());
      } else if (upperLine.startsWith('HAVING')) {
        const havingClause = line.substring(6).trim();
        result.having = this.parseWhere(havingClause);
      } else if (currentSection === 'WHERE') {
        // Check if this line starts a new section
        if (upperLine.startsWith('ORDER BY') || upperLine.startsWith('LIMIT') ||
          upperLine.startsWith('AGGREGATE') || upperLine.startsWith('GROUP BY') ||
          upperLine.startsWith('HAVING')) {
          // Process buffered WHERE and start new section
          result.where = this.parseWhere(whereBuffer);
          whereBuffer = '';
          currentSection = '';

          // Re-process this line
          if (upperLine.startsWith('ORDER BY')) {
            currentSection = 'ORDER_BY';
            const orderClause = line.substring(8).trim();
            result.orderBy = this.parseOrderBy(orderClause);
          } else if (upperLine.startsWith('LIMIT')) {
            currentSection = 'LIMIT';
            const limitValue = line.substring(5).trim();
            result.limit = parseInt(limitValue, 10);
          } else if (upperLine.startsWith('AGGREGATE')) {
            currentSection = 'AGGREGATE';
            aggregateBuffer = line.substring(9).trim();
          } else if (upperLine.startsWith('GROUP BY')) {
            currentSection = 'GROUP_BY';
            const groupClause = line.substring(8).trim();
            result.groupBy = groupClause.split(',').map(field => field.trim());
          } else if (upperLine.startsWith('HAVING')) {
            const havingClause = line.substring(6).trim();
            result.having = this.parseWhere(havingClause);
          }
        } else {
          // Continue building WHERE buffer
          whereBuffer += ' ' + line;
        }
      } else if (currentSection === 'AGGREGATE') {
        // Continue building AGGREGATE buffer
        aggregateBuffer += ' ' + line;
      }
    }

    // Process any remaining buffers
    if (whereBuffer) {
      result.where = this.parseWhere(whereBuffer);
    }
    if (aggregateBuffer) {
      result.aggregate = this.parseAggregate(aggregateBuffer);
    }

    return QueryLanguageSchema.parse(result);
  }

  private static splitSingleLineQuery(queryString: string): string[] {
    // Split a single-line query into logical sections while preserving quoted strings
    const sections = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    // Keywords that start new sections
    const keywords = ['WHERE', 'ORDER BY', 'LIMIT', 'OFFSET', 'AGGREGATE', 'GROUP BY', 'HAVING', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN'];

    for (let i = 0; i < queryString.length; i++) {
      const char = queryString[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
        current += char;
      } else if (!inQuotes) {
        // Check if we're at the start of a keyword
        let foundKeyword = false;
        for (const keyword of keywords) {
          if (queryString.substring(i, i + keyword.length).toUpperCase() === keyword) {
            // Make sure it's a word boundary
            const prevChar = i > 0 ? queryString[i - 1] : ' ';
            const nextChar = i + keyword.length < queryString.length ? queryString[i + keyword.length] : ' ';
            if (/\s/.test(prevChar) && (/\s/.test(nextChar) || nextChar === ':')) {
              if (current.trim()) {
                sections.push(current.trim());
              }
              current = keyword;
              i += keyword.length - 1;
              foundKeyword = true;
              break;
            }
          }
        }
        if (!foundKeyword) {
          current += char;
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      sections.push(current.trim());
    }

    return sections;
  }

  private static parseWhere(whereClause: string) {
    const conditions = [];

    // Clean up the where clause - remove extra whitespace and normalize
    const cleanedClause = whereClause.replace(/\s+/g, ' ').trim();

    // Split by AND/OR while preserving the operators
    const parts = cleanedClause.split(/\s+(AND|OR)\s+/i);

    for (let i = 0; i < parts.length; i += 2) {
      const condition = parts[i].trim();
      const logical = i + 1 < parts.length ? parts[i + 1].toUpperCase() as 'AND' | 'OR' : undefined;

      // Parse individual condition - order operators by length (longest first) to match "NOT IN" before "IN"
      const operators = ['NOT IN', '>=', '<=', '!=', 'ILIKE', 'LIKE', 'IN', '=', '>', '<'];
      let operator = '';
      let field = '';
      let value: any = '';

      for (const op of operators) {
        if (condition.includes(` ${op} `)) {
          const [f, v] = condition.split(` ${op} `, 2);
          field = f.trim();
          operator = op;
          let rawValue = v.trim();

          // Check if value is quoted (string literal)
          const isQuoted = (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
            (rawValue.startsWith("'") && rawValue.endsWith("'"));

          if (isQuoted) {
            // Remove quotes for quoted strings
            value = rawValue.slice(1, -1);
          } else {
            // Try to convert to number if it's numeric
            if (!isNaN(Number(rawValue)) && rawValue !== '') {
              value = Number(rawValue);
            } else {
              // Treat unquoted non-numeric values as strings
              value = rawValue;
            }
          }
          break;
        }
      }

      if (field && operator) {
        conditions.push({
          field,
          operator: operator as any,
          value,
          logical: logical,
        });
      }
    }

    return conditions;
  }

  private static parseOrderBy(orderClause: string) {
    return orderClause.split(',').map(part => {
      const [field, direction] = part.trim().split(/\s+/);
      return {
        field: field.trim(),
        direction: (direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
      };
    });
  }

  private static parseAggregate(aggregateClause: string) {
    const aggregates = [];
    const parts = aggregateClause.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      // Handle "COUNT(id) AS total_orders" format
      // Handle "alias: FUNCTION(field)" format
      if (trimmed.includes(':')) {
        const [alias, aggPart] = trimmed.split(':').map(s => s.trim());
        const funcMatch = aggPart.match(/(\w+)\((.*?)\)/);
        if (funcMatch) {
          const field = funcMatch[2].trim();
          const func = funcMatch[1].toUpperCase();
          let finalAlias = alias;

          // Generate proper aliases for common cases
          if (!finalAlias) {
            if (field === '*' && func === 'COUNT') {
              finalAlias = 'count';
            } else {
              finalAlias = field;
            }
          }

          aggregates.push({
            function: func as any,
            field: field,
            alias: finalAlias
          });
        }
      }
      // Handle "COUNT(id) AS total_orders" format
      else {
        const funcMatch = trimmed.match(/(\w+)\(([^)]*)\)(?:\s+AS\s+(\w+))?/i);
        if (funcMatch) {
          const field = funcMatch[2].trim() || '*';
          const func = funcMatch[1].toUpperCase();
          let alias = funcMatch[3];

          // Generate proper aliases for common cases
          if (!alias) {
            if (field === '*' && func === 'COUNT') {
              alias = 'count';
            } else {
              alias = field;
            }
          }

          aggregates.push({
            function: func as any,
            field: field,
            alias: alias
          });
        }
      }
    }

    return aggregates;
  }

  private static parseJoin(joinClause: string) {
    // Parse JOIN syntax: "JOIN orders ON users.id = orders.user_id"
    // or "LEFT JOIN orders ON users.id = orders.user_id"
    const upperClause = joinClause.toUpperCase();
    let joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' = 'INNER';

    if (upperClause.includes('LEFT JOIN')) {
      joinType = 'LEFT';
    } else if (upperClause.includes('RIGHT JOIN')) {
      joinType = 'RIGHT';
    } else if (upperClause.includes('FULL JOIN') || upperClause.includes('FULL OUTER JOIN')) {
      joinType = 'FULL';
    }

    // Extract table name and ON condition - handle table aliases like "orders o"
    const joinMatch = joinClause.match(/(?:(?:INNER|LEFT|RIGHT|FULL(?:\s+OUTER)?)\s+)?JOIN\s+(\w+)(?:\s+(\w+))?\s+ON\s+([^=]+)\s*=\s*(.+)/i);

    if (!joinMatch) {
      throw new Error(`Invalid JOIN syntax: ${joinClause}`);
    }

    const [, table, alias, leftField, rightField] = joinMatch;

    return {
      type: joinType,
      table: table.trim(),
      alias: alias?.trim(),
      on: {
        left: leftField.trim(),
        right: rightField.trim(),
        operator: '=' as const
      }
    };
  }



  static validate(queryString: string): { valid: boolean; errors: string[] } {
    try {
      this.parse(queryString);
      return { valid: true, errors: [] };
    } catch (error) {
      return { valid: false, errors: [error instanceof Error ? error.message : 'Invalid query syntax'] };
    }
  }
}
