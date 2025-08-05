import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Copy, Book, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface DocumentationPanelProps {
  onClose: () => void;
}

export function DocumentationPanel({ onClose }: DocumentationPanelProps) {
  const [selectedDatabase, setSelectedDatabase] = useState<string>('sql');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const ExampleCard = ({ title, children, onCopy }: { title: string; children: React.ReactNode; onCopy?: () => void }) => (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-sm text-foreground">{title}</div>
          {onCopy && (
            <Button size="sm" variant="ghost" onClick={onCopy} className="h-6 w-6 p-0">
              <Copy size={12} />
            </Button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );

  const FeatureBadge = ({ supported }: { supported: boolean }) => (
    <Badge variant={supported ? "default" : "secondary"} className={`text-xs ${supported ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
      {supported ? "✓ Supported" : "✗ Not Available"}
    </Badge>
  );

  // Database-specific feature support and examples
  const databaseFeatures = {
    sql: {
      name: "SQL (PostgreSQL)",
      icon: "🐘",
      description: "Full relational database with comprehensive query support",
      features: {
        basicQueries: true,
        whereConditions: true,
        joins: true,
        aggregations: true,
        groupBy: true,
        orderBy: true,
        limit: true,
        fullTextSearch: true,
        transactions: true,
        indexOptimization: true
      },
      examples: {
        basic: {
          universal: `FIND users
WHERE status = "active"
ORDER BY created_at DESC
LIMIT 5`,
          native: `-- PostgreSQL Translation
SELECT * FROM users 
WHERE status = 'active' 
ORDER BY created_at DESC 
LIMIT 5;`
        },
        joins: {
          universal: `FIND users
JOIN orders ON users.id = orders.user_id
WHERE users.status = "active"
FIELDS users.name, users.email, orders.amount
ORDER BY orders.amount DESC`,
          native: `-- PostgreSQL Translation
SELECT u.name, u.email, o.amount 
FROM users u
JOIN orders o ON u.id = o.user_id 
WHERE u.status = 'active' 
ORDER BY o.amount DESC;`
        },
        aggregations: {
          universal: `FIND products
WHERE active = true
GROUP BY category
AGGREGATE COUNT(*) as product_count, AVG(price) as avg_price, SUM(stock) as total_stock
HAVING product_count > 5
ORDER BY avg_price DESC`,
          native: `-- PostgreSQL Translation
SELECT 
  category,
  COUNT(*) as product_count,
  AVG(price) as avg_price,
  SUM(stock) as total_stock
FROM products 
WHERE active = true
GROUP BY category
HAVING COUNT(*) > 5
ORDER BY avg_price DESC;`
        },
        fullText: {
          universal: `FIND products
WHERE name LIKE "%laptop%" AND description LIKE "%gaming%"`,
          native: `-- PostgreSQL Translation  
SELECT * FROM products 
WHERE name ILIKE '%laptop%' 
  AND description @@ to_tsquery('gaming');`
        }
      }
    },
    mongodb: {
      name: "MongoDB",
      icon: "🍃",
      description: "Document database with powerful aggregation pipelines",
      features: {
        basicQueries: true,
        whereConditions: true,
        joins: true,
        aggregations: true,
        groupBy: true,
        orderBy: true,
        limit: true,
        fullTextSearch: true,
        transactions: true,
        indexOptimization: true
      },
      examples: {
        basic: {
          universal: `FIND users
WHERE status = "active"
ORDER BY created_at DESC
LIMIT 5`,
          native: `// MongoDB Translation
db.users.find(
  { "status": "active" }
).sort({ "created_at": -1 }).limit(5)`
        },
        joins: {
          universal: `FIND users
JOIN orders ON users.id = orders.user_id
WHERE users.status = "active"
FIELDS users.name, users.email, orders.amount
ORDER BY orders.amount DESC`,
          native: `// MongoDB Translation
db.users.aggregate([
  { $match: { "status": "active" } },
  { $lookup: {
      from: "orders",
      localField: "id", 
      foreignField: "user_id",
      as: "orders"
    }},
  { $unwind: "$orders" },
  { $project: { "name": 1, "email": 1, "amount": "$orders.amount" } },
  { $sort: { "amount": -1 } }
])`
        },
        aggregations: {
          universal: `FIND products
WHERE active = true
GROUP BY category
AGGREGATE COUNT(*) as product_count, AVG(price) as avg_price, SUM(stock) as total_stock
HAVING product_count > 5
ORDER BY avg_price DESC`,
          native: `// MongoDB Translation
db.products.aggregate([
  { $match: { "active": true } },
  { $group: {
      _id: "$category",
      product_count: { $sum: 1 },
      avg_price: { $avg: "$price" },
      total_stock: { $sum: "$stock" }
    }},
  { $match: { product_count: { $gt: 5 } } },
  { $sort: { avg_price: -1 } }
])`
        },
        fullText: {
          universal: `FIND products
WHERE name LIKE "%laptop%" AND description LIKE "%gaming%"
WHERE active = true`,
          native: `// MongoDB Translation
db.products.find({
  $text: { $search: "laptop gaming" },
  "active": true
}).sort({ score: { $meta: "textScore" } })`
        }
      }
    },
    elasticsearch: {
      name: "Elasticsearch",
      icon: "🔍",
      description: "Search engine with advanced text analysis and aggregations",
      features: {
        basicQueries: true,
        whereConditions: true,
        joins: false, // Parent-child relationships only
        aggregations: true,
        groupBy: true,
        orderBy: true,
        limit: true,
        fullTextSearch: true,
        transactions: false,
        indexOptimization: true
      },
      examples: {
        basic: {
          universal: `FIND users
WHERE status = "active"
ORDER BY created_at DESC
LIMIT 5`,
          native: `// Elasticsearch Translation
{
  "query": { "term": { "status": "active" } },
  "sort": [{ "created_at": { "order": "desc" } }],
  "size": 5
}`
        },
        aggregations: {
          universal: `FIND products
WHERE active = true
GROUP BY category
AGGREGATE COUNT(*) as product_count, AVG(price) as avg_price, SUM(stock) as total_stock`,
          native: `// Elasticsearch Translation
{
  "query": { "term": { "active": true } },
  "aggs": {
    "by_category": {
      "terms": { "field": "category" },
      "aggs": {
        "product_count": { "value_count": { "field": "_id" } },
        "avg_price": { "avg": { "field": "price" } },
        "total_stock": { "sum": { "field": "stock" } }
      }
    }
  },
  "size": 0
}`
        },
        fullText: {
          universal: `FIND products
WHERE name LIKE "%laptop%" AND description LIKE "%gaming%"
WHERE active = true`,
          native: `// Elasticsearch Translation
{
  "query": {
    "bool": {
      "must": [
        { "match": { "name": "laptop" } },
        { "match": { "description": "gaming" } }
      ],
      "filter": [
        { "term": { "active": true } }
      ]
    }
  },
  "highlight": {
    "fields": { "name": {}, "description": {} }
  }
}`
        }
      }
    },
    dynamodb: {
      name: "DynamoDB",
      icon: "⚡",
      description: "NoSQL database optimized for high performance and scalability",
      features: {
        basicQueries: true,
        whereConditions: true,
        joins: false, // No native joins
        aggregations: false, // No native aggregations - WILL THROW ERROR
        groupBy: false, // No native GROUP BY - WILL THROW ERROR
        orderBy: true, // Via sort key only
        limit: true,
        fullTextSearch: false, // Basic contains() only
        transactions: true,
        indexOptimization: true
      },
      examples: {
        basic: {
          universal: `FIND users
WHERE id = 1`,
          native: `// DynamoDB Translation (Query)
{
  "TableName": "users",
  "KeyConditionExpression": "id = :id",
  "ExpressionAttributeValues": { ":id": 1 }
}`
        },
        scan: {
          universal: `FIND users
WHERE status = "active"
LIMIT 5`,
          native: `// DynamoDB Translation (Scan)
{
  "TableName": "users", 
  "FilterExpression": "#status = :status",
  "ExpressionAttributeNames": { "#status": "status" },
  "ExpressionAttributeValues": { ":status": "active" },
  "Limit": 5
}`
        },
        gsi: {
          universal: `FIND orders
WHERE status = "completed"
ORDER BY created_at DESC`,
          native: `// DynamoDB Translation (GSI Query)
{
  "TableName": "orders",
  "IndexName": "StatusIndex",
  "KeyConditionExpression": "#status = :status",
  "ExpressionAttributeNames": { "#status": "status" },
  "ExpressionAttributeValues": { ":status": "completed" },
  "ScanIndexForward": false
}`
        },
        singleTableDefault: {
          universal: `// Single Table Design - Default PK/SK (fallback)
// No configuration needed - uses default PK/SK when schema not configured
FIND users
DB_SPECIFIC: partition_key="USER#123", sort_key="PROFILE"`,
          native: `// DynamoDB Translation (Default Keys)
{
  "TableName": "users",
  "KeyConditionExpression": "#pk = :pk AND #sk = :sk",
  "ExpressionAttributeNames": {
    "#pk": "PK",
    "#sk": "SK"
  },
  "ExpressionAttributeValues": {
    ":pk": "USER#123",
    ":sk": "PROFILE"
  }
}`
        },
        singleTableConfigured: {
          universal: `// Single Table Design - Custom Key Names
// Connection registered with: { partitionKey: "userId", sortKey: "timestamp" }

FIND orders
DB_SPECIFIC: partition_key="CUSTOMER#456", sort_key="ORDER#789"`,
          native: `// DynamoDB Translation (Custom Key Names)
{
  "TableName": "orders",
  "KeyConditionExpression": "#pk = :pk AND #sk = :sk",
  "ExpressionAttributeNames": {
    "#pk": "userId",
    "#sk": "timestamp"
  },
  "ExpressionAttributeValues": {
    ":pk": "CUSTOMER#456",
    ":sk": "ORDER#789"
  }
}`
        },
        inlineAttributes: {
          universal: `// Single Table Design - Inline Attribute Override
// Overrides connection config with inline attribute names

FIND entities
DB_SPECIFIC: partition_key="ENTITY#123", sort_key="META#456", partition_key_attribute="entity_id", sort_key_attribute="entity_type"`,
          native: `// DynamoDB Translation (Inline Attributes)
{
  "TableName": "entities",
  "KeyConditionExpression": "#pk = :pk AND #sk = :sk",
  "ExpressionAttributeNames": {
    "#pk": "entity_id",
    "#sk": "entity_type"
  },
  "ExpressionAttributeValues": {
    ":pk": "ENTITY#123",
    ":sk": "META#456"
  }
}`
        },
        singleTablePrefix: {
          universal: `// Single Table Design - Sort Key Prefix
FIND items
DB_SPECIFIC: partition_key="STORE#789", sort_key_prefix="PRODUCT#"`,
          native: `// DynamoDB Translation (Sort Key Prefix)
{
  "TableName": "items",
  "KeyConditionExpression": "#pk = :pk AND begins_with(#sk, :sk_prefix)",
  "ExpressionAttributeNames": {
    "#pk": "PK",
    "#sk": "SK"
  },
  "ExpressionAttributeValues": {
    ":pk": "STORE#789",
    ":sk_prefix": "PRODUCT#"
  }
}`
        },
        connectionConfig: {
          universal: `// Connection Registration Example
import { QueryTranslator } from 'universal-query-translator';

// Register DynamoDB with custom schema
QueryTranslator.registerConnection('my-dynamodb', dynamoClient, {
  partitionKey: 'entity_id',
  sortKey: 'entity_type',
  globalSecondaryIndexes: [
    { 
      name: 'StatusIndex', 
      partitionKey: 'status', 
      sortKey: 'created_at' 
    }
  ]
});`,
          native: `// Usage with Registered Configuration
const result = QueryTranslator.translate(
  'FIND entities DB_SPECIFIC: partition_key="USER#123"',
  'my-dynamodb'
);

// Produces query using 'entity_id' instead of 'PK'`
        },
        limitations: {
          universal: `// ❌ THESE WILL THROW ERRORS:

FIND products 
AGGREGATE COUNT(*) as total, AVG(price) as avg_price

FIND sales
GROUP BY category
AGGREGATE COUNT(*) as count`,
          native: `// DynamoDB Error Response
{
  "error": "DynamoDB does not support native aggregations (COUNT, SUM, AVG, etc.). Consider using application-level processing or switch to a different database type."
}`
        }
      }
    },
    redis: {
      name: "Redis",
      icon: "🔴",
      description: "In-memory data store with optional RediSearch modules",
      features: {
        basicQueries: true,
        whereConditions: true, // With RediSearch
        joins: false, // Manual key relationships only
        aggregations: true, // With RediSearch FT.AGGREGATE
        groupBy: true, // With RediSearch
        orderBy: true, // With RediSearch or sorted sets
        limit: true,
        fullTextSearch: true, // With RediSearch
        transactions: true, // Via Lua scripts
        indexOptimization: true // Via RediSearch indexes
      },
      examples: {
        basic: {
          universal: `FIND users
WHERE status = "active"
ORDER BY created_at DESC
LIMIT 5`,
          native: `// Redis Translation (RediSearch)
FT.SEARCH users_idx "@status:{active}" SORTBY created_at DESC LIMIT 0 5

// Or Hash Operations
HGETALL user:1
HMGET user:1 name email status`
        },
        search: {
          universal: `FIND products
WHERE price > 100 AND price < 500
WHERE category = "Electronics"`,
          native: `// Redis Translation (RediSearch)
FT.SEARCH products_idx "@price:[100 500] @category:{Electronics}"

// Range Queries
FT.SEARCH products_idx "@price:[100 500]"`
        },
        aggregations: {
          universal: `FIND orders
GROUP BY category
AGGREGATE COUNT(*) as product_count, AVG(price) as avg_price
ORDER BY avg_price DESC`,
          native: `// Redis Translation (RediSearch Aggregations)
FT.AGGREGATE orders_idx "*" 
  GROUPBY 1 @category 
  REDUCE COUNT 0 AS product_count
  REDUCE AVG 1 @price AS avg_price
  SORTBY 2 @avg_price DESC`
        },
        sortedSets: {
          universal: `FIND user_scores
WHERE score > 1000
ORDER BY score DESC
LIMIT 10`,
          native: `// Redis Translation (Sorted Sets)
ZREVRANGEBYSCORE user_scores +inf 1000 LIMIT 0 10

// Range by score
ZRANGEBYSCORE orders:by_amount 100 500`
        }
      }
    }
  };

  const currentDb = databaseFeatures[selectedDatabase as keyof typeof databaseFeatures];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Book className="text-accent" size={20} />
            <h2 className="text-lg font-semibold text-foreground">Universal Query Language Documentation</h2>
            <Badge variant="outline" className="text-xs">v1.0.0</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Database Selection Tabs */}
          <div className="flex-shrink-0 bg-background border-b border-border p-4">
            <div className="grid grid-cols-5 gap-2 mb-4">
              {Object.entries(databaseFeatures).map(([dbKey, db]) => (
                <button
                  key={dbKey}
                  onClick={() => setSelectedDatabase(dbKey)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    selectedDatabase === dbKey 
                      ? 'bg-accent text-accent-foreground border-accent' 
                      : 'bg-background hover:bg-muted border-border'
                  }`}
                >
                  <div className="text-lg mb-1">{db.icon}</div>
                  <div className="text-xs">{db.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Database-Specific Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2 flex items-center">
                <span className="text-2xl mr-3">{currentDb.icon}</span>
                {currentDb.name}
              </h2>
              <p className="text-muted-foreground mb-4">{currentDb.description}</p>
              
              {/* Feature Support Matrix */}
              <div className="bg-muted/30 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-3 flex items-center">
                  <CheckCircle2 className="mr-2 text-green-600" size={16} />
                  Feature Support
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Basic Queries</span>
                    <FeatureBadge supported={currentDb.features.basicQueries} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>WHERE Conditions</span>
                    <FeatureBadge supported={currentDb.features.whereConditions} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>JOIN Operations</span>
                    <FeatureBadge supported={currentDb.features.joins} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Aggregations</span>
                    <FeatureBadge supported={currentDb.features.aggregations} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>GROUP BY</span>
                    <FeatureBadge supported={currentDb.features.groupBy} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ORDER BY</span>
                    <FeatureBadge supported={currentDb.features.orderBy} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>LIMIT</span>
                    <FeatureBadge supported={currentDb.features.limit} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Full-Text Search</span>
                    <FeatureBadge supported={currentDb.features.fullTextSearch} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Transactions</span>
                    <FeatureBadge supported={currentDb.features.transactions} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Index Optimization</span>
                    <FeatureBadge supported={currentDb.features.indexOptimization} />
                  </div>
                </div>
              </div>

              {/* Code Examples */}
              <div className="space-y-4">
                {Object.entries(currentDb.examples).map(([exampleKey, example]) => (
                  <ExampleCard 
                    key={exampleKey}
                    title={exampleKey.charAt(0).toUpperCase() + exampleKey.slice(1).replace(/([A-Z])/g, ' $1')}
                    onCopy={() => copyToClipboard(example.universal + '\n\n' + example.native)}
                  >
                    <div className="space-y-3">
                      {/* Universal Query */}
                      <div>
                        <div className="text-xs font-medium text-foreground mb-1 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Universal Query Language
                        </div>
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap bg-blue-50 dark:bg-blue-950/30 p-3 rounded border border-blue-200 dark:border-blue-800">
                          <code className="text-blue-800 dark:text-blue-200">{example.universal}</code>
                        </pre>
                      </div>
                      
                      {/* Native Translation */}
                      <div>
                        <div className="text-xs font-medium text-foreground mb-1 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          {currentDb.name} Translation
                        </div>
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap bg-green-50 dark:bg-green-950/30 p-3 rounded border border-green-200 dark:border-green-800">
                          <code className="text-green-800 dark:text-green-200">{example.native}</code>
                        </pre>
                      </div>
                    </div>
                  </ExampleCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}