
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, BarChart, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTests } from "@/hooks/use-tests";
import { useStudents } from "@/hooks/use-students";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { StudentTestInfo } from "@/components/auto-grade/report/StudentTestInfo";
import { QuestionAnalysis } from "@/components/auto-grade/report/QuestionAnalysis";
import { generatePDF } from "@/components/auto-grade/report/PdfGenerator";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuestionPaperView } from "@/components/auto-grade/QuestionPaperView";

export default function EvaluationReport() {
  const { testId, studentId } = useParams();
  const navigate = useNavigate();
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [userFeedback, setUserFeedback] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getTestById } = useTests();
  const { getStudentById } = useStudents();
  const [test, setTest] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const { user } = useAuth();
  const [classmates, setClassmates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"text" | "paper">("text");

  useEffect(() => {
    const fetchEvaluationResult = async () => {
      if (!testId || !studentId) return;

      try {
        setIsLoading(true);
        
        // Fetch the test details
        const testData = await getTestById(testId);
        setTest(testData);
        
        // Fetch the student details
        const studentData = await getStudentById(studentId);
        setStudent(studentData);
        
        // Fetch students with evaluation results for this test
        if (testData && testData.subject_id) {
          const { data: evaluatedStudents } = await supabase
            .from("auto_grade_status")
            .select("student_id, status, score")
            .eq("test_id", testId)
            .eq("status", "completed");
            
          if (evaluatedStudents && evaluatedStudents.length > 0) {
            const studentIds = evaluatedStudents.map(item => item.student_id);
            const { data: studentsData } = await supabase
              .from("students")
              .select("*")
              .in("id", studentIds)
              .eq("subject_id", testData.subject_id);
              
            if (studentsData) {
              setClassmates(studentsData);
            }
          }
        }
        
        // Fetch evaluation result from auto_grade_status
        const { data, error } = await supabase
          .from("auto_grade_status")
          .select("evaluation_result, status, score, user_feedback")
          .eq("test_id", testId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data || !data.evaluation_result || data.status !== 'completed') {
          toast.error("No evaluation result found for this student");
          return;
        }

        setEvaluationResult(data.evaluation_result);
        setUserFeedback(data.user_feedback || {});

        // If there's evaluation data but test_results doesn't have it, save it there too
        if (data.evaluation_result && data.score) {
          try {
            await supabase
              .from("test_results")
              .upsert({
                test_id: testId,
                student_id: studentId,
                marks_obtained: data.score,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'student_id,test_id',
                ignoreDuplicates: false
              });
          } catch (error) {
            console.error("Error ensuring test result:", error);
          }
        }
      } catch (error) {
        console.error("Error fetching evaluation result:", error);
        toast.error("Failed to load evaluation result");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvaluationResult();
  }, [testId, studentId, getTestById, getStudentById]);

  const handleBack = () => {
    navigate(`/auto-grade/evaluate?test=${testId}`);
  };

  const handleDownloadPDF = () => {
    if (!evaluationResult || !test || !student) return;
    generatePDF(evaluationResult, test, student, userFeedback);
  };
  
  const handleViewSummary = () => {
    navigate(`/auto-grade/assessment-summary/${testId}/${studentId}`);
  };

  const navigateToStudent = (newStudentId: string) => {
    if (newStudentId === studentId) return;
    navigate(`/auto-grade/evaluation-report/${testId}/${newStudentId}`);
  };

  const filteredClassmates = classmates.filter(mate => 
    mate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (mate.roll_no && mate.roll_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!evaluationResult) {
    return (
      <div className="container mx-auto py-8">
        <Button 
          variant="outline" 
          className="mb-6"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Evaluation
        </Button>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold">No Evaluation Result Found</h3>
              <p className="text-muted-foreground mt-2">
                The evaluation result for this student is not available.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate total score
  const totalEarned = evaluationResult.answers.reduce((sum: number, answer: any) => sum + answer.score[0], 0);
  const totalPossible = evaluationResult.answers.reduce((sum: number, answer: any) => sum + answer.score[1], 0);
  const percentageScore = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  const handleToggleView = () => {
    setViewMode(viewMode === "text" ? "paper" : "text");
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Evaluation
        </Button>
        
        <div className="space-x-2">
          <Button 
            variant="outline"
            onClick={handleViewSummary}
          >
            <BarChart className="h-4 w-4 mr-2" />
            View Summary
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleDownloadPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>
              {test?.subject?.name || ""} - {test?.title || "Evaluation Report"}
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
              
              <Select
                value={studentId}
                onValueChange={navigateToStudent}
              >
                <SelectTrigger className="w-full sm:w-60">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-72">
                    {filteredClassmates.length > 0 ? (
                      filteredClassmates.map((mate) => (
                        <SelectItem key={mate.id} value={mate.id}>
                          {mate.name} {mate.roll_no ? `(${mate.roll_no})` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-muted-foreground">
                        No students found
                      </div>
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StudentTestInfo 
            studentName={evaluationResult.student_name}
            rollNumber={evaluationResult.roll_no}
            className={evaluationResult.class}
            subjectName={evaluationResult.subject}
            testTitle={test?.title}
            totalEarned={totalEarned}
            totalPossible={totalPossible}
            percentageScore={percentageScore}
          />
          
          <Separator className="my-6" />
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Question-wise Analysis</h3>
            
            <Button 
              variant="outline" 
              onClick={handleToggleView}
              className="text-sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              {viewMode === "text" ? "Paper View" : "Text View"}
            </Button>
          </div>
          
          {viewMode === "text" ? (
            <QuestionAnalysis 
              answers={evaluationResult.answers}
              userFeedback={userFeedback}
              userEmail={user?.email}
            />
          ) : (
            <div className="mb-6">
              <QuestionPaperView
                studentId={studentId || ""}
                testId={testId || ""}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
