import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, MoreVertical, Loader2, Settings } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ConnectionDropdownMenu } from "./connection-dropdown-menu";
import { EditConnectionDialog } from "./edit-connection-dialog";
import { SettingsDialog } from "./settings-dialog";
import type { DatabaseConnection } from "universal-query-translator";

export function ConnectionSidebar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({});
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["/api/connections"],
    queryFn: api.getConnections,
  });

  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => api.testConnection(id),
    onSuccess: (data, id) => {
      // Update local connection status
      setConnectionStatus(prev => ({ ...prev, [id]: true }));
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Connection tested successfully",
        description: "The database connection is working properly.",
      });
    },
    onError: (error, id) => {
      // Update local connection status
      setConnectionStatus(prev => ({ ...prev, [id]: false }));
      toast({
        title: "Connection failed",
        description: "Could not connect to the database.",
        variant: "destructive",
      });
    },
  });

  const resetDatabaseMutation = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/connections/${id}/reset`, { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Database reset successfully",
        description: "All data cleared and example dataset loaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset database.",
        variant: "destructive",
      });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/connections/${id}`, { method: 'DELETE' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Connection deleted",
        description: "Database connection removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete connection.",
        variant: "destructive",
      });
    },
  });

  const loadDatasetMutation = useMutation({
    mutationFn: (id: string) => 
      fetch(`/api/connections/${id}/load-dataset`, { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Dataset loaded successfully",
        description: "Example dataset has been loaded into the database.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Dataset loading failed",
        description: error.message || "Failed to load example dataset.",
        variant: "destructive",
      });
    },
  });

  const updateConnectionMutation = useMutation({
    mutationFn: (connection: DatabaseConnection) => 
      fetch(`/api/connections/${connection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connection)
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
      toast({
        title: "Connection updated",
        description: "Connection configuration saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed", 
        description: error.message || "Failed to update connection.",
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

  const getConnectionBadge = (type: string) => {
    if (type === 'redis') {
      return (
        <Badge variant="secondary" className="text-xs px-1 py-0">
          +Search/Graph
        </Badge>
      );
    }
    return null;
  };

  const getStatusColor = (connectionId: string, defaultActive?: boolean) => {
    // Use local status if available, otherwise fall back to connection's default
    const isActive = connectionStatus[connectionId] ?? defaultActive ?? true; // Default to true since connections are working
    return isActive ? "bg-green-500" : "bg-red-500";
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
          <h2 className="font-semibold text-primary">Available Connections</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSettings(true)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="text-xs">
              {connections?.length || 0} active
            </Badge>
          </div>
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
                  <div 
                    className={`w-3 h-3 rounded-full border ${getStatusColor(connection.id, connection.isActive)}`}
                    title={connectionStatus[connection.id] !== undefined 
                      ? (connectionStatus[connection.id] ? "Connection successful" : "Connection failed")
                      : "Click to test connection"
                    }
                  />
                  <span className="font-medium text-sm">{connection.name}</span>
                </div>
                <ConnectionDropdownMenu 
                  connection={connection}
                  onEdit={setEditingConnection}
                  onReset={(conn) => resetDatabaseMutation.mutate(conn.id)}
                  onDelete={(conn) => deleteConnectionMutation.mutate(conn.id)}
                  onLoadDataset={(conn) => loadDatasetMutation.mutate(conn.id)}
                />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <span>{getConnectionIcon(connection.type)}</span>
                    <span>{connection.type.toUpperCase()}</span>
                  </div>
                  {getConnectionBadge(connection.type)}
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

      {/* Edit Connection Dialog */}
      <EditConnectionDialog
        connection={editingConnection}
        isOpen={!!editingConnection}
        onClose={() => setEditingConnection(null)}
        onSave={(connection) => {
          updateConnectionMutation.mutate(connection);
          setEditingConnection(null);
        }}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </aside>
  );
}
