import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Clock, Play, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  database: string;
  results?: any;
  executionTime?: string;
}

interface QueryHistoryPanelProps {
  history: QueryHistoryItem[];
  onLoadQuery: (item: QueryHistoryItem) => void;
  onClose: () => void;
}

export function QueryHistoryPanel({ history, onLoadQuery, onClose }: QueryHistoryPanelProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Query has been copied to clipboard",
    });
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const getDatabaseIcon = (database: string) => {
    const icons: Record<string, string> = {
      sql: "🐘",
      postgresql: "🐘",
      mongodb: "🍃",
      elasticsearch: "🔍",
      dynamodb: "⚡",
      redis: "🔴",
    };
    return icons[database] || "💾";
  };

  return (
    <div className="w-96 bg-background border-l border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-primary" />
          <h3 className="font-medium text-foreground">Query History</h3>
          <Badge variant="secondary" className="text-xs">
            {history.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Clock size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No query history yet</p>
              <p className="text-xs">Execute queries to see them here</p>
            </div>
          ) : (
            history.map((item) => (
              <Card key={item.id} className="hover:border-accent transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{getDatabaseIcon(item.database)}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.database.toUpperCase()}
                      </Badge>
                      {item.executionTime && (
                        <Badge variant="secondary" className="text-xs">
                          {item.executionTime}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(item.query)}
                      >
                        <Copy size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onLoadQuery(item)}
                      >
                        <Play size={12} />
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mb-2">
                    {formatTimestamp(item.timestamp)}
                  </div>

                  <div className="bg-muted rounded p-2 text-xs font-mono">
                    <div className="line-clamp-3 whitespace-pre-wrap">
                      {item.query.length > 100 
                        ? `${item.query.substring(0, 100)}...` 
                        : item.query
                      }
                    </div>
                  </div>

                  {item.results && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {Array.isArray(item.results) 
                        ? `${item.results.length} rows returned`
                        : "Query executed successfully"
                      }
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}