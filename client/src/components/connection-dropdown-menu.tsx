import React, { useState } from "react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, RotateCcw, Trash2, Database } from "lucide-react";
import type { DatabaseConnection } from "universal-query-translator";

interface ConnectionDropdownMenuProps {
  connection: DatabaseConnection;
  onEdit: (connection: DatabaseConnection) => void;
  onReset: (connection: DatabaseConnection) => void;
  onDelete: (connection: DatabaseConnection) => void;
  onLoadDataset: (connection: DatabaseConnection) => void;
}

export function ConnectionDropdownMenu({ 
  connection, 
  onEdit, 
  onReset, 
  onDelete,
  onLoadDataset 
}: ConnectionDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset this database? All data will be deleted and replaced with example data."
    );
    
    if (confirmed) {
      onReset(connection);
    }
    setIsOpen(false);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this connection? This action cannot be undone."
    );
    
    if (confirmed) {
      onDelete(connection);
    }
    setIsOpen(false);
  };

  const handleLoadDataset = () => {
    onLoadDataset(connection);
    setIsOpen(false);
  };

  const handleEdit = () => {
    onEdit(connection);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" />
          Edit Connection
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLoadDataset} className="cursor-pointer">
          <Database className="mr-2 h-4 w-4" />
          Load Dataset
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleReset} className="cursor-pointer text-orange-600">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Database
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Connection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}