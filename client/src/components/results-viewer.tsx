import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Table as TableIcon, Download, Copy } from "lucide-react";

interface ResultsViewerProps {
  results: any;
  stats: any;
}

export function ResultsViewer({ results, stats }: ResultsViewerProps) {
  const [viewMode, setViewMode] = useState<"json" | "table">("json");

  if (!results) {
    return (
      <div className="flex-1 bg-white border-t border-border">
        <div className="px-6 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-medium text-primary">Query Results</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Code size={48} className="mx-auto mb-4 opacity-50" />
            <p>Execute a query to see results here</p>
          </div>
        </div>
      </div>
    );
  }

  const formatResults = (data: any) => {
    if (Array.isArray(data)) {
      return data;
    }
    if (data.rows) {
      return data.rows;
    }
    if (data.Items) {
      return data.Items;
    }
    if (data.hits && data.hits.hits) {
      return data.hits.hits.map((hit: any) => hit._source);
    }
    return [data];
  };

  const formattedResults = formatResults(results);
  const resultCount = Array.isArray(formattedResults) ? formattedResults.length : 1;

  const renderTableView = () => {
    if (!Array.isArray(formattedResults) || formattedResults.length === 0) {
      return <div className="p-6 text-center text-muted-foreground">No data to display</div>;
    }

    const keys = Object.keys(formattedResults[0] || {});

    return (
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {keys.map((key) => (
                <TableHead key={key} className="font-medium">
                  {key}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {formattedResults.map((row, index) => (
              <TableRow key={index}>
                {keys.map((key) => (
                  <TableCell key={key} className="font-mono text-sm">
                    {typeof row[key] === 'object' 
                      ? JSON.stringify(row[key]) 
                      : String(row[key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderJsonView = () => {
    return (
      <Card className="h-full json-viewer">
        <CardContent className="h-full p-4">
          <pre className="h-full font-mono text-sm leading-relaxed overflow-auto whitespace-pre-wrap text-gray-100">
            {JSON.stringify(formattedResults, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 bg-white border-t border-border flex flex-col">
      <div className="px-6 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-sm font-medium text-primary">Query Results</h3>
            {stats && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Badge className="bg-success text-success-foreground">SUCCESS</Badge>
                <span>{resultCount} rows returned</span>
                <span>•</span>
                <span>Executed in {stats.executionTime}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "json" | "table")}>
              <TabsList>
                <TabsTrigger value="table" className="text-xs">
                  <TableIcon className="mr-1" size={12} />
                  Table View
                </TabsTrigger>
                <TabsTrigger value="json" className="text-xs">
                  <Code className="mr-1" size={12} />
                  JSON View
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-accent"
              onClick={() => {
                const data = JSON.stringify(formattedResults, null, 2);
                navigator.clipboard.writeText(data);
              }}
            >
              <Copy className="mr-1" size={12} />
              Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-accent"
            >
              <Download className="mr-1" size={12} />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        {viewMode === "table" ? renderTableView() : renderJsonView()}
      </div>
    </div>
  );
}
