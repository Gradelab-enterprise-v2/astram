import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClasses } from "@/hooks/use-classes";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useStudents } from "@/hooks/use-students";
import { useSubjects } from "@/hooks/use-subjects";
import { fetchStudentsEnrolledInClassSubjects } from "@/hooks/students/student-api";
import { Plus, Trash2, Edit } from "lucide-react";
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

export default function Classes() {
  const navigate = useNavigate();
  const { classes, isLoading, refetchClasses, deleteClass } = useClasses();
  const { fetchStudentsByClass } = useStudents();
  const { getSubjectsByClassId } = useSubjects();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [classesWithCounts, setClassesWithCounts] = useState([]);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  const grades = [...new Set(classes
    .filter(cls => cls.grade !== undefined)
    .map(cls => cls.grade?.toString() || ""))]
    .filter(Boolean)
    .sort((a, b) => parseInt(a) - parseInt(b));
  
  const loadCountsData = useCallback(async () => {
    if (classes.length === 0) {
      setLoadingCounts(false);
      setClassesWithCounts([]);
      return;
    }
    
    setLoadingCounts(true);
    
    try {
      const classesWithAdditionalData = await Promise.all(
        classes.map(async (cls) => {
          try {
            const students = await fetchStudentsEnrolledInClassSubjects(cls.id);
            const subjects = await getSubjectsByClassId(cls.id);
            
            return {
              ...cls,
              studentCount: students?.length || 0,
              subjectCount: subjects?.length || 0
            };
          } catch (error) {
            console.error(`Error loading counts for class ${cls.id}:`, error);
            return {
              ...cls,
              studentCount: 0,
              subjectCount: 0
            };
          }
        })
      );
      
      setClassesWithCounts(classesWithAdditionalData);
    } catch (error) {
      console.error("Error loading class counts:", error);
      toast.error("Failed to load class details");
    } finally {
      setLoadingCounts(false);
      setIsInitialLoad(false);
    }
  }, [classes, getSubjectsByClassId]);
  
  useEffect(() => {
    loadCountsData();
  }, [loadCountsData]);
  
  useEffect(() => {
    if (isInitialLoad) {
      refetchClasses();
    }
  }, [refetchClasses, isInitialLoad]);
  
  const filteredClasses = classesWithCounts.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (cls.teacher?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         cls.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === "all" || cls.grade?.toString() === selectedGrade;
    
    return matchesSearch && matchesGrade;
  });

  const handleExport = () => {
    toast.info("Export functionality will be implemented soon");
  };

  const handleAddClass = () => {
    navigate("/classes/new");
  };

  const handleRowClick = (classId) => {
    navigate(`/classes/${classId}`);
  };
  
  const handleDeleteClass = (classId, e) => {
    e.stopPropagation();
    setClassToDelete(classId);
  };

  const confirmDelete = () => {
    if (classToDelete) {
      deleteClass(classToDelete, {
        onSuccess: () => {
          toast.success("Class deleted successfully");
          setClassToDelete(null);
        },
        onError: (error) => {
          toast.error(`Failed to delete class: ${error.message}`);
          setClassToDelete(null);
        },
      });
    }
  };

  const cancelDelete = () => {
    setClassToDelete(null);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Classes</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport}>Export</Button>
          <Button onClick={handleAddClass}>
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        </div>
      </div>
      
      <div className="bg-card border rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Class Management</h2>
            <p className="text-muted-foreground text-sm">View and manage all classes</p>
          </div>
          
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-2/3"
            />
            <div className="flex flex-1 space-x-4">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || loadingCounts ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                        <span>Loading classes...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredClasses.length > 0 ? (
                  filteredClasses.map((cls) => (
                    <TableRow 
                      key={cls.id} 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleRowClick(cls.id)}
                    >
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.studentCount || 0}</TableCell>
                      <TableCell>{cls.subjectCount || 0}</TableCell>
                      <TableCell>{cls.year || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/classes/${cls.id}/edit`);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => handleDeleteClass(cls.id, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Class</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this class? This action cannot be undone and will remove all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No classes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={classToDelete !== null} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this class? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
