import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DatabaseConnection } from "universal-query-translator";

interface EditConnectionDialogProps {
  connection: DatabaseConnection | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: DatabaseConnection) => void;
}

export function EditConnectionDialog({
  connection,
  isOpen,
  onClose,
  onSave
}: EditConnectionDialogProps) {
  const [editedConnection, setEditedConnection] = useState<DatabaseConnection>(() =>
    connection || {
      id: '',
      name: '',
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: '',
      username: ''
    }
  );

  useEffect(() => {
    if (connection) {
      setEditedConnection(connection);
    }
  }, [connection]);

  const handleSave = () => {
    onSave(editedConnection);
    onClose();
  };

  if (!connection) return null;

  const updateField = (field: keyof DatabaseConnection, value: any) => {
    setEditedConnection(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Connection</DialogTitle>
          <DialogDescription>
            Update the connection details. Changes will take effect after reconnection.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={editedConnection.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select
              value={editedConnection.type}
              onValueChange={(value) => updateField('type', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mongodb">MongoDB</SelectItem>
                <SelectItem value="dynamodb">DynamoDB</SelectItem>
                <SelectItem value="elasticsearch">Elasticsearch</SelectItem>
                <SelectItem value="redis">Redis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="host" className="text-right">
              Host
            </Label>
            <Input
              id="host"
              value={editedConnection.host}
              onChange={(e) => updateField('host', e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="port" className="text-right">
              Port
            </Label>
            <Input
              id="port"
              type="number"
              value={editedConnection.port}
              onChange={(e) => updateField('port', parseInt(e.target.value))}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="database" className="text-right">
              Database
            </Label>
            <Input
              id="database"
              value={editedConnection.database || ''}
              onChange={(e) => updateField('database', e.target.value)}
              className="col-span-3"
            />
          </div>

          {editedConnection.type === 'postgresql' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={editedConnection.username || ''}
                onChange={(e) => updateField('username', e.target.value)}
                className="col-span-3"
              />
            </div>
          )}

          {(editedConnection.type === 'dynamodb') && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region" className="text-right">Region</Label>
              <Input id="region" value={editedConnection.region || 'us-east-1'} onChange={(e) => updateField('region', e.target.value)} className="col-span-3" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}