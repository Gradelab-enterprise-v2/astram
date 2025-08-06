
import React, { useState } from "react";
import { useStudents } from "@/hooks/use-students";
import { useClasses } from "@/hooks/use-classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Student } from "@/types/academics";
import { Checkbox } from "@/components/ui/checkbox";

interface UnassignedStudentsProps {
  onAssignStudents?: (selectedStudents: string[]) => Promise<void>;
  unassignedStudents?: Student[];
  loading?: boolean;
}

export function UnassignedStudents({ 
  onAssignStudents, 
  unassignedStudents: externalUnassignedStudents,
  loading: externalLoading 
}: UnassignedStudentsProps = {}) {
  const { useStudentsWithoutClass, updateStudent } = useStudents();
  const { classes } = useClasses();
  const { data: fetchedUnassignedStudents, isLoading: fetchLoading, refetch } = useStudentsWithoutClass();
  
  const unassignedStudents = externalUnassignedStudents || fetchedUnassignedStudents || [];
  const isLoading = externalLoading !== undefined ? externalLoading : fetchLoading;
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const handleAssignClass = async () => {
    if (!selectedStudentId || !selectedClassId) return;
    
    setIsAssigning(true);
    try {
      await updateStudent({
        id: selectedStudentId,
        class_id: selectedClassId
      });
      
      setDialogOpen(false);
      refetch();
    } catch (error) {
      console.error("Error assigning class:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssignDialog = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedClassId("");
    setDialogOpen(true);
  };

  const handleStudentSelect = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleAssignStudents = async () => {
    if (onAssignStudents && selectedStudents.length > 0) {
      await onAssignStudents(selectedStudents);
      setSelectedStudents([]);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!unassignedStudents || unassignedStudents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unassigned Students</CardTitle>
          <CardDescription>All students have been assigned to classes</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8 text-center">
          <div className="flex flex-col items-center space-y-2 text-muted-foreground">
            <AlertCircle className="h-10 w-10 opacity-50" />
            <p>No students without class assignment found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unassigned Students ({unassignedStudents.length})</CardTitle>
        <CardDescription>Students that need to be assigned to a class</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {onAssignStudents && <TableHead className="w-12">Select</TableHead>}
                <TableHead>Name</TableHead>
                <TableHead>GR Number</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unassignedStudents.map((student) => (
                <TableRow key={student.id}>
                  {onAssignStudents && (
                    <TableCell className="w-12">
                      <Checkbox 
                        checked={selectedStudents.includes(student.id)} 
                        onCheckedChange={(checked) => handleStudentSelect(student.id, !!checked)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.gr_number}</TableCell>
                  <TableCell>{student.roll_number}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openAssignDialog(student.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Assign Class
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {onAssignStudents && selectedStudents.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAssignStudents}>
              Add {selectedStudents.length} Student{selectedStudents.length > 1 ? 's' : ''} to Class
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Student to Class</DialogTitle>
            <DialogDescription>
              Select a class to assign this student to
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedClassId} value={selectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignClass} 
              disabled={!selectedClassId || isAssigning}
            >
              {isAssigning ? "Assigning..." : "Assign Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
