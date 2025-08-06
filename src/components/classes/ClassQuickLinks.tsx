
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, BookOpen } from "lucide-react";
import { useStudents } from "@/hooks/use-students";
import { useSubjects } from "@/hooks/use-subjects";

interface ClassQuickLinksProps {
  classId: string;
}

export function ClassQuickLinks({ classId }: ClassQuickLinksProps) {
  const navigate = useNavigate();
  const { fetchStudentsByClass } = useStudents();
  const { getSubjectsByClassId } = useSubjects();
  
  const [studentCount, setStudentCount] = useState<number>(0);
  const [subjectCount, setSubjectCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!classId || !isMounted) return;
      
      setLoading(true);
      setHasError(false);
      
      try {
        // Load students with error handling
        let studentsCount = 0;
        try {
          const students = await fetchStudentsByClass(classId);
          if (isMounted) {
            studentsCount = students?.length || 0;
            setStudentCount(studentsCount);
          }
        } catch (error) {
          console.error("Error loading students count:", error);
          if (isMounted) setStudentCount(0);
        }
        
        // Load subjects with error handling
        let subjectsCount = 0;
        try {
          const subjects = await getSubjectsByClassId(classId);
          if (isMounted) {
            subjectsCount = subjects?.length || 0;
            setSubjectCount(subjectsCount);
          }
        } catch (error) {
          console.error("Error loading subjects count:", error);
          if (isMounted) setSubjectCount(0);
        }
      } catch (error) {
        console.error("Error loading class stats:", error);
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    if (classId) {
      loadData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [classId, fetchStudentsByClass, getSubjectsByClassId]);
  
  const handleNavigateToTests = () => {
    navigate(`/tests?class=${classId}`);
  };

  const handleNavigateToStudents = () => {
    navigate(`/classes/${classId}`, { state: { activeTab: "students" } });
  };

  const handleNavigateToSubjects = () => {
    navigate(`/classes/${classId}`, { state: { activeTab: "subjects" } });
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Class Summary</CardTitle>
        <CardDescription>Quick overview and useful links</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button 
          variant="outline" 
          className="flex items-center justify-start h-24 p-4" 
          onClick={handleNavigateToTests}
        >
          <FileText className="h-8 w-8 mr-4" />
          <div className="text-left">
            <p className="font-semibold">Tests</p>
            <p className="text-sm text-muted-foreground">Create tests for this class</p>
          </div>
        </Button>
        
        <Button 
          variant="outline"
          className="flex items-center justify-start h-24 p-4" 
          onClick={handleNavigateToStudents}
        >
          <div className="flex items-center w-full">
            <Users className="h-8 w-8 mr-4 text-blue-500" />
            <div className="text-left">
              <p className="font-semibold">Students</p>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : hasError ? (
                <p className="text-sm text-red-500">Error loading data</p>
              ) : (
                <p className="text-xl font-bold">{studentCount}</p>
              )}
            </div>
          </div>
        </Button>
        
        <Button 
          variant="outline"
          className="flex items-center justify-start h-24 p-4" 
          onClick={handleNavigateToSubjects}
        >
          <div className="flex items-center w-full">
            <BookOpen className="h-8 w-8 mr-4 text-green-500" />
            <div className="text-left">
              <p className="font-semibold">Subjects</p>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : hasError ? (
                <p className="text-sm text-red-500">Error loading data</p>
              ) : (
                <p className="text-xl font-bold">{subjectCount}</p>
              )}
            </div>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
}
