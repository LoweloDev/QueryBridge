import { QueryLanguage } from "./types";

/**
 * QuerySerializer - Converts parsed QueryLanguage objects back to UQL string format
 * 
 * This class provides the inverse functionality of QueryParser, allowing users to:
 * 1. Work with typed QueryLanguage objects programmatically
 * 2. Serialize those objects back to UQL string format when needed
 */
export class QuerySerializer {
    /**
     * Convert a parsed QueryLanguage object back to UQL string format
     */
    static serialize(query: QueryLanguage): string {
        const parts: string[] = [];

        // FIND clause with table and optional fields
        if (query.operation === 'FIND') {
            let findClause = 'FIND ';

            // Add subTable.table if subTable exists
            if (query.subTable) {
                findClause += `${query.subTable}.${query.table}`;
            } else {
                findClause += query.table;
            }

            // Add fields in parentheses if specified
            if (query.fields && query.fields.length > 0) {
                findClause += ` (${query.fields.join(', ')})`;
            }

            parts.push(findClause);
        }

        // JOIN clauses
        if (query.joins && query.joins.length > 0) {
            query.joins.forEach(join => {
                let joinClause = '';

                // Add join type (INNER is default, so omit it for cleaner output)
                if (join.type !== 'INNER') {
                    joinClause += `${join.type} `;
                }

                joinClause += 'JOIN ';
                joinClause += join.table;

                // Add alias if specified
                if (join.alias) {
                    joinClause += ` ${join.alias}`;
                }

                // Add ON condition
                joinClause += ` ON ${join.on.left} ${join.on.operator} ${join.on.right}`;

                parts.push(joinClause);
            });
        }

        // WHERE clause
        if (query.where && query.where.length > 0) {
            const conditions: string[] = [];

            query.where.forEach((condition, index) => {
                let conditionStr = `${condition.field} ${condition.operator} `;

                // Handle value formatting
                if (typeof condition.value === 'string') {
                    // Quote string values
                    conditionStr += `"${condition.value}"`;
                } else if (Array.isArray(condition.value)) {
                    // Handle IN/NOT IN arrays
                    const quotedValues = condition.value.map(v =>
                        typeof v === 'string' ? `"${v}"` : v
                    );
                    conditionStr += `(${quotedValues.join(', ')})`;
                } else {
                    // Numbers and other types
                    conditionStr += condition.value;
                }

                conditions.push(conditionStr);

                // Add logical operator if not the last condition and logical is specified
                if (index < query.where.length - 1 && condition.logical) {
                    conditions.push(condition.logical);
                }
            });

            parts.push(`WHERE ${conditions.join(' ')}`);
        }

        // GROUP BY clause
        if (query.groupBy && query.groupBy.length > 0) {
            parts.push(`GROUP BY ${query.groupBy.join(', ')}`);
        }

        // HAVING clause
        if (query.having && query.having.length > 0) {
            const havingConditions: string[] = [];

            query.having.forEach((condition, index) => {
                let conditionStr = `${condition.field} ${condition.operator} `;

                if (typeof condition.value === 'string') {
                    conditionStr += `"${condition.value}"`;
                } else if (Array.isArray(condition.value)) {
                    const quotedValues = condition.value.map(v =>
                        typeof v === 'string' ? `"${v}"` : v
                    );
                    conditionStr += `(${quotedValues.join(', ')})`;
                } else {
                    conditionStr += condition.value;
                }

                havingConditions.push(conditionStr);

                if (index < query.having.length - 1 && condition.logical) {
                    havingConditions.push(condition.logical);
                }
            });

            parts.push(`HAVING ${havingConditions.join(' ')}`);
        }

        // ORDER BY clause
        if (query.orderBy && query.orderBy.length > 0) {
            const orderFields = query.orderBy.map(order =>
                `${order.field} ${order.direction}`
            );
            parts.push(`ORDER BY ${orderFields.join(', ')}`);
        }

        // LIMIT clause
        if (query.limit) {
            parts.push(`LIMIT ${query.limit}`);
        }

        // OFFSET clause
        if (query.offset) {
            parts.push(`OFFSET ${query.offset}`);
        }

        return parts.join(' ');
    }

    /**
     * Validate that a QueryLanguage object can be serialized
     * Returns validation errors if any
     */
    static validate(query: QueryLanguage): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Basic validation
        if (!query.operation) {
            errors.push('Missing operation');
        }

        if (!query.table) {
            errors.push('Missing table name');
        }

