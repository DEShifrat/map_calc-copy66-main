import React, { useState, useEffect } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface OnboardingDialogProps {
  title: string;
  description: React.ReactNode;
  localStorageKey: string;
  buttonText?: string;
}

const OnboardingDialog: React.FC<OnboardingDialogProps> = ({
  title,
  description,
  localStorageKey,
  buttonText = "Понятно",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasBeenShown = localStorage.getItem(localStorageKey);
    if (!hasBeenShown) {
      setIsOpen(true);
    }
  }, [localStorageKey]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(localStorageKey, 'true');
    }
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center space-x-2 mt-4">
          <Checkbox
            id={`dontShowAgain-${localStorageKey}`}
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(!!checked)}
          />
          <Label htmlFor={`dontShowAgain-${localStorageKey}`}>Не показывать снова</Label>
        </div>
        <AlertDialogFooter>
          <Button onClick={handleClose}>{buttonText}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default OnboardingDialog;