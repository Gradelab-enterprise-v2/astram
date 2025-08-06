
import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AddCreditsDialogProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddCreditsDialog({ 
  userId, 
  userName, 
  open, 
  onOpenChange,
  onSuccess 
}: AddCreditsDialogProps) {
  const [credits, setCredits] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { useAddUserCredits } = useSubscription();
  const addCredits = useAddUserCredits();
  
  const handleAddCredits = async () => {
    if (!credits || parseInt(credits) <= 0) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await addCredits.mutateAsync({
        userId,
        creditsToAdd: parseInt(credits)
      });
      
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error adding credits:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
          <DialogDescription>
            Add additional credits to {userName}'s account.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="credits" className="text-right">
              Credits
            </Label>
            <Input
              id="credits"
              type="number"
              min="0"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleAddCredits}
            disabled={!credits || parseInt(credits) <= 0 || isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Credits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