        // Validate WHERE conditions
        if (query.where) {
            query.where.forEach((condition, index) => {
                if (!condition.field) {
                    errors.push(`WHERE condition ${index + 1}: Missing field`);
                }
                if (!condition.operator) {
                    errors.push(`WHERE condition ${index + 1}: Missing operator`);
                }
                if (condition.value === undefined || condition.value === null) {
                    errors.push(`WHERE condition ${index + 1}: Missing value`);
                }
            });
        }

        // Validate HAVING conditions
        if (query.having) {
            query.having.forEach((condition, index) => {
                if (!condition.field) {
                    errors.push(`HAVING condition ${index + 1}: Missing field`);
                }
                if (!condition.operator) {
                    errors.push(`HAVING condition ${index + 1}: Missing operator`);
                }
                if (condition.value === undefined || condition.value === null) {
                    errors.push(`HAVING condition ${index + 1}: Missing value`);
                }
            });
        }

        // Validate ORDER BY
        if (query.orderBy) {
            query.orderBy.forEach((order, index) => {
                if (!order.field) {
                    errors.push(`ORDER BY ${index + 1}: Missing field`);
                }
                if (!order.direction) {
                    errors.push(`ORDER BY ${index + 1}: Missing direction`);
                }
            });
        }

        // Validate JOINs
        if (query.joins) {
            query.joins.forEach((join, index) => {
                if (!join.table) {
                    errors.push(`JOIN ${index + 1}: Missing table`);
                }
                if (!join.on?.left || !join.on?.right || !join.on?.operator) {
                    errors.push(`JOIN ${index + 1}: Incomplete ON condition`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Pretty print a QueryLanguage object with indentation for readability
     */
    static prettyPrint(query: QueryLanguage, indent: string = '  '): string {
        const parts: string[] = [];

        // FIND clause
        if (query.operation === 'FIND') {
            let findClause = 'FIND ';

            if (query.subTable) {
                findClause += `${query.subTable}.${query.table}`;
            } else {
                findClause += query.table;
            }

            if (query.fields && query.fields.length > 0) {
                findClause += ` (${query.fields.join(', ')})`;
            }

            parts.push(findClause);
        }

        // JOIN clauses
        if (query.joins && query.joins.length > 0) {
            query.joins.forEach(join => {
                let joinClause = '';

                if (join.type !== 'INNER') {
                    joinClause += `${join.type} `;
                }

                joinClause += 'JOIN ';
                joinClause += join.table;

                if (join.alias) {
                    joinClause += ` ${join.alias}`;
                }

                joinClause += ` ON ${join.on.left} ${join.on.operator} ${join.on.right}`;

                parts.push(joinClause);
            });
        }

        // Multi-line WHERE clause for complex conditions
        if (query.where && query.where.length > 0) {
            parts.push('WHERE');

            query.where.forEach((condition, index) => {
                let conditionStr = `${indent}${condition.field} ${condition.operator} `;

                if (typeof condition.value === 'string') {
                    conditionStr += `"${condition.value}"`;
                } else if (Array.isArray(condition.value)) {
                    const quotedValues = condition.value.map(v =>
                        typeof v === 'string' ? `"${v}"` : v
                    );
                    conditionStr += `(${quotedValues.join(', ')})`;
                } else {
                    conditionStr += condition.value;
                }

                if (index < query.where.length - 1 && condition.logical) {
                    conditionStr += ` ${condition.logical}`;
                }

                parts.push(conditionStr);
            });
        }

        // Other clauses
        if (query.groupBy && query.groupBy.length > 0) {
            parts.push(`GROUP BY ${query.groupBy.join(', ')}`);
        }

        if (query.having && query.having.length > 0) {
            parts.push('HAVING');

            query.having.forEach((condition, index) => {
                let conditionStr = `${indent}${condition.field} ${condition.operator} `;

                if (typeof condition.value === 'string') {
                    conditionStr += `"${condition.value}"`;
                } else if (Array.isArray(condition.value)) {
                    const quotedValues = condition.value.map(v =>
                        typeof v === 'string' ? `"${v}"` : v
                    );
                    conditionStr += `(${quotedValues.join(', ')})`;
                } else {
                    conditionStr += condition.value;
                }

                if (index < query.having.length - 1 && condition.logical) {
                    conditionStr += ` ${condition.logical}`;
                }

                parts.push(conditionStr);
            });
        }

        if (query.orderBy && query.orderBy.length > 0) {
            const orderFields = query.orderBy.map(order =>
                `${order.field} ${order.direction}`
            );
            parts.push(`ORDER BY ${orderFields.join(', ')}`);
        }

        if (query.limit) {
            parts.push(`LIMIT ${query.limit}`);
        }

        if (query.offset) {
            parts.push(`OFFSET ${query.offset}`);
        }

        return parts.join('\n');
    }
}
