
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudents } from "@/hooks/use-students";
import { useClasses } from "@/hooks/use-classes";
import { StudentForm } from "@/components/students/StudentForm";
import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction } from "@/components/ui/alert-dialog";

export default function NewStudent() {
  const navigate = useNavigate();
  const { createStudent, isCreating } = useStudents();
  const { classes } = useClasses();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const onSubmit = (data: any) => {
    createStudent(data, {
      onSuccess: () => setShowConfirmation(true)
    });
  };

  const onCancel = () => {
    navigate("/students");
  };

  return (
    <div className="space-y-6 animate-page-transition-in">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate("/students")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
          <CardDescription>Enter details for the new student or import via CSV</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <StudentForm 
            classes={classes}
            onSubmit={onSubmit}
            isUpdating={false}
            isCreating={isCreating}
            returnPath="/students"
            onCancel={onCancel}
          />
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Student Added</AlertDialogTitle>
            <AlertDialogDescription>
              The student has been added successfully. You will be redirected to the students list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate("/students", { replace: true })}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
