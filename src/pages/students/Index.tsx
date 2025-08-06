
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useStudents } from "@/hooks/use-students";
import { useClasses } from "@/hooks/use-classes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const { students, isLoading, deleteStudent } = useStudents();
  const { classes, isLoading: classesLoading } = useClasses();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Students | Eduon";
  }, []);

  const filterStudents = () => {
    const studentsArray = Array.isArray(students) ? students : [];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return studentsArray.filter(student => 
        student.name?.toLowerCase().includes(query) || 
        student.gr_number?.toLowerCase().includes(query)
      );
    }
    
    if (filterClass && filterClass !== "all") {
      return studentsArray.filter(student => 
        student.class?.name === filterClass
      );
    }
    
    return studentsArray;
  };

  const filteredStudents = filterStudents();

  const handleDelete = (studentId: string) => {
    setStudentToDelete(studentId);
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      deleteStudent(studentToDelete, {
        onSuccess: () => {
          toast.success("Student deleted successfully");
          setStudentToDelete(null);
        },
        onError: (error) => {
          toast.error(`Failed to delete student: ${error.message}`);
          setStudentToDelete(null);
        },
      });
    }
  };

  const cancelDelete = () => {
    setStudentToDelete(null);
  };

  const handleRowClick = (studentId: string) => {
    navigate(`/students/${studentId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <Button asChild>
          <Link to="/students/new" className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            View, search, and manage all students
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="md:flex gap-4 items-center mb-4 px-6">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="class-filter">Filter by Class</Label>
              <Select
                value={filterClass}
                onValueChange={(value) => setFilterClass(value)}
              >
                <SelectTrigger id="class-filter">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classesLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    classes?.map((cls) => (
                      <SelectItem key={cls.id} value={cls.name}>
                        {cls.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-300px)]">
            {isLoading ? (
              <div className="p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 py-2">
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                    <Skeleton className="h-5" />
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableCaption>A list of your students.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>GR Number</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow 
                      key={student.id} 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleRowClick(student.id)}
                    >
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.gr_number}</TableCell>
                      <TableCell>{student.roll_number}</TableCell>
                      <TableCell>{student.class?.name}</TableCell>
                      <TableCell className="text-right font-medium" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/students/${student.id}/edit`);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(student.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the student from our
                                  servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={cancelDelete}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDelete}>
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={studentToDelete !== null} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
