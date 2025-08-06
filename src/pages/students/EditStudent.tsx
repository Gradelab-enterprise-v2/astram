
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudents } from "@/hooks/use-students";
import { useClasses } from "@/hooks/use-classes";
import { StudentFormSkeleton } from "@/components/students/StudentFormSkeleton";
import { StudentNotFound } from "@/components/students/StudentNotFound";
import { StudentForm } from "@/components/students/StudentForm";

export default function EditStudent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { useStudentDetails, updateStudent, isUpdating } = useStudents();
  const { classes } = useClasses();
  
  const studentQuery = useStudentDetails(id || "");
  const student = studentQuery.data;
  const isLoading = studentQuery.isLoading;

  const onSubmit = (data: any) => {
    updateStudent({
      id: id || "",
      ...data
    });
  };

  if (isLoading) {
    return <StudentFormSkeleton />;
  }

  if (!student) {
    return <StudentNotFound />;
  }

  return (
    <div className="space-y-6 animate-page-transition-in">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate(`/students/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Student</h1>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
          <CardDescription>Update student details and information</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <StudentForm 
            student={student}
            classes={classes}
            onSubmit={onSubmit}
            isUpdating={isUpdating}
          />
        </CardContent>
      </Card>
    </div>
  );
}
