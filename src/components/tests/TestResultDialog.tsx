
// This file is now unused after removing the "Add Student Result" functionality.
// It can be safely deleted in a future cleanup if no other components start using it.

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Student } from "@/types/academics";
import { useTestResults } from "@/hooks/use-test-results";

interface TestResultDialogProps {
  student: Student;
  testId: string;
  maxMarks: number;
  onSuccess: () => void;
}

export function TestResultDialog({ student, testId, maxMarks, onSuccess }: TestResultDialogProps) {
  const { createResult } = useTestResults();
  const [marksObtained, setMarksObtained] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async () => {
    if (!marksObtained) {
      toast.error("Please enter marks obtained");
      return;
    }

    const marks = parseFloat(marksObtained);
    if (isNaN(marks) || marks < 0 || marks > maxMarks) {
      toast.error(`Marks must be between 0 and ${maxMarks}`);
      return;
    }

    setIsAdding(true);
    try {
      await createResult({
        test_id: testId,
        student_id: student.id,
        marks_obtained: marks,
      });
      toast.success("Test result added successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(`Failed to add test result: ${error.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Result for {student.name}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="marks" className="text-right">
            Marks Obtained
          </Label>
          <Input
            type="number"
            id="marks"
            value={marksObtained}
            onChange={(e) => setMarksObtained(e.target.value)}
            className="col-span-3"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary" className="mr-2">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" onClick={handleSubmit} disabled={isAdding}>
          {isAdding ? "Adding..." : "Add Result"}
        </Button>
      </div>
    </DialogContent>
  );
}
