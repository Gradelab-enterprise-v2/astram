
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Student } from "@/types/academics";
import { AddStudentToClassDialog } from "./AddStudentToClassDialog";
import { toast } from "sonner";

interface ClassStudentsTabProps {
  classId: string;
  students: Student[];
  unassignedStudents: Student[];
  loadingUnassigned: boolean;
  onAddStudentsToClass: (selectedStudents: string[]) => Promise<void>;
}

export function ClassStudentsTab({
  classId,
  students,
  unassignedStudents,
  loadingUnassigned,
  onAddStudentsToClass
}: ClassStudentsTabProps) {
  const navigate = useNavigate();
  const [isAddingStudents, setIsAddingStudents] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const handleSuccess = () => {
    // This will trigger a refetch in the parent component
    setRefreshTrigger(prev => prev + 1);
    // Also call the onAddStudentsToClass callback (which might be used by parent components)
    onAddStudentsToClass([]);
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Students</CardTitle>
          <CardDescription>Manage students enrolled in this class</CardDescription>
        </div>
        <Dialog open={isAddingStudents} onOpenChange={setIsAddingStudents}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Students
            </Button>
          </DialogTrigger>
          <AddStudentToClassDialog 
            classId={classId}
            onClose={() => setIsAddingStudents(false)}
            onSuccess={handleSuccess}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {students.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>GR Number</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.gr_number}</TableCell>
                    <TableCell>{student.roll_number}</TableCell>
                    <TableCell>{student.year}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${student.id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No students enrolled in this class yet.
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAddingStudents(true)}
              >
                Add Students
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
