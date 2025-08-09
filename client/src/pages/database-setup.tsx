import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Database, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

interface DatabaseStatus {
  available: boolean;
  connections: Record<string, { connected: boolean; error?: string }>;
  message: string;
  error?: string;
}

export default function DatabaseSetup() {
  const queryClient = useQueryClient();

  const { data: status, isLoading, error, refetch } = useQuery<DatabaseStatus>({
    queryKey: ['/api/real-databases/status'],
    enabled: false
  });

  const initializeMutation = useMutation({
    mutationFn: () => fetch('/api/real-databases/initialize', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/real-databases/status'] });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Checking database connections...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to check database status: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Infrastructure</h1>
          <p className="text-muted-foreground">
            Manage real database connections for QueryFlow
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
          <Button
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
          >
            {initializeMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            Initialize Connections
          </Button>
        </div>
      </div>

      {status && (
        <Alert variant={status.available ? "default" : "destructive"}>
          <Database className="h-4 w-4" />
          <AlertDescription>
            {status.message}
            {status.error && ` - ${status.error}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {status?.connections && Object.entries(status.connections).map(([id, connection]) => (
          <Card key={id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{getDatabaseDisplayName(id)}</CardTitle>
                <Badge variant={connection.connected ? "default" : "destructive"}>
                  {connection.connected ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  {connection.connected ? 'Connected' : 'Failed'}
                </Badge>
              </div>
              <CardDescription>
                {getDatabaseDescription(id)}
              </CardDescription>
            </CardHeader>
            {connection.error && (
              <CardContent>
                <Alert variant="destructive" className="text-sm">
                  <AlertDescription>
                    {connection.error}
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Docker Setup</CardTitle>
          <CardDescription>
            All databases are managed via Docker. No local installations required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Start services</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              <code>{`./install-docker.sh
./start-dev-docker.sh`}</code>
            </pre>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold">Service Ports</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>PostgreSQL: 5432</div>
              <div>MongoDB: 27017</div>
              <div>Redis: 6379</div>
              <div>DynamoDB: 8000</div>
              <div>OpenSearch: 9200</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getDatabaseDisplayName(id: string): string {
  const names: Record<string, string> = {
    'postgresql-local': 'PostgreSQL',
    'mongodb-local': 'MongoDB',
    'dynamodb-local': 'DynamoDB Local',
    'elasticsearch-postgresql': 'Elasticsearch (SQL)',
    'elasticsearch-dynamodb': 'Elasticsearch (NoSQL)',
    'redis-local': 'Redis'
  };
  return names[id] || id;
}

function getDatabaseDescription(id: string): string {
  const descriptions: Record<string, string> = {
    'postgresql-local': 'Primary SQL database with Drizzle ORM',
    'mongodb-local': 'Document database for NoSQL queries',
    'dynamodb-local': 'AWS DynamoDB Local for testing',
    'elasticsearch-postgresql': 'Search layer over PostgreSQL data',
    'elasticsearch-dynamodb': 'Search layer over DynamoDB data',
    'redis-local': 'Cache and search with Redis modules'
  };
  return descriptions[id] || 'Database connection';
}