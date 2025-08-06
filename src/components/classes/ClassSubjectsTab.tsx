
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Loader2, Trash } from "lucide-react";
import { Subject } from "@/types/academics";
import { ClassQuickLinks } from "./ClassQuickLinks";
import { useSubjects } from "@/hooks/use-subjects";
import { useStudents } from "@/hooks/use-students";
import { useSubjectEnrollments } from "@/hooks/use-subject-enrollments";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ClassSubjectsTabProps {
  classId: string;
  subjects: Subject[];
  onAddSubject: () => Promise<void>;
  onSubjectUpdated?: () => Promise<void>;
}

export function ClassSubjectsTab({ classId, subjects, onAddSubject, onSubjectUpdated }: ClassSubjectsTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { subjects: allSubjects, addSubjectToClass, removeSubjectFromClass, isAddingToClass, isRemovingFromClass } = useSubjects();
  const { fetchStudentsByClass } = useStudents();
  const { enrollClassStudentsInSubject, isEnrollingClass } = useSubjectEnrollments();
  
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [enrollingStudents, setEnrollingStudents] = useState(false);
  const [selectedSubjectForEnrollment, setSelectedSubjectForEnrollment] = useState<Subject | null>(null);
  const [selectedSubjectForRemoval, setSelectedSubjectForRemoval] = useState<Subject | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filter out subjects that are already added to the class
  const availableSubjects = allSubjects.filter(
    subject => !subjects.some(classSubject => classSubject.id === subject.id)
  );

  const handleAddSubject = async () => {
    if (selectedSubjectId) {
      try {
        await addSubjectToClass({
          classId,
          subjectId: selectedSubjectId
        });
        
        setSelectedSubjectId("");
        setIsDialogOpen(false);
        
        // Refresh the subject list
        queryClient.invalidateQueries({ queryKey: ["subjects", "by-class", classId] });
        
        // Signal the parent to refresh subjects list
        if (onAddSubject) {
          await onAddSubject();
        }
        
        if (onSubjectUpdated) {
          await onSubjectUpdated();
        }
      } catch (error: any) {
        console.error("Error adding subject:", error);
        toast.error("Failed to add subject: " + error.message);
      }
    } else {
      toast.error("Please select a subject to add");
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    try {
      await removeSubjectFromClass({
        classId,
        subjectId
      });
      
      toast.success("Subject removed from class successfully");
      
      // Refresh the subject list
      queryClient.invalidateQueries({ queryKey: ["subjects", "by-class", classId] });
      
      // Signal the parent to refresh subjects list
      if (onSubjectUpdated) {
        await onSubjectUpdated();
      }
      
      setSelectedSubjectForRemoval(null);
    } catch (error: any) {
      console.error("Error removing subject:", error);
      toast.error("Failed to remove subject: " + error.message);
    }
  };

  const handleEnrollClassStudents = async (subjectId: string) => {
    try {
      setEnrollingStudents(true);
      
      // First check if there are students in this class
      const students = await fetchStudentsByClass(classId);
      
      if (!students || students.length === 0) {
        toast.error("No students found in this class to enroll");
        setEnrollingStudents(false);
        setSelectedSubjectForEnrollment(null);
        return;
      }
      
      await enrollClassStudentsInSubject({
        classId,
        subjectId
      });
      
      toast.success("Students enrolled successfully");
      setSelectedSubjectForEnrollment(null);
    } catch (error: any) {
      console.error("Error enrolling students:", error);
      toast.error("Failed to enroll students: " + error.message);
    } finally {
      setEnrollingStudents(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>Manage subjects for this class</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Subject to Class</DialogTitle>
                <DialogDescription>
                  Select a subject to add to this class
                </DialogDescription>
              </DialogHeader>
              
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.length === 0 ? (
                    <SelectItem value="none" disabled>No subjects available</SelectItem>
                  ) : (
                    availableSubjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <DialogFooter>
                <Button 
                  onClick={handleAddSubject} 
                  disabled={!selectedSubjectId || isAddingToClass}
                >
                  {isAddingToClass ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Subject"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {subjects.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{subject.code}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/subjects/${subject.id}`)}>
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedSubjectForEnrollment(subject)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Enroll Students
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Subject</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove "{subject.name}" from this class? 
                                This will not delete the subject itself, only remove it from this class.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveSubject(subject.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={isRemovingFromClass}
                              >
                                {isRemovingFromClass ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Removing...
                                  </>
                                ) : (
                                  "Remove Subject"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No subjects assigned to this class yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSubjectForEnrollment} onOpenChange={(open) => !open && setSelectedSubjectForEnrollment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Class Students</DialogTitle>
            <DialogDescription>
              Enroll all students from this class into the subject {selectedSubjectForEnrollment?.name}.
            </DialogDescription>
          </DialogHeader>
          
          <p>This will enroll all students currently assigned to this class into the selected subject.</p>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setSelectedSubjectForEnrollment(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedSubjectForEnrollment && handleEnrollClassStudents(selectedSubjectForEnrollment.id)}
              disabled={enrollingStudents || isEnrollingClass}
            >
              {enrollingStudents || isEnrollingClass ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enrolling...
                </>
              ) : (
                "Confirm Enrollment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClassQuickLinks classId={classId} />
    </>
  );
}
