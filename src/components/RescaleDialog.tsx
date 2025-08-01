import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RescaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (realWorldLength: number) => void;
  drawnLengthMeters: number;
}

const RescaleDialog: React.FC<RescaleDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  drawnLengthMeters,
}) => {
  const [inputValue, setInputValue] = useState<string>('');

  const handleConfirm = () => {
    const realWorldLength = parseFloat(inputValue);
    if (!isNaN(realWorldLength) && realWorldLength > 0) {
      onConfirm(realWorldLength);
      setInputValue(''); // Clear input after successful confirm
    } else {
      // Optionally show an error message to the user within the dialog or via toast
      alert('Пожалуйста, введите корректное положительное число.');
    }
    onClose();
  };

  const handleCancel = () => {
    setInputValue(''); // Clear input on cancel
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ремасштабирование карты</AlertDialogTitle>
          <AlertDialogDescription>
            Вы нарисовали отрезок длиной {drawnLengthMeters.toFixed(2)} метров на карте.
            Пожалуйста, введите реальную длину этого отрезка в метрах.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="realLength" className="text-right">
              Реальная длина (м)
            </Label>
            <Input
              id="realLength"
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="col-span-3"
              min="0.1"
              step="0.1"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Подтвердить</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RescaleDialog;