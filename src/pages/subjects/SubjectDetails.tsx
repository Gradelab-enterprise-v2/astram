import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSubjects } from "@/hooks/use-subjects";
import { useCourseOutcomes } from "@/hooks/use-course-outcomes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SubjectPapers } from "@/components/subjects/SubjectPapers";
import { SubjectDocuments } from "@/components/subjects/SubjectDocuments";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, RefreshCw, Trash2, Edit } from "lucide-react";
import { useTests } from "@/hooks/use-tests";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSubjectEnrollments } from "@/hooks/use-subject-enrollments";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { AddStudentDialog } from "@/components/subjects/AddStudentDialog";

export default function SubjectDetails() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSubjectById, getStudentsForSubject, getClassForSubject, deleteSubject } = useSubjects();
  const { useTestsBySubject } = useTests();
  const { enrollClassStudentsInSubject, isEnrollingClass } = useSubjectEnrollments();
  const { data: tests = [], isLoading: testsLoading } = useTestsBySubject(id);
  const { user } = useAuth();
  const { courseOutcomes, isLoading: outcomesLoading, addCourseOutcome, deleteCourseOutcome, isAdding, isDeleting } = useCourseOutcomes(id);
  
  const [subject, setSubject] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [createTestDialogOpen, setCreateTestDialogOpen] = useState(false);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [outcomeToDelete, setOutcomeToDelete] = useState<string | null>(null);
  const [deleteOutcomeDialogOpen, setDeleteOutcomeDialogOpen] = useState(false);
  const [deleteSubjectDialogOpen, setDeleteSubjectDialogOpen] = useState(false);
  
  const createTestForm = useForm({
    defaultValues: {
      title: "",
      date: new Date().toISOString().split('T')[0],
      maxMarks: 100
    }
  });
  
  const outcomeForm = useForm({
    defaultValues: {
      description: ""
    }
  });

  const loadSubjectData = async () => {
    if (!id) {
      setIsLoading(false);
      setLoadError("Missing subject ID");
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    
    try {
      console.log("Fetching subject data for ID:", id);
      const subjectData = await getSubjectById(id);
      
      if (!subjectData) {
        console.error("No subject data returned");
        setLoadError("Subject not found");
        setIsLoading(false);
        return;
      }
      
      console.log("Subject data fetched:", subjectData);
      setSubject(subjectData);
      
      await loadStudents();
      
      try {
        console.log("Fetching class for subject");
        const classData = await getClassForSubject(id);
        console.log("Class data fetched:", classData);
        setClassInfo(classData);
      } catch (classError) {
        console.error("Error loading class data:", classError);
        setClassInfo(null);
      }
    } catch (error) {
      console.error("Error loading subject:", error);
      setLoadError("Failed to load subject details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      console.log("Fetching students for subject");
      const studentsData = await getStudentsForSubject(id);
      setStudents(studentsData || []);
      console.log("Students fetched:", studentsData?.length || 0, "students");
      return studentsData;
    } catch (studentsError) {
      console.error("Error loading students:", studentsError);
      setStudents([]);
      // Non-fatal error, don't set loadError
      return [];
    }
  };

  useEffect(() => {
    loadSubjectData();
  }, [id]);
  
  const handleCreateTest = async () => {
    if (!user) {
      toast.error("You must be logged in to create a test");
      return;
    }
    
    if (!classInfo) {
      toast.error("This subject must be assigned to a class before creating a test");
      return;
    }
    
    // Navigate to the test creation page
    navigate(`/tests/subject/${id}`);
  };

  const handleSyncStudents = async () => {
    if (!classInfo || !classInfo.id) {
      toast.error("This subject must be assigned to a class before syncing students");
      return;
    }

    try {
      console.log("Syncing students from class:", classInfo.id, "to subject:", id);
      await enrollClassStudentsInSubject({
        classId: classInfo.id,
        subjectId: id
      });

      // Refresh the student list after syncing
      await loadStudents();

      setSyncConfirmOpen(false);
      toast.success("Students synced from class successfully");
    } catch (error) {
      console.error("Error syncing students:", error);
      toast.error("Failed to sync students from class");
    }
  };
  
  const handleAddOutcome = async (data: { description: string }) => {
    if (!data.description.trim()) {
      toast.error("Please enter a description for the course outcome");
      return;
    }
    
    await addCourseOutcome(data.description);
    outcomeForm.reset();
    setOutcomeDialogOpen(false);
  };

  const confirmDeleteOutcome = (outcomeId: string) => {
    setOutcomeToDelete(outcomeId);
    setDeleteOutcomeDialogOpen(true);
  };

  const handleDeleteOutcome = async () => {
    if (outcomeToDelete) {
      await deleteCourseOutcome(outcomeToDelete);
      setOutcomeToDelete(null);
      setDeleteOutcomeDialogOpen(false);
    }
  };

  const handleRetry = () => {
    loadSubjectData();
  };

  const handleDeleteSubject = async () => {
    try {
      await deleteSubject(id);
      toast.success("Subject deleted successfully");
      navigate("/subjects");
    } catch (error: any) {
      toast.error("Failed to delete subject: " + error.message);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{loadError}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Loading
          </Button>
          <Button variant="outline" onClick={() => navigate("/subjects")}>
            Back to Subjects
          </Button>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>Subject not found or could not be loaded.</p>
        </div>
        <Button className="mt-4" onClick={() => navigate("/subjects")}>
          Back to Subjects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-transition-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{subject?.name}</h1>
          <div className="text-muted-foreground">
            {subject?.code} | {classInfo?.name ? `${classInfo.name} (${classInfo.year})` : "No Class Assigned"}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddStudentDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Students
          </Button>
          <Button onClick={() => navigate(`/subjects/${id}/edit`)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Subject
          </Button>
          <AlertDialog open={deleteSubjectDialogOpen} onOpenChange={setDeleteSubjectDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Subject
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this subject?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the subject
                  and all associated data including tests, papers, and student enrollments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSubject}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="papers">Papers</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="outcomes">Course Outcomes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Subject Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Subject Code:</span> {subject?.code}
                  </div>
                  <div>
                    <span className="font-medium">Class:</span> {classInfo?.name || "Not Assigned"}
                  </div>
                  {subject?.semester && (
                    <div>
                      <span className="font-medium">Semester:</span> {subject.semester}
                    </div>
                  )}
                  {subject?.information && (
                    <div>
                      <span className="font-medium">Additional Information:</span>
                      <p className="mt-1">{subject.information}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Tests</CardTitle>
              </CardHeader>
              <CardContent>
                {testsLoading ? (
                  <div className="flex justify-center items-center p-4">
                    <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : tests.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No tests created yet</p>
                    <Button 
                      onClick={() => navigate('/tests/new')}
                      className="flex items-center gap-2 mt-2"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Create Test
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tests.slice(0, 5).map(test => (
                      <div key={test.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <div className="font-medium">{test.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(test.date), "PP")}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                    ))}
                    {tests.length > 5 && (
                      <div className="text-center mt-2">
                        <Button variant="link" size="sm">View All Tests</Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="students">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Enrolled Students</CardTitle>
                <CardDescription>List of students enrolled in this subject</CardDescription>
              </div>
              <div className="flex gap-2">
                {classInfo && (
                  <Button 
                    variant="outline"
                    onClick={() => setSyncConfirmOpen(true)}
                    disabled={isEnrollingClass}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isEnrollingClass ? 'animate-spin' : ''}`} />
                    Sync from Class
                  </Button>
                )}
                <Button onClick={() => setAddStudentDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No students enrolled in this subject</p>
                  {classInfo ? (
                    <Button 
                      className="gap-1" 
                      onClick={() => setSyncConfirmOpen(true)}
                      disabled={isEnrollingClass}
                    >
                      <RefreshCw className={`h-4 w-4 ${isEnrollingClass ? 'animate-spin' : ''}`} />
                      Sync Students from Class
                    </Button>
                  ) : (
                    <Button className="mt-4 gap-1" onClick={() => setAddStudentDialogOpen(true)}>
                      <PlusCircle className="h-4 w-4" />
                      Add Student Manually
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>GR Number</TableHead>
                        <TableHead>Class</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.roll_number}</TableCell>
                          <TableCell>{student.gr_number}</TableCell>
                          <TableCell>{student.class?.name || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="papers">
          <Card>
            <CardHeader>
              <CardTitle>Subject Papers</CardTitle>
              <p className="text-muted-foreground">
                View and download papers for this subject
              </p>
            </CardHeader>
            <CardContent>
              <SubjectPapers subjectId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <SubjectDocuments subjectId={id} />
        </TabsContent>

        <TabsContent value="outcomes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Course Outcomes</CardTitle>
                <CardDescription>Manage course outcomes for this subject</CardDescription>
              </div>
              <Button onClick={() => setOutcomeDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Outcome
              </Button>
            </CardHeader>
            <CardContent>
              {outcomesLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : courseOutcomes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No course outcomes defined for this subject</p>
                  <Button onClick={() => setOutcomeDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Course Outcome
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseOutcomes.map((outcome, index) => (
                        <TableRow key={outcome.id}>
                          <TableCell className="font-medium">CO{index + 1}</TableCell>
                          <TableCell>{outcome.description}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => confirmDeleteOutcome(outcome.id)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
        <AddStudentDialog 
          subjectId={id} 
          onClose={() => setAddStudentDialogOpen(false)}
          refreshStudents={loadStudents}
        />
      </Dialog>
      
      <Dialog open={createTestDialogOpen} onOpenChange={setCreateTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Test</DialogTitle>
            <DialogDescription>
              Create a new test for this subject
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createTestForm.handleSubmit(handleCreateTest)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Test Title</Label>
              <Input 
                id="title" 
                placeholder="e.g., Mid-term Exam" 
                {...createTestForm.register("title", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Test Date</Label>
              <Input 
                id="date" 
                type="date" 
                {...createTestForm.register("date", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxMarks">Maximum Marks</Label>
              <Input 
                id="maxMarks" 
                type="number" 
                {...createTestForm.register("maxMarks", { 
                  required: true,
                  valueAsNumber: true,
                  min: 1
                })}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Create Test</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync Students from Class</AlertDialogTitle>
            <AlertDialogDescription>
              This will enroll all students from {classInfo?.name} class in this subject.
              Students who are already enrolled will be skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncStudents} disabled={isEnrollingClass}>
              {isEnrollingClass ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Students"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Course Outcome</DialogTitle>
            <DialogDescription>
              Define a new course outcome for this subject
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={outcomeForm.handleSubmit(handleAddOutcome)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Outcome Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe the outcome..." 
                rows={4}
                {...outcomeForm.register("description", { required: true })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Course Outcome"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteOutcomeDialogOpen} onOpenChange={setDeleteOutcomeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course Outcome</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this course outcome? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOutcome}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
