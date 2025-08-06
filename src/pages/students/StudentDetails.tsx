import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudents } from "@/hooks/use-students";
import { useSubjects } from "@/hooks/use-subjects";
import { useSubjectEnrollments } from "@/hooks/use-subject-enrollments";
import { ArrowLeft, Edit, UserRound, BookOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Subject } from "@/types/academics";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { StudentPerformance } from "@/components/students/StudentPerformance";

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { useStudentDetails, deleteStudent, isDeleting } = useStudents();
  const { useStudentEnrollments } = useSubjectEnrollments();
  
  const studentQuery = useStudentDetails(id || "");
  const enrollmentsQuery = useStudentEnrollments(id || "");

  const student = studentQuery.data;
  const isLoadingStudent = studentQuery.isLoading;
  const enrollments = enrollmentsQuery.data;
  const isLoadingEnrollments = enrollmentsQuery.isLoading;
  const [studentSubjects, setStudentSubjects] = useState<Subject[]>([]);
  const [subjectError, setSubjectError] = useState<string | null>(null);

  useEffect(() => {
    if (enrollments && enrollments.length > 0) {
      const subjects = enrollments.map(enrollment => enrollment.subject).filter(Boolean) as Subject[];
      setStudentSubjects(subjects);
      setSubjectError(null);
    } else if (enrollmentsQuery.isSuccess && (!enrollments || enrollments.length === 0)) {
      setStudentSubjects([]);
    }
  }, [enrollments, enrollmentsQuery.isSuccess]);

  useEffect(() => {
    if (enrollmentsQuery.error) {
      console.error("Error fetching student enrollments:", enrollmentsQuery.error);
      setSubjectError("Failed to load subject enrollments. Please try again later.");
    }
  }, [enrollmentsQuery.error]);

  const handleDeleteStudent = () => {
    if (!student) return;
    
    deleteStudent(student.id, {
      onSuccess: () => {
        toast.success(`Student ${student.name} deleted successfully`);
        navigate("/students");
      }
    });
  };

  if (isLoadingStudent) {
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
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center text-center">
                <Skeleton className="w-24 h-24 rounded-full" />
                <Skeleton className="h-6 w-40 mt-4" />
                <Skeleton className="h-4 w-24 mt-2" />
              </div>
              
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map(item => (
                  <div key={item}>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-48" />
              </div>
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[1, 2, 3].map(item => (
                  <div key={item}>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <div className="space-y-2">
                      {[1, 2, 3].map(subitem => (
                        <Skeleton key={subitem} className="h-16 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <h2 className="text-2xl font-bold mb-2">Student Not Found</h2>
        <p className="text-muted-foreground mb-4">The student you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/students")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-transition-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Student Details</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/students/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Student
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Student</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {student?.name}? This action cannot be undone and will remove all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteStudent}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete Student"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Student Profile</CardTitle>
            <CardDescription>Personal and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {student.profile_picture ? (
                  <img 
                    src={student.profile_picture} 
                    alt={student.name} 
                    className="w-24 h-24 rounded-full object-cover border-4 border-background"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserRound className="h-12 w-12 text-primary" />
                  </div>
                )}
              </div>
              <h2 className="mt-4 text-xl font-bold">{student.name}</h2>
              <p className="text-sm text-muted-foreground">Roll No: {student.roll_number}</p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Class</h3>
                <p>{student.class?.name || "Not assigned"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Date of Birth</h3>
                <p>{student.date_of_birth ? format(new Date(student.date_of_birth), 'PP') : "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Gender</h3>
                <p>{student.gender || "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <p>{student.email || "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                <p>{student.phone || "Not provided"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                <p>{student.address || "Not provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <Tabs defaultValue="academic">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Student Information</CardTitle>
                <TabsList>
                  <TabsTrigger value="academic">Academic</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>
              </div>
              <CardDescription>
                View detailed information about the student
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsContent value="academic" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center">
                    <BookOpen className="mr-2 h-5 w-5 text-primary" />
                    Enrolled Subjects
                  </h3>
                  
                  {isLoadingEnrollments ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((_, index) => (
                        <Skeleton key={index} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : subjectError ? (
                    <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                      {subjectError}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => enrollmentsQuery.refetch()}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : studentSubjects && studentSubjects.length > 0 ? (
                    <div className="grid gap-2">
                      {studentSubjects.map((subject) => (
                        <div key={subject.id} className="flex items-center justify-between p-3 border rounded-md">
                          <div>
                            <p className="font-medium">{subject.name}</p>
                            <p className="text-sm text-muted-foreground">{subject.code}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/subjects/${subject.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {student.class_id 
                        ? "No subjects assigned to this student yet." 
                        : "This student is not assigned to any class or subjects."}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Additional Notes</h3>
                  <p className="text-muted-foreground">
                    {student.notes || "No additional notes available for this student."}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="space-y-6">
                <StudentPerformance studentId={id || ""} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
