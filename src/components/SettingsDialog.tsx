import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon } from 'lucide-react';
import { useMap } from '@/context/MapContext';
import { showSuccess, showError } from '@/utils/toast';

interface SettingsDialogProps {
  children: React.ReactNode; // To allow the trigger button to be passed as a child
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ children }) => {
  const { state, actions } = useMap();
  const [localIsAutoSaveEnabled, setLocalIsAutoSaveEnabled] = useState(state.isAutoSaveEnabled);
  const [localAutoSaveInterval, setLocalAutoSaveInterval] = useState(state.autoSaveIntervalMinutes);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Sync local state with global state when dialog opens or global state changes
  useEffect(() => {
    setLocalIsAutoSaveEnabled(state.isAutoSaveEnabled);
    setLocalAutoSaveInterval(state.autoSaveIntervalMinutes);
  }, [state.isAutoSaveEnabled, state.autoSaveIntervalMinutes, isDialogOpen]);

  const handleSaveSettings = () => {
    // Apply changes to global state
    if (localIsAutoSaveEnabled !== state.isAutoSaveEnabled) {
      actions.toggleAutoSave(); // This will flip the state
    }
    if (localAutoSaveInterval !== state.autoSaveIntervalMinutes) {
      actions.setAutoSaveInterval(localAutoSaveInterval);
    }
    showSuccess('Настройки сохранены!');
    setIsDialogOpen(false);
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (!isNaN(value) && value >= 1) { // Ensure positive integer
      setLocalAutoSaveInterval(value);
    } else if (e.target.value === '') {
      setLocalAutoSaveInterval(0); // Allow clearing input
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Общие настройки</DialogTitle>
          <DialogDescription>
            Настройте параметры приложения.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoSaveEnabled"
              checked={localIsAutoSaveEnabled}
              onCheckedChange={(checked) => setLocalIsAutoSaveEnabled(!!checked)}
            />
            <Label htmlFor="autoSaveEnabled" className="text-sm">Автосохранение конфигурации</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="autoSaveInterval">Интервал автосохранения (минуты)</Label>
            <Input
              id="autoSaveInterval"
              type="number"
              value={localAutoSaveInterval === 0 ? '' : localAutoSaveInterval}
              onChange={handleIntervalChange}
              min="1"
              step="1"
              disabled={!localIsAutoSaveEnabled}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings}>Сохранить изменения</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;