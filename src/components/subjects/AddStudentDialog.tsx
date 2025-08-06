
import React, { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useStudents } from "@/hooks/use-students";
import { useSubjectEnrollments } from "@/hooks/use-subject-enrollments";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AddStudentDialog({ 
  subjectId, 
  onClose,
  refreshStudents
}: { 
  subjectId: string; 
  onClose: () => void;
  refreshStudents: () => Promise<any>;
}) {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { students, isLoading } = useStudents();
  const { enrollStudentInSubject } = useSubjectEnrollments();

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
    if (checked) {
      setSelectedStudents(students.map(student => student.id));
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
      // Enroll selected students one by one
      for (const studentId of selectedStudents) {
        await enrollStudentInSubject({ 
          studentId,
          subjectId
        });
      }
      
      toast.success(`Successfully enrolled ${selectedStudents.length} students`);
      await refreshStudents(); // Refresh the students list
      onClose();
    } catch (error) {
      console.error("Error enrolling students:", error);
      toast.error("Failed to enroll some students");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Add Students to Subject</DialogTitle>
        <DialogDescription>
          Select students to enroll in this subject
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
                    checked={selectedStudents.length === students.length && students.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all students"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No students available
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} className="cursor-pointer" onClick={() => handleSelectStudent(student.id)}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleSelectStudent(student.id)} 
                        aria-label={`Select ${student.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.roll_number}</TableCell>
                    <TableCell>{student.class?.name || "-"}</TableCell>
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
              Enrolling...
            </>
          ) : (
            `Enroll ${selectedStudents.length} Students`
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
