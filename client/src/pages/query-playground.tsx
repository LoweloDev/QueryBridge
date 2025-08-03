import { useState } from "react";
import { ConnectionSidebar } from "@/components/connection-sidebar";
import { QueryEditor } from "@/components/query-editor";
import { ResultsViewer } from "@/components/results-viewer";
import { DocumentationPanel } from "@/components/documentation-panel";
import { QueryHistoryPanel } from "@/components/query-history-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, History, Book, Save } from "lucide-react";

// Query history storage interface
interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  database: string;
  results?: any;
  executionTime?: string;
}

export default function QueryPlayground() {
  const [showDocumentation, setShowDocumentation] = useState(true);
  const [showQueryHistory, setShowQueryHistory] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  const [executionStats, setExecutionStats] = useState(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);

  const handleQueryExecuted = (results: any, stats: any) => {
    setQueryResults(results);
    setExecutionStats(stats);
  };

  const addToHistory = (query: string, database: string, results?: any, executionTime?: string) => {
    const historyItem: QueryHistoryItem = {
      id: Date.now().toString(),
      query,
      database,
      timestamp: new Date(),
      results,
      executionTime,
    };
    setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]); // Keep last 50 queries
  };

  const loadFromHistory = (item: QueryHistoryItem) => {
    // This will be passed to QueryEditor to load a historical query
    return item;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Database className="text-white text-sm" size={16} />
              </div>
              <h1 className="text-xl font-semibold text-primary">QueryFlow</h1>
              <Badge variant="secondary" className="text-xs">v1.0.0</Badge>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-primary"
              onClick={() => setShowQueryHistory(!showQueryHistory)}
            >
              <History className="mr-2" size={16} />
              Query History ({queryHistory.length})
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-primary"
              onClick={() => setShowDocumentation(!showDocumentation)}
            >
              <Book className="mr-2" size={16} />
              Documentation
            </Button>
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Save className="mr-2" size={16} />
              Save Query
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Connection Sidebar */}
        <ConnectionSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <QueryEditor 
            onQueryExecuted={handleQueryExecuted} 
            onQueryHistoryAdd={addToHistory}
          />
          <ResultsViewer results={queryResults} stats={executionStats} />
        </div>

        {/* Query History Panel */}
        {showQueryHistory && (
          <QueryHistoryPanel 
            history={queryHistory}
            onLoadQuery={loadFromHistory}
            onClose={() => setShowQueryHistory(false)} 
          />
        )}

        {/* Documentation Panel */}
        {showDocumentation && (
          <DocumentationPanel onClose={() => setShowDocumentation(false)} />
        )}
      </div>
    </div>
  );
}
