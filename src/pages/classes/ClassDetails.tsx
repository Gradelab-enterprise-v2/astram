import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClassDetails } from "@/hooks/classes/use-class-details";
import { ClassSubjectsTab } from "@/components/classes/ClassSubjectsTab";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { AddStudentToClassDialog } from "@/components/classes/AddStudentToClassDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function ClassDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { 
    classData, 
    subjects, 
    students, 
    loading, 
    error,
    loadError, 
    loadClassDetails, 
    refreshSubjects,
    handleRetry,
    handleDeleteClass,
    isDeleting,
    isDataFetched
  } = useClassDetails(id);

  const removeStudentFromClass = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ class_id: null })
        .eq("id", studentId);
        
      if (error) {
        throw error;
      }
      
      // Invalidate all relevant queries to ensure data consistency
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: ["students", "without-class"] }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
        queryClient.invalidateQueries({ queryKey: ["class", id] }),
        queryClient.invalidateQueries({ queryKey: ["class-students", id] }),
        // Add specific queries for student details and class students
        queryClient.invalidateQueries({ queryKey: ["student", studentId] }),
        queryClient.invalidateQueries({ queryKey: ["student-classes", studentId] })
      ]);
      
      toast.success("Student removed from class successfully");
      handleRetry(); // Refresh the class details
    } catch (error: any) {
      console.error("Error removing student from class:", error);
      toast.error("Failed to remove student from class");
    }
  };

  // Load class details on initial mount and when id changes, but only if not already fetched
  useEffect(() => {
    if (id && !isDataFetched) {
      console.log("Loading class details for ID:", id);
      loadClassDetails();
    }
  }, [id, loadClassDetails, isDataFetched]);

  // Function to handle adding a subject to the class
  const handleAddSubject = async () => {
    try {
      // Refresh subjects list after adding a subject
      await refreshSubjects();
      return Promise.resolve();
    } catch (error) {
      console.error("Error in handleAddSubject:", error);
      return Promise.reject(error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map(item => (
              <Skeleton key={item} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <h2 className="text-2xl font-bold mb-2">Error Loading Class</h2>
        <p className="text-muted-foreground mb-4">{error || "Failed to load class data"}</p>
        <div className="flex gap-4">
          <Button onClick={handleRetry}>
            Retry
          </Button>
          <Button variant="outline" onClick={() => navigate("/classes")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Button>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <h2 className="text-2xl font-bold mb-2">Class Not Found</h2>
        <p className="text-muted-foreground mb-4">The class you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/classes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-transition-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("/classes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Class Details</h1>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Class</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {classData?.name}? This action cannot be undone and will remove all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteClass}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete Class"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{classData.name}</CardTitle>
          <CardDescription>Year: {classData.year}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="students">
            <TabsList className="mb-4">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
            </TabsList>
            
            <TabsContent value="students">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Students Enrolled in Class Subjects ({students?.length || 0})
                  </h3>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => navigate("/students/new")}>Add New Student</Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">Add Existing Students</Button>
                      </DialogTrigger>
                      <AddStudentToClassDialog 
                        classId={id || ""}
                        onClose={() => {}}
                        onSuccess={handleRetry}
                      />
                    </Dialog>
                  </div>
                </div>
                
                {students.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Roll No.</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow 
                            key={student.id}
                            className="cursor-pointer hover:bg-muted"
                            onClick={() => navigate(`/students/${student.id}`)}
                          >
                            <TableCell>{student.roll_number || "N/A"}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/students/${student.id}`);
                                  }}
                                >
                                  View
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeStudentFromClass(student.id);
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No students enrolled in subjects within this class yet.
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="subjects" className="mt-6">
              <ClassSubjectsTab 
                classId={id || ""} 
                subjects={subjects || []} 
                onAddSubject={handleAddSubject}
                onSubjectUpdated={refreshSubjects}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
