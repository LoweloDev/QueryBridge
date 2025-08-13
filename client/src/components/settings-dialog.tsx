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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TestSettings {
  autoLoadDataset: boolean;
  resetOnStartup: boolean;
  defaultQueryTimeout: number;
  showQueryTranslations: boolean;
  enableQueryLogging: boolean;
}

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const queryClient = useQueryClient();
  
  const { data: settings } = useQuery<TestSettings>({
    queryKey: ['/api/settings'],
    enabled: isOpen
  });

  const [editedSettings, setEditedSettings] = useState<TestSettings>({
    autoLoadDataset: true,
    resetOnStartup: true,
    defaultQueryTimeout: 30000,
    showQueryTranslations: true,
    enableQueryLogging: true
  });

  useEffect(() => {
    if (settings) {
      setEditedSettings(settings);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: TestSettings) => 
      apiRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(newSettings)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      onClose();
    }
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(editedSettings);
  };

  const updateSetting = <K extends keyof TestSettings>(
    key: K, 
    value: TestSettings[K]
  ) => {
    setEditedSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Test Environment Settings</DialogTitle>
          <DialogDescription>
            Configure how the testing environment behaves with databases and datasets.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-load Dataset</Label>
              <p className="text-sm text-muted-foreground">
                Automatically load example dataset when connecting to databases
              </p>
            </div>
            <Switch
              checked={editedSettings.autoLoadDataset}
              onCheckedChange={(checked) => updateSetting('autoLoadDataset', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reset on Startup</Label>
              <p className="text-sm text-muted-foreground">
                Clear all data and reload example dataset when starting up
              </p>
            </div>
            <Switch
              checked={editedSettings.resetOnStartup}
              onCheckedChange={(checked) => updateSetting('resetOnStartup', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Query Translations</Label>
              <p className="text-sm text-muted-foreground">
                Display translated queries alongside results
              </p>
            </div>
            <Switch
              checked={editedSettings.showQueryTranslations}
              onCheckedChange={(checked) => updateSetting('showQueryTranslations', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Query Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log all executed queries for debugging
              </p>
            </div>
            <Switch
              checked={editedSettings.enableQueryLogging}
              onCheckedChange={(checked) => updateSetting('enableQueryLogging', checked)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timeout">Default Query Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={editedSettings.defaultQueryTimeout}
              onChange={(e) => updateSetting('defaultQueryTimeout', parseInt(e.target.value))}
              min="1000"
              max="300000"
              step="1000"
            />
            <p className="text-sm text-muted-foreground">
              How long to wait for query execution before timing out
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}