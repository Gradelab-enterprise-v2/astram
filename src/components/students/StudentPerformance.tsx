import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BookOpen, FileText, ChevronRight, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StudentPerformanceProps {
  studentId: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Test {
  id: string;
  title: string;
  max_marks: number;
  created_at: string;
  auto_grade_status: {
    id: string;
    status: string;
    score: number;
    evaluation_result: any;
  }[];
}

interface SubjectData {
  subject: Subject;
  tests: Test[];
}

interface Enrollment {
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

export function StudentPerformance({ studentId }: StudentPerformanceProps) {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Fetch subjects with graded tests
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["student-subjects", studentId],
    queryFn: async () => {
      // First, get all subjects the student is enrolled in
      const { data: enrollments, error: enrollmentError } = await supabase
        .from("subject_enrollments")
        .select(`
          subject:subjects (
            id,
            name,
            code
          )
        `)
        .eq("student_id", studentId);

      if (enrollmentError) throw enrollmentError;

      // For each subject, get the tests and their grading status
      const subjectsWithTests = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          const subject = enrollment.subject;
          
          // Get tests for this subject
          const { data: tests, error: testsError } = await supabase
            .from("tests")
            .select(`
              id,
              title,
              max_marks,
              created_at,
              auto_grade_status!inner (
                id,
                status,
                score,
                evaluation_result
              )
            `)
            .eq("subject_id", subject.id)
            .eq("auto_grade_status.student_id", studentId)
            .eq("auto_grade_status.status", "completed");

          if (testsError) throw testsError;

          return {
            subject,
            tests: tests || []
          } as SubjectData;
        })
      );

      return subjectsWithTests;
    }
  });

  if (subjectsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {subjects?.map((subjectData: any) => {
              const subject = subjectData.subject;
              const tests = subjectData.tests;
              
              if (!tests || tests.length === 0) return null;

              return (
                <Card key={subject.id} className="overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedSubject(selectedSubject === subject.id ? null : subject.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-medium">{subject.name}</h3>
                          <p className="text-sm text-muted-foreground">{subject.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          {tests.length} Graded
                        </Badge>
                        <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedSubject === subject.id ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {selectedSubject === subject.id && (
                    <div className="border-t p-4 space-y-4">
                      <h4 className="font-medium">Graded Tests</h4>
                      <div className="grid gap-2">
                        {tests.map((test: any) => {
                          const gradeStatus = test.auto_grade_status[0];
                          const score = gradeStatus.score;
                          const totalMarks = test.max_marks;
                          const percentage = (score / totalMarks) * 100;
                          const grade = getGradeFromPercentage(percentage);
                          const testDate = new Date(test.created_at).toLocaleDateString();

                          return (
                            <Card key={test.id} className="overflow-hidden">
                              <div 
                                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => navigate(`/auto-grade/evaluation/${test.id}/${studentId}`)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <div>
                                      <p className="font-medium">{test.title}</p>
                                      <div className="text-sm text-muted-foreground space-y-1">
                                        <p>Score: {score}/{totalMarks} ({percentage.toFixed(1)}%)</p>
                                        <p>Date: {testDate}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className={getGradeBadgeColor(grade)}>
                                    {grade}
                                  </Badge>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {(!subjects || subjects.length === 0) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No graded tests available for this student.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getGradeFromPercentage(percentage: number): string {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B+";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "B-";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function getGradeBadgeColor(grade: string) {
  switch (grade) {
    case "A":
      return "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
    case "B+":
    case "B":
    case "B-":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200";
    case "C":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200";
    case "D":
      return "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200";
    case "F":
      return "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200";
  }
} 