import { useState, useEffect } from "react";
import { useStudents } from "@/hooks/use-students";
import { Student } from "@/types/academics";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AddStudentToClassDialogProps {
  classId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStudentToClassDialog({ classId, onClose, onSuccess }: AddStudentToClassDialogProps) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { useStudentsWithoutClass } = useStudents();
  const { data: unassignedStudents, isLoading, refetch } = useStudentsWithoutClass();
  const queryClient = useQueryClient();

  // Refresh the list when the dialog opens
  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && unassignedStudents) {
      setSelectedStudents(unassignedStudents.map(student => student.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update all selected students with the new class ID
      const { error } = await supabase
        .from("students")
        .update({ class_id: classId })
        .in("id", selectedStudents);
        
      if (error) {
        throw error;
      }
      
      // Invalidate all relevant queries to ensure data consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["students", "without-class"] }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
        queryClient.invalidateQueries({ queryKey: ["class", classId] }),
        queryClient.invalidateQueries({ queryKey: ["class-students", classId] }),
        ...selectedStudents.map(studentId => 
          queryClient.invalidateQueries({ queryKey: ["student", studentId] })
        )
      ]);
      
      // Refetch unassigned students list
      await refetch();
      
      toast.success(`Successfully added ${selectedStudents.length} students to class`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding students to class:", error);
      toast.error("Failed to add students to class");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Add Students to Class</DialogTitle>
        <DialogDescription>
          Select students who are not assigned to any class
        </DialogDescription>
      </DialogHeader>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedStudents.length === (unassignedStudents?.length || 0) && (unassignedStudents?.length || 0) > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all students"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>GR Number</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!unassignedStudents || unassignedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No unassigned students available
                  </TableCell>
                </TableRow>
              ) : (
                unassignedStudents.map((student) => (
                  <TableRow key={student.id} className="cursor-pointer" onClick={() => handleSelectStudent(student.id)}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleSelectStudent(student.id)} 
                        aria-label={`Select ${student.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.gr_number}</TableCell>
                    <TableCell>{student.roll_number}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Unassigned
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || selectedStudents.length === 0}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            `Add ${selectedStudents.length} Students`
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
