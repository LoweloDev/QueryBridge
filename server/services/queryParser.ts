import { QueryLanguage, QueryLanguageSchema } from "@shared/schema";

export class QueryParser {
  static parse(queryString: string): QueryLanguage {
    // Enhanced parser for the common query language with joins and database-specific features
    const lines = queryString.trim().split('\n').map(line => line.trim()).filter(line => line);
    
    const result: Partial<QueryLanguage> = {};
    let currentSection = '';
    let whereBuffer = '';
    let aggregateBuffer = '';
    
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      if (upperLine.startsWith('FIND ')) {
        result.operation = 'FIND';
        result.table = line.substring(5).trim();
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
      } else if (upperLine.startsWith('DB_SPECIFIC:')) {
        // Parse database-specific configurations
        currentSection = 'DB_SPECIFIC';
        const dbSpecificClause = line.substring(12).trim();
        if (dbSpecificClause) {
          result.dbSpecific = this.parseDbSpecific(dbSpecificClause);
        } else {
          // Initialize empty object for multi-line parsing
          result.dbSpecific = {};
        }
      } else if (currentSection === 'DB_SPECIFIC' && line.includes('=')) {
        // Continue parsing DB_SPECIFIC configurations on subsequent lines
        if (!result.dbSpecific) result.dbSpecific = {};
        const additionalConfig = this.parseDbSpecific(line);
        // Deep merge the configurations
        this.mergeDbSpecific(result.dbSpecific, additionalConfig);
      } else if (currentSection === 'WHERE') {
        // Continue building WHERE buffer
        whereBuffer += ' ' + line;
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
  
  private static parseWhere(whereClause: string) {
    const conditions = [];
    
    // Clean up the where clause - remove extra whitespace and normalize
    const cleanedClause = whereClause.replace(/\s+/g, ' ').trim();
    
    // Split by AND/OR while preserving the operators
    const parts = cleanedClause.split(/\s+(AND|OR)\s+/i);
    
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
    
    // Extract table name and ON condition
    const joinMatch = joinClause.match(/(?:(?:INNER|LEFT|RIGHT|FULL(?:\s+OUTER)?)\s+)?JOIN\s+(\w+)(?:\s+AS\s+(\w+))?\s+ON\s+([^=]+)\s*=\s*(.+)/i);
    
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
  
  private static parseDbSpecific(dbSpecificClause: string) {
    // Parse database-specific configurations
    // Example: "partition_key=TENANT#123, sort_key=USER#456, gsi_name=GSI1"
    // or individual lines like "partition_key=\"TENANT#123\""
    const dbSpecific: any = {};
    
    // Handle both comma-separated and individual key=value pairs
    const pairs = dbSpecificClause.includes(',') 
      ? dbSpecificClause.split(',')
      : [dbSpecificClause];
    
    for (const pair of pairs) {
      const trimmedPair = pair.trim();
      if (!trimmedPair.includes('=')) continue;
      
      const equalIndex = trimmedPair.indexOf('=');
      const key = trimmedPair.substring(0, equalIndex).trim();
      const value = trimmedPair.substring(equalIndex + 1).trim();
      
      if (key && value) {
        const cleanKey = key.trim();
        const cleanValue = value.replace(/^["']|["']$/g, ''); // Remove quotes
        
        // Handle DynamoDB patterns
        if (cleanKey.includes('partition_key') || cleanKey.includes('pk')) {
          // Support both legacy format and new structured format
          dbSpecific.partition_key = cleanValue; // Legacy format
          if (!dbSpecific.dynamodb) dbSpecific.dynamodb = {};
          if (!dbSpecific.dynamodb.keyCondition) dbSpecific.dynamodb.keyCondition = {};
          dbSpecific.dynamodb.keyCondition.pk = cleanValue;
          dbSpecific.dynamodb.partitionKey = 'PK';
        } else if (cleanKey.includes('sort_key_prefix') || cleanKey.includes('sk_prefix')) {
          // Handle sort key prefix for begins_with queries
          dbSpecific.sort_key_prefix = cleanValue;
        } else if (cleanKey.includes('sort_key') || cleanKey.includes('sk')) {
          // Support both legacy format and new structured format
          dbSpecific.sort_key = cleanValue; // Legacy format
          if (!dbSpecific.dynamodb) dbSpecific.dynamodb = {};
          if (!dbSpecific.dynamodb.keyCondition) dbSpecific.dynamodb.keyCondition = {};
          dbSpecific.dynamodb.keyCondition.sk = cleanValue;
          dbSpecific.dynamodb.sortKey = 'SK';
        } else if (cleanKey.includes('gsi_name') || cleanKey.includes('gsi')) {
          if (!dbSpecific.dynamodb) dbSpecific.dynamodb = {};
          dbSpecific.dynamodb.gsiName = cleanValue;
        }
        // Handle MongoDB patterns
        else if (cleanKey.includes('collection')) {
          if (!dbSpecific.mongodb) dbSpecific.mongodb = {};
          dbSpecific.mongodb.collection = cleanValue;
        }
        // Handle Elasticsearch patterns
        else if (cleanKey.includes('nested_path')) {
          if (!dbSpecific.elasticsearch) dbSpecific.elasticsearch = {};
          if (!dbSpecific.elasticsearch.nested) dbSpecific.elasticsearch.nested = { path: '', query: {} };
          dbSpecific.elasticsearch.nested.path = cleanValue;
        }
      }
    }
    
    return dbSpecific;
  }

  private static mergeDbSpecific(target: any, source: any) {
    Object.keys(source).forEach(dbType => {
      if (!target[dbType]) {
        target[dbType] = {};
      }
      
      if (source[dbType].keyCondition) {
        if (!target[dbType].keyCondition) {
          target[dbType].keyCondition = {};
        }
        Object.assign(target[dbType].keyCondition, source[dbType].keyCondition);
      }
      
      // Merge other properties
      Object.keys(source[dbType]).forEach(key => {
        if (key !== 'keyCondition') {
          target[dbType][key] = source[dbType][key];
        }
      });
    });
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
