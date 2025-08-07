declare module '@synatic/noql' {
    interface MongoQueryResult {
        type: 'query' | 'aggregate';
        collection?: string;
        collections?: string[];
        query?: any;
        projection?: any;
        limit?: number;
        pipeline?: any[];
    }

    interface SQLParser {
        /**
         * Parse SQL query string and return MongoDB query object
         */
        parseSQL(sql: string): MongoQueryResult;
    }

    const SQLParser: SQLParser;
    export default SQLParser;
}
