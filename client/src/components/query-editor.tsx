import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Copy, ExternalLink, Wand2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface QueryEditorProps {
  onQueryExecuted: (results: any, stats: any) => void;
  onQueryHistoryAdd: (query: string, database: string, results?: any, executionTime?: string) => void;
}

export function QueryEditor({ onQueryExecuted, onQueryHistoryAdd }: QueryEditorProps) {
  const [activeTab, setActiveTab] = useState("sql");
  const [query, setQuery] = useState(`FIND users
JOIN orders ON users.id = orders.user_id
WHERE 
  users.age > 25 AND
  orders.status = "completed"
ORDER BY orders.created_at DESC
LIMIT 10`);

  const [translatedQuery, setTranslatedQuery] = useState("");
  const [selectedConnection, setSelectedConnection] = useState("");
  const [showExecutionPlan, setShowExecutionPlan] = useState(false);
  const [showTiming, setShowTiming] = useState(false);

  const { toast } = useToast();

  const { data: connections } = useQuery({
    queryKey: ["/api/connections"],
    queryFn: api.getConnections,
  });

  const translateMutation = useMutation({
    mutationFn: ({ query, targetType }: { query: string; targetType: string }) =>
      api.translateQuery(query, targetType),
    onSuccess: (data) => {
      setTranslatedQuery(
        typeof data.translatedQuery === 'string'
          ? data.translatedQuery
          : JSON.stringify(data.translatedQuery, null, 2)
      );
    },
    onError: (error: any) => {
      toast({
        title: "Translation failed",
        description: error.message || "Could not translate query",
        variant: "destructive",
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: ({ query, connectionId, targetType }: any) =>
      api.executeQuery(query, connectionId, targetType),
    onSuccess: (data) => {
      onQueryExecuted(data.results, {
        executionTime: data.executionTime,
        rowCount: data.rowCount,
        translatedQuery: data.translatedQuery,
      });

      // Add to history
      onQueryHistoryAdd(query, activeTab, data.results, data.executionTime);

      toast({
        title: "Query executed successfully",
        description: `${data.rowCount} rows returned in ${data.executionTime}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Query execution failed",
        description: error.message || "Could not execute query",
        variant: "destructive",
      });
    },
  });

  const validateMutation = useMutation({
    mutationFn: (query: string) => api.validateQuery(query),
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: "Query is valid",
          description: "The query syntax is correct",
        });
      } else {
        toast({
          title: "Query validation failed",
          description: data.errors.join(", "),
          variant: "destructive",
        });
      }
    },
  });

  // Auto-select connection based on active tab
  useEffect(() => {
    if (!connections) return; // Add null check

    console.log('Active tab:', activeTab);
    console.log('Available connections:', connections);

    const matchingConnection = connections.find((conn: any) => {
      const connType = conn.type.toLowerCase();
      console.log('Checking connection:', conn.name, 'type:', connType, 'against activeTab:', activeTab);
      if (activeTab === 'sql') return connType === 'postgresql';
      return connType === activeTab;
    });

    console.log('Selected connection:', matchingConnection);

    // Force selection when tab changes, even if a connection is already selected
    if (matchingConnection) {
      setSelectedConnection(matchingConnection.id);
    }
  }, [activeTab, connections]);

  useEffect(() => {
    if (query.trim()) {
      translateMutation.mutate({ query, targetType: activeTab });
    }
  }, [query, activeTab]);

  const handleExecuteQuery = () => {
    if (!selectedConnection) {
      toast({
        title: "No connection selected",
        description: "Please select a database connection first.",
        variant: "destructive",
      });
      return;
    }

    executeMutation.mutate({ query, connectionId: selectedConnection, targetType: activeTab });
  };

  const formatGeneratedQuery = (query: string) => {
    if (activeTab === "sql") {
      return query;
    }

    try {
      const parsed = JSON.parse(query);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return query;
    }
  };

  const getTabIcon = (type: string) => {
    const icons: Record<string, string> = {
      sql: "🗄️",
      mongodb: "🍃",
      elasticsearch: "🔍",
      dynamodb: "⚡",
      redis: "🔴",
    };
    return icons[type] || "💾";
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Database Target Tabs */}
      <div className="border-b border-border px-6 py-3">
        <div className="flex space-x-6">
          {["sql", "mongodb", "elasticsearch", "dynamodb", "redis"].map((type) => (
            <Button key={type}
              variant={activeTab === type ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(type)}
              className="flex items-center gap-2"
            >
              <span className="mr-2">{getTabIcon(type)}</span>
              {type.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Query Input Area */}
      <div className="flex-1 flex">
        {/* Common Query Language Input */}
        <div className="flex-1 flex flex-col">
          <div className="px-6 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-primary">Common Query Language</h3>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground hover:text-accent"
                  onClick={() => validateMutation.mutate(query)}
                  disabled={validateMutation.isPending}
                >
                  <CheckCircle className="mr-1" size={12} />
                  Validate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground hover:text-accent"
                >
                  <Wand2 className="mr-1" size={12} />
                  Format
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 p-6">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full font-mono text-sm resize-none border-0 focus-visible:ring-0 shadow-none"
              placeholder="Enter your query using the common query language..."
            />
          </div>
        </div>

        {/* Generated Query Output */}
        <div className="flex-1 flex flex-col border-l border-border">
          <div className="px-6 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-primary">
                Generated {activeTab.toUpperCase()} Query
              </h3>
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1">{getTabIcon(activeTab)}</span>
                {activeTab.toUpperCase()}
                {connections?.find((c: any) => c.id === selectedConnection)?.name &&
                  ` - ${connections.find((c: any) => c.id === selectedConnection)?.name}`
                }
              </Badge>
            </div>
          </div>
          <div className="flex-1 p-6">
            <Card className="h-full syntax-highlight">
              <CardContent className="h-full p-4">
                <pre className="h-full query-editor text-gray-100 text-sm leading-relaxed overflow-auto whitespace-pre-wrap">
                  {translateMutation.isPending ? "Translating..." : formatGeneratedQuery(translatedQuery)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Execute Button and Options */}
      <div className="px-6 py-4 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleExecuteQuery}
              disabled={executeMutation.isPending || !query.trim()}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {executeMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2" size={16} />
                  Execute Query
                </>
              )}
            </Button>

            {/* Auto-selected Connection Display */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-primary">Target:</span>
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1">{getTabIcon(activeTab)}</span>
                {activeTab.toUpperCase()}
                {connections?.find((c: any) => c.id === selectedConnection)?.name &&
                  ` - ${connections.find((c: any) => c.id === selectedConnection)?.name}`
                }
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="explain"
                checked={showExecutionPlan}
                onCheckedChange={(checked) => setShowExecutionPlan(checked === true)}
              />
              <label htmlFor="explain" className="text-sm text-muted-foreground">
                Show execution plan
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="timing"
                checked={showTiming}
                onCheckedChange={(checked) => setShowTiming(checked === true)}
              />
              <label htmlFor="timing" className="text-sm text-muted-foreground">
                Show query timing
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
