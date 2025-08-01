import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface DocumentationPanelProps {
  onClose: () => void;
}

export function DocumentationPanel({ onClose }: DocumentationPanelProps) {
  return (
    <aside className="w-96 bg-white border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary">Documentation</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Query Language Reference */}
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-primary mb-3 text-sm">Query Language Reference</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium text-foreground mb-1">Basic Syntax</div>
              <Card>
                <CardContent className="p-2 font-mono text-xs text-muted-foreground">
                  FIND table_name<br />
                  WHERE conditions<br />
                  ORDER BY field [ASC|DESC]<br />
                  LIMIT number
                </CardContent>
              </Card>
            </div>
            <div>
              <div className="font-medium text-foreground mb-1">Operators</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>=, !=, &lt;, &gt;, &lt;=, &gt;= - Comparison</div>
                <div>AND, OR, NOT - Logical</div>
                <div>IN, NOT IN - Membership</div>
                <div>LIKE, ILIKE - Pattern matching</div>
              </div>
            </div>
          </div>
        </div>

        {/* Database Support */}
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-primary mb-3 text-sm">Database Support</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <div className="connection-dot bg-success" />
              <span className="text-foreground">PostgreSQL, MySQL, SQLite</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="connection-dot bg-success" />
              <span className="text-foreground">MongoDB</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="connection-dot bg-success" />
              <span className="text-foreground">Elasticsearch</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="connection-dot bg-yellow-400" />
              <span className="text-foreground">DynamoDB (Beta)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="connection-dot bg-success" />
              <span className="text-foreground">Redis + RedisSearch + RedisGraph</span>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-primary mb-3 text-sm">Examples</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium text-foreground mb-1">Simple Filter</div>
              <Card>
                <CardContent className="p-2 font-mono text-xs text-muted-foreground">
                  FIND users WHERE age &gt; 18
                </CardContent>
              </Card>
            </div>
            <div>
              <div className="font-medium text-foreground mb-1">Complex Query</div>
              <Card>
                <CardContent className="p-2 font-mono text-xs text-muted-foreground">
                  FIND orders<br />
                  WHERE status = "completed"<br />
                  AND total &gt; 100<br />
                  ORDER BY created_at DESC
                </CardContent>
              </Card>
            </div>
            <div>
              <div className="font-medium text-foreground mb-1">Aggregation</div>
              <Card>
                <CardContent className="p-2 font-mono text-xs text-muted-foreground">
                  FIND sales<br />
                  AGGREGATE sum: SUM(amount)<br />
                  GROUP BY product_category
                </CardContent>
              </Card>
            </div>
            <div>
              <div className="font-medium text-foreground mb-1">Redis with Modules</div>
              <Card>
                <CardContent className="p-2 font-mono text-xs text-muted-foreground">
                  FIND users<br />
                  WHERE age &gt; 25<br />
                  AGGREGATE count: COUNT(*)<br />
                  GROUP BY status<br />
                  <span className="text-accent">→ Uses RedisSearch FT.AGGREGATE</span>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="p-4">
          <h3 className="font-medium text-primary mb-3 text-sm">API Endpoints</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Badge className="bg-secondary text-secondary-foreground text-xs font-mono">POST</Badge>
                <span className="font-mono text-xs">/api/query</span>
              </div>
              <div className="text-xs text-muted-foreground">Execute a query</div>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Badge className="bg-accent text-accent-foreground text-xs font-mono">GET</Badge>
                <span className="font-mono text-xs">/api/validate</span>
              </div>
              <div className="text-xs text-muted-foreground">Validate query syntax</div>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Badge className="bg-success text-success-foreground text-xs font-mono">GET</Badge>
                <span className="font-mono text-xs">/api/connections</span>
              </div>
              <div className="text-xs text-muted-foreground">List database connections</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
