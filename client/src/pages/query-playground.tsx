import { useState } from "react";
import { ConnectionSidebar } from "@/components/connection-sidebar";
import { QueryEditor } from "@/components/query-editor";
import { ResultsViewer } from "@/components/results-viewer";
import { DocumentationPanel } from "@/components/documentation-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, History, Book, Save, Settings } from "lucide-react";
import { Link } from "wouter";

export default function QueryPlayground() {
  const [showDocumentation, setShowDocumentation] = useState(true);
  const [queryResults, setQueryResults] = useState(null);
  const [executionStats, setExecutionStats] = useState(null);

  const handleQueryExecuted = (results: any, stats: any) => {
    setQueryResults(results);
    setExecutionStats(stats);
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
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <History className="mr-2" size={16} />
              Query History
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
            <Link href="/databases">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <Settings className="mr-2" size={16} />
                Database Setup
              </Button>
            </Link>
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
          <QueryEditor onQueryExecuted={handleQueryExecuted} />
          <ResultsViewer results={queryResults} stats={executionStats} />
        </div>

        {/* Documentation Panel */}
        {showDocumentation && (
          <DocumentationPanel onClose={() => setShowDocumentation(false)} />
        )}
      </div>
    </div>
  );
}
