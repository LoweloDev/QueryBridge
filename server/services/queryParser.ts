import { QueryLanguage, QueryLanguageSchema } from "@shared/schema";

export class QueryParser {
  static parse(queryString: string): QueryLanguage {
    // Simple parser for the common query language
    const lines = queryString.trim().split('\n').map(line => line.trim()).filter(line => line);
    
    const result: Partial<QueryLanguage> = {};
    let currentSection = '';
    
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      if (upperLine.startsWith('FIND ')) {
        result.operation = 'FIND';
        result.table = line.substring(5).trim();
      } else if (upperLine.startsWith('WHERE')) {
        currentSection = 'WHERE';
        const whereClause = line.substring(5).trim();
        if (whereClause) {
          result.where = this.parseWhere(whereClause);
        }
      } else if (upperLine.startsWith('ORDER BY')) {
        const orderClause = line.substring(8).trim();
        result.orderBy = this.parseOrderBy(orderClause);
      } else if (upperLine.startsWith('LIMIT')) {
        const limitValue = line.substring(5).trim();
        result.limit = parseInt(limitValue, 10);
      } else if (upperLine.startsWith('AGGREGATE')) {
        currentSection = 'AGGREGATE';
        const aggregateClause = line.substring(9).trim();
        if (aggregateClause) {
          result.aggregate = this.parseAggregate(aggregateClause);
        }
      } else if (upperLine.startsWith('GROUP BY')) {
        const groupClause = line.substring(8).trim();
        result.groupBy = groupClause.split(',').map(field => field.trim());
      } else if (currentSection === 'WHERE' && line.includes('=') || line.includes('>') || line.includes('<')) {
        // Continue parsing WHERE conditions
        if (!result.where) result.where = [];
        result.where.push(...this.parseWhere(line));
      } else if (currentSection === 'AGGREGATE' && (line.includes(':') || line.includes('('))) {
        // Continue parsing AGGREGATE functions
        if (!result.aggregate) result.aggregate = [];
        result.aggregate.push(...this.parseAggregate(line));
      }
    }
    
    return QueryLanguageSchema.parse(result);
  }
  
  private static parseWhere(whereClause: string) {
    const conditions = [];
    const parts = whereClause.split(/\s+(AND|OR)\s+/i);
    
    for (let i = 0; i < parts.length; i += 2) {
      const condition = parts[i].trim();
      const logical = i + 1 < parts.length ? parts[i + 1].toUpperCase() as 'AND' | 'OR' : undefined;
      
      // Parse individual condition
      const operators = ['>=', '<=', '!=', '=', '>', '<', 'IN', 'NOT IN', 'LIKE', 'ILIKE'];
      let operator = '';
      let field = '';
      let value: any = '';
      
      for (const op of operators) {
        if (condition.includes(` ${op} `)) {
          const [f, v] = condition.split(` ${op} `);
          field = f.trim();
          operator = op;
          value = v.trim().replace(/^["']|["']$/g, ''); // Remove quotes
          if (!isNaN(Number(value))) {
            value = Number(value);
          }
          break;
        }
      }
      
      if (field && operator) {
        conditions.push({
          field,
          operator: operator as any,
          value,
          logical: i + 1 < parts.length ? logical : undefined,
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
      if (trimmed.includes(':')) {
        const [alias, func] = trimmed.split(':');
        const funcMatch = func.trim().match(/(\w+)\(([^)]*)\)/);
        if (funcMatch) {
          aggregates.push({
            field: funcMatch[2] || '*',
            function: funcMatch[1].toUpperCase() as any,
            alias: alias.trim(),
          });
        }
      }
    }
    
    return aggregates;
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
