import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, MoreVertical, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function ConnectionSidebar() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["/api/connections"],
    queryFn: api.getConnections,
  });

  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => api.testConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Connection tested successfully",
        description: "The database connection is working properly.",
      });
    },
    onError: () => {
      toast({
        title: "Connection failed",
        description: "Could not connect to the database.",
        variant: "destructive",
      });
    },
  });

  const filteredConnections = connections?.filter((conn: any) =>
    conn.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getConnectionIcon = (type: string) => {
    const icons: Record<string, string> = {
      postgresql: "🐘",
      mysql: "🐬",
      mongodb: "🍃",
      elasticsearch: "🔍",
      dynamodb: "⚡",
      redis: "🔴",
    };
    return icons[type] || "💾";
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-success" : "bg-destructive";
  };

  if (isLoading) {
    return (
      <aside className="w-80 bg-white border-r border-border flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} />
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-primary">Database Connections</h2>
          <Button size="sm" variant="ghost" className="text-accent hover:text-accent-foreground">
            <Plus size={16} />
          </Button>
        </div>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search connections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
          <Search className="absolute left-3 top-3 text-muted-foreground" size={12} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredConnections.map((connection: any) => (
          <Card
            key={connection.id}
            className="hover:border-accent transition-colors cursor-pointer"
            onClick={() => testConnectionMutation.mutate(connection.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`connection-dot ${getStatusColor(connection.isActive)}`} />
                  <span className="font-medium text-sm">{connection.name}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-auto p-1">
                  <MoreVertical size={12} className="text-muted-foreground" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center space-x-1">
                  <span>{getConnectionIcon(connection.type)}</span>
                  <span>{connection.type.toUpperCase()}</span>
                </div>
                <div>Host: {connection.host}</div>
                <div>Database: {connection.database}</div>
              </div>
              {testConnectionMutation.isPending && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Loader2 className="mr-1 animate-spin" size={10} />
                    Testing...
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="mr-2" size={16} />
          Add Connection
        </Button>
      </div>
    </aside>
  );
}
