import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Copy, Database } from "lucide-react";
import { useState } from "react";

interface DocumentationPanelProps {
  onClose: () => void;
}

export function DocumentationPanel({ onClose }: DocumentationPanelProps) {
  const [selectedExample, setSelectedExample] = useState<string>('basic');

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

  const examples = {
    basic: {
      title: "Basic Query",
      formats: {
        common: `FIND users
WHERE status = "active"
ORDER BY created_at DESC
LIMIT 10`,
        sql: `SELECT * FROM users 
WHERE status = 'active' 
ORDER BY created_at DESC 
LIMIT 10`,
        mongodb: `db.users.find(
  { status: "active" }
).sort({ created_at: -1 }).limit(10)`,
        elasticsearch: `{
  "query": { "term": { "status": "active" } },
  "sort": [{ "created_at": { "order": "desc" }}],
  "size": 10
}`,
        dynamodb: `{
  "TableName": "users",
  "FilterExpression": "#status = :status",
  "ExpressionAttributeNames": { "#status": "status" },
  "ExpressionAttributeValues": { ":status": "active" },
  "Limit": 10
}`
      }
    },
    joins: {
      title: "Table Joins",
      formats: {
        common: `FIND users
JOIN orders ON users.id = orders.user_id
WHERE users.status = "active"
FIELDS users.name, users.email, orders.total`,
        sql: `SELECT users.name, users.email, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE users.status = 'active'`,
        mongodb: `db.users.aggregate([
  { $match: { status: "active" } },
  { $lookup: {
      from: "orders",
      localField: "_id", 
      foreignField: "user_id",
      as: "orders"
    }},
  { $project: { name: 1, email: 1, "orders.total": 1 }}
])`,
        elasticsearch: `{
  "query": {
    "nested": {
      "path": "orders",
      "query": { "term": { "status": "active" }}
    }
  },
  "_source": ["name", "email", "orders.total"]
}`
      }
    },
    dynamodb_single_table: {
      title: "DynamoDB Single-Table Design",
      formats: {
        common_inline: `FIND tenant_data
DB_SPECIFIC: partition_key="TENANT#123", sort_key="USER#456"`,
        common_multiline: `FIND tenant_data
DB_SPECIFIC:
partition_key="TENANT#123"
sort_key="USER#456"`,
        dynamodb: `{
  "TableName": "tenant_data",
  "KeyConditionExpression": "#pk = :pk AND #sk = :sk",
  "ExpressionAttributeNames": { "#pk": "PK", "#sk": "SK" },
  "ExpressionAttributeValues": { 
    ":pk": "TENANT#123", 
    ":sk": "USER#456" 
  }
}`
      }
    },
    dynamodb_gsi: {
      title: "DynamoDB GSI Query",
      formats: {
        common: `FIND user_data
DB_SPECIFIC: partition_key="STATUS#active", gsi_name="GSI1"`,
        dynamodb: `{
  "TableName": "user_data",
  "IndexName": "GSI1",
  "KeyConditionExpression": "#pk = :pk",
  "ExpressionAttributeNames": { "#pk": "PK" },
  "ExpressionAttributeValues": { ":pk": "STATUS#active" }
}`
      }
    },
    aggregation: {
      title: "Aggregation & Grouping",
      formats: {
        common: `FIND users
AGGREGATE total_count:COUNT(*), avg_age:AVG(age)
GROUP BY status
HAVING COUNT(*) > 100`,
        sql: `SELECT status, COUNT(*) as total_count, AVG(age) as avg_age
FROM users
GROUP BY status
HAVING COUNT(*) > 100`,
        mongodb: `db.users.aggregate([
  { $group: {
      _id: { status: "$status" },
      total_count: { $sum: 1 },
      avg_age: { $avg: "$age" }
    }},
  { $match: { total_count: { $gt: 100 }}}
])`,
        elasticsearch: `{
  "aggs": {
    "group_by_status": {
      "terms": { "field": "status" },
      "aggs": {
        "avg_age": { "avg": { "field": "age" }},
        "bucket_selector": {
          "buckets_path": { "count": "_count" },
          "script": "params.count > 100"
        }
      }
    }
  }
}`
      }
    },
    redis_search: {
      title: "Redis Full-Text Search",
      formats: {
        common: `FIND products
WHERE category = "electronics" AND price < 500
ORDER BY price ASC`,
        redis_basic: `HGETALL product:123`,
        redis_search: `FT.SEARCH products "@category:electronics @price:[0 500]" SORTBY price ASC`,
        redis_aggregate: `FT.AGGREGATE products "*" 
GROUPBY 1 @category 
REDUCE COUNT 0 AS count 
REDUCE AVG 1 @price AS avg_price`
      }
    }
  };

  return (
    <aside className="w-96 bg-white dark:bg-gray-900 border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary">Documentation</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Quick Reference */}
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-primary mb-3 text-sm">Query Language Reference</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div><code className="text-foreground">FIND table_name</code> - Select data</div>
            <div><code className="text-foreground">WHERE conditions</code> - Filter records</div>
            <div><code className="text-foreground">JOIN table ON condition</code> - Join tables</div>
            <div><code className="text-foreground">ORDER BY field [ASC|DESC]</code> - Sort results</div>
            <div><code className="text-foreground">LIMIT number</code> - Limit results</div>
            <div><code className="text-foreground">AGGREGATE func:alias</code> - Aggregate data</div>
            <div><code className="text-foreground">GROUP BY field</code> - Group results</div>
            <div><code className="text-foreground">DB_SPECIFIC: config</code> - Database-specific options</div>
          </div>
        </div>

        {/* Interactive Examples */}
        <div className="p-4">
          <h3 className="font-medium text-primary mb-3 text-sm">Interactive Examples</h3>
          
          <div className="space-y-1 mb-4">
            {Object.entries(examples).map(([key, example]) => (
              <Button
                key={key}
                size="sm"
                variant={selectedExample === key ? "default" : "outline"}
                className="w-full justify-start text-xs"
                onClick={() => setSelectedExample(key)}
              >
                <Database size={12} className="mr-2" />
                {example.title}
              </Button>
            ))}
          </div>

          {/* Format Tabs */}
          <Tabs defaultValue="common" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="common" className="text-xs">Common Query</TabsTrigger>
              <TabsTrigger value="native" className="text-xs">Native Format</TabsTrigger>
            </TabsList>

            <TabsContent value="common">
              {selectedExample && examples[selectedExample as keyof typeof examples] && (
                <div className="space-y-3">
                  {Object.entries(examples[selectedExample as keyof typeof examples].formats)
                    .filter(([key]) => key.startsWith('common'))
                    .map(([formatKey, query]) => (
                      <ExampleCard
                        key={formatKey}
                        title={formatKey.includes('multiline') ? 'Multi-line Format' : 'Single-line Format'}
                        onCopy={() => copyToClipboard(query)}
                      >
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                          {query}
                        </pre>
                      </ExampleCard>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="native">
              {selectedExample && examples[selectedExample as keyof typeof examples] && (
                <div className="space-y-3">
                  {Object.entries(examples[selectedExample as keyof typeof examples].formats)
                    .filter(([key]) => !key.startsWith('common'))
                    .map(([formatKey, query]) => (
                      <ExampleCard
                        key={formatKey}
                        title={formatKey.toUpperCase()}
                        onCopy={() => copyToClipboard(query)}
                      >
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                          {query}
                        </pre>
                      </ExampleCard>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Database Support Status */}
        <div className="p-4">
          <h3 className="font-medium text-primary mb-3 text-sm">Database Support</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-foreground">SQL (PostgreSQL, MySQL, SQLite)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-foreground">MongoDB + Aggregation Pipeline</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-foreground">Elasticsearch + Nested Queries</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-foreground">DynamoDB + Single-Table Design</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-foreground">Redis + RedisSearch + RedisGraph</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
