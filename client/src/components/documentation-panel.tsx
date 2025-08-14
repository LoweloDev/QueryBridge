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
      description: "Primary target with full translation implemented.",
      features: {
        basicQueries: true,
        whereConditions: true,
        joins: true,
        aggregations: true,
        groupBy: true,
        orderBy: true,
        limit: true,
        fullTextSearch: false,
        transactions: false,
        indexOptimization: false
      },
      examples: {
        basic: {
          universal: `FIND users
WHERE status = "active"
ORDER BY created_at DESC
LIMIT 5`,
          native: `-- SQL Translation
SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC LIMIT 5;`
        },
        fields: {
          universal: `FIND public.users (name, email)`,
          native: `-- SQL Translation
SELECT name, email FROM public.users;`
        },
        groupBy: {
          universal: `FIND orders
FIELDS customer_id, COUNT(id) AS total_orders, SUM(amount) AS total_amount
GROUP BY customer_id`,
          native: `-- SQL Translation
SELECT customer_id, COUNT(id) AS total_orders, SUM(amount) AS total_amount FROM orders GROUP BY customer_id;`
        }
      }
    },
    mongodb: {
      name: "MongoDB",
      icon: "🍃",
      description: "Translation planned. Use the universal syntax; output will be a placeholder.",
      features: {
        basicQueries: true,
        whereConditions: true,
        joins: false,
        aggregations: true,
        groupBy: true,
        orderBy: true,
        limit: true,
        fullTextSearch: true,
        transactions: false,
        indexOptimization: false
      },
      examples: {
        basic: {
          universal: `FIND users
WHERE status = "active"
ORDER BY created_at DESC
LIMIT 5`,
          native: `-- MongoDB Translation
-- Support will be implemented separately`
        }
      }
    },
    elasticsearch: {
      name: "Elasticsearch",
      icon: "🔍",
      description: "Translation planned. Use universal syntax; output will be a placeholder.",
      features: {
        basicQueries: true,
        whereConditions: true,
        joins: false,
        aggregations: true,
        groupBy: true,
        orderBy: true,
        limit: true,
        fullTextSearch: true,
        transactions: false,
        indexOptimization: false
      },
      examples: {
        basic: {
          universal: `FIND products
WHERE active = true
ORDER BY created_at DESC
LIMIT 5`,
          native: `-- Elasticsearch Translation
-- Support will be implemented separately`
        }
      }
    },
    dynamodb: {
      name: "DynamoDB",
      icon: "⚡",
      description: "Translation planned. Use universal syntax; output will be a placeholder.",
      features: {
        basicQueries: true,
        whereConditions: true,
        joins: false,
        aggregations: false,
        groupBy: false,
        orderBy: true,
        limit: true,
        fullTextSearch: false,
        transactions: false,
        indexOptimization: false
      },
      examples: {
        basic: {
          universal: `FIND users
WHERE status = "active"
LIMIT 5`,
          native: `-- DynamoDB Translation
-- Support will be implemented separately`
        },
        databaseConcepts: {
          universal: `FIND public.users
FIND test.users
FIND logs.2024
FIND users.user_id_idx`,
          native: `-- Concept mapping only; translation planned`
        }
      }
    },
    redis: {
      name: "Redis",
      icon: "🔴",
      description: "Translation planned. Use universal syntax; output will be a placeholder.",
      features: {
        basicQueries: true,
        whereConditions: true,
        joins: false,
        aggregations: true,
        groupBy: true,
        orderBy: true,
        limit: true,
        fullTextSearch: true,
        transactions: false,
        indexOptimization: false
      },
      examples: {
        basic: {
          universal: `FIND users
WHERE status = "active"
LIMIT 5`,
          native: `-- Redis Translation
-- Support will be implemented separately`
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
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${selectedDatabase === dbKey
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