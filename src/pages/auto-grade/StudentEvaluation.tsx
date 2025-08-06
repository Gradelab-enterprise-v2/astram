import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTests } from "@/hooks/use-tests";
import { useStudents } from "@/hooks/use-students";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ArrowLeft, FileText, BarChart } from "lucide-react";
import { EvaluationHeader } from "@/components/auto-grade/evaluation/EvaluationHeader";
import { QuestionNavigator } from "@/components/auto-grade/evaluation/QuestionNavigator";
import { AnswerDisplay } from "@/components/auto-grade/evaluation/AnswerDisplay";
import { GradingPanel } from "@/components/auto-grade/evaluation/GradingPanel";
import { StudentSelectionDialog } from "@/components/auto-grade/evaluation/StudentSelectionDialog";
import { MobileQuestionNavigator } from "@/components/auto-grade/evaluation/MobileQuestionNavigator";
import { useAuth } from "@/context/AuthContext";

export default function StudentEvaluation() {
  const { testId, studentId } = useParams<{ testId: string, studentId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [testDetails, setTestDetails] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [evaluationData, setEvaluationData] = useState<any>(null);
  const [classmates, setClassmates] = useState<any[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState<number>(-1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userScore, setUserScore] = useState<number>(0);
  const [userFeedback, setUserFeedback] = useState<string>("");
  const [activeTab, setActiveTab] = useState("ai-analysis");
  const [viewMode, setViewMode] = useState<"text" | "paper">("text");
  const [savedFeedback, setSavedFeedback] = useState<{[key: number]: string}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showQuestionNavigator, setShowQuestionNavigator] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  
  const { getTestById } = useTests();
  const { getStudentById, fetchStudentsBySubject } = useStudents();
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        if (testId) {
          const test = await getTestById(testId);
          setTestDetails(test);
          
          if (studentId) {
            const student = await getStudentById(studentId);
            setStudentDetails(student);
            
            if (test.subject_id) {
              const subjectStudents = await fetchStudentsBySubject(test.subject_id);
              setClassmates(subjectStudents);
              
              const index = subjectStudents.findIndex(s => s.id === studentId);
              setCurrentStudentIndex(index);
            }
            
            const { data, error } = await supabase
              .from("auto_grade_status")
              .select("*")
              .eq("test_id", testId)
              .eq("student_id", studentId)
              .maybeSingle();
              
            if (error) {
              console.error("Error fetching evaluation data:", error);
              toast.error("Failed to load evaluation data");
            } else if (data) {
              setEvaluationData(data);
              
              if (data.user_feedback) {
                setSavedFeedback(data.user_feedback);
              }
              
              if (data.evaluation_result?.answers && 
                  data.evaluation_result.answers.length > 0 && 
                  currentQuestionIndex < data.evaluation_result.answers.length) {
                const question = data.evaluation_result.answers[currentQuestionIndex];
                setUserScore(question.score[0]);
                
                if (data.user_feedback && data.user_feedback[currentQuestionIndex]) {
                  setUserFeedback(data.user_feedback[currentQuestionIndex]);
                } else {
                  setUserFeedback("");
                }
              }
              
              if (data.status !== "completed") {
                toast.warning("This evaluation is not complete", {
                  description: `Current status: ${data.status}`
                });
              }
            } else {
              toast.warning("No evaluation data found for this student");
            }
            
            try {
              const { data: viewPref } = await supabase
                .from("question_view_preferences")
                .select("view_mode")
                .eq("user_id", user?.id)
                .eq("student_id", studentId)
                .eq("test_id", testId)
                .eq("question_index", currentQuestionIndex)
                .maybeSingle();
                
              if (viewPref?.view_mode) {
                setViewMode(viewPref.view_mode as "text" | "paper");
              }
            } catch (error) {
              console.error("Error fetching view preference:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching details:", error);
        toast.error("Failed to load details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [testId, studentId]);
  
  useEffect(() => {
    if (evaluationData?.evaluation_result?.answers && 
        currentQuestionIndex < evaluationData.evaluation_result.answers.length) {
      
      const question = evaluationData.evaluation_result.answers[currentQuestionIndex];
      setUserScore(question.score[0]);
      
      if (savedFeedback && savedFeedback[currentQuestionIndex]) {
        setUserFeedback(savedFeedback[currentQuestionIndex]);
      } else {
        setUserFeedback("");
      }
      
      const loadViewPreference = async () => {
        try {
          const { data: viewPref } = await supabase
            .from("question_view_preferences")
            .select("view_mode")
            .eq("user_id", user?.id)
            .eq("student_id", studentId)
            .eq("test_id", testId)
            .eq("question_index", currentQuestionIndex)
            .maybeSingle();
            
          if (viewPref?.view_mode) {
            setViewMode(viewPref.view_mode as "text" | "paper");
          } else {
            setViewMode("text");
          }
        } catch (error) {
          console.error("Error fetching view preference:", error);
        }
      };
      
      loadViewPreference();
    }
  }, [currentQuestionIndex, evaluationData, savedFeedback, studentId, testId]);
  
  const navigateToStudent = (direction: "prev" | "next") => {
    if (classmates.length === 0 || currentStudentIndex === -1) return;
    
    let newIndex;
    if (direction === "prev") {
      newIndex = currentStudentIndex > 0 ? currentStudentIndex - 1 : classmates.length - 1;
    } else {
      newIndex = currentStudentIndex < classmates.length - 1 ? currentStudentIndex + 1 : 0;
    }
    
    navigate(`/auto-grade/evaluation/${testId}/${classmates[newIndex].id}`);
  };
  
  const navigateToQuestion = (direction: "prev" | "next") => {
    if (!evaluationData?.evaluation_result?.answers) return;
    
    const questions = evaluationData.evaluation_result.answers;
    let newIndex;
    
    if (direction === "prev") {
      newIndex = currentQuestionIndex > 0 ? currentQuestionIndex - 1 : questions.length - 1;
    } else {
      newIndex = currentQuestionIndex < questions.length - 1 ? currentQuestionIndex + 1 : 0;
    }
    
    setCurrentQuestionIndex(newIndex);
  };
  
  const handleBackToDashboard = () => {
    navigate(`/auto-grade/evaluate?class=${testDetails?.class_id}&subject=${testDetails?.subject_id}&test=${testId}`);
  };
  
  const handleViewModeChange = async (mode: "text" | "paper") => {
    setViewMode(mode);
    
    try {
      await supabase
        .from("question_view_preferences")
        .upsert({
          user_id: user?.id,
          student_id: studentId,
          test_id: testId,
          question_index: currentQuestionIndex,
          view_mode: mode,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,student_id,test_id,question_index'
        });
    } catch (error) {
      console.error("Error saving view preference:", error);
    }
  };
  
  const handleSaveEvaluation = async () => {
    if (!evaluationData?.evaluation_result?.answers) return;
    
    setIsSaving(true);
    
    try {
      const updatedEvaluationResult = { ...evaluationData.evaluation_result };
      updatedEvaluationResult.answers[currentQuestionIndex].score[0] = userScore;
      
      const updatedFeedback = {
        ...savedFeedback,
        [currentQuestionIndex]: userFeedback
      };
      setSavedFeedback(updatedFeedback);
      
      const totalEarned = updatedEvaluationResult.answers.reduce(
        (sum: number, answer: any) => sum + answer.score[0], 
        0
      );
      
      await supabase
        .from("auto_grade_status")
        .update({
          evaluation_result: updatedEvaluationResult,
          user_feedback: updatedFeedback,
          score: totalEarned,
          updated_at: new Date().toISOString()
        })
        .eq("test_id", testId)
        .eq("student_id", studentId);
      
      await supabase
        .from("test_results")
        .upsert({
          test_id: testId,
          student_id: studentId,
          marks_obtained: totalEarned,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,test_id',
          ignoreDuplicates: false
        });
      
      toast.success("Evaluation saved", {
        description: "Your changes have been saved successfully"
      });
      
      setEvaluationData({
        ...evaluationData,
        evaluation_result: updatedEvaluationResult,
        user_feedback: updatedFeedback,
        score: totalEarned
      });
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("Failed to save evaluation");
    } finally {
      setIsSaving(false);
    }
  };
  
  const getCurrentQuestion = () => {
    if (!evaluationData?.evaluation_result?.answers || 
        evaluationData.evaluation_result.answers.length === 0) {
      return null;
    }
    
    const questions = evaluationData.evaluation_result.answers;
    if (currentQuestionIndex >= questions.length) {
      setCurrentQuestionIndex(0);
      return questions[0];
    }
    
    return questions[currentQuestionIndex];
  };
  
  const currentQuestion = getCurrentQuestion();
  const totalQuestions = evaluationData?.evaluation_result?.answers?.length || 0;
  
  const handleGoToSummary = () => {
    navigate(`/auto-grade/assessment-summary/${testId}/${studentId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground mt-4">Loading evaluation data...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-4 space-y-4">
      <EvaluationHeader 
        studentDetails={studentDetails}
        testDetails={testDetails}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        classmates={classmates}
        currentStudentIndex={currentStudentIndex}
        navigateToStudent={navigateToStudent}
        handleBackToDashboard={handleBackToDashboard}
        handleGoToSummary={handleGoToSummary}
        setShowStudentDialog={setShowStudentDialog}
        setShowQuestionNavigator={setShowQuestionNavigator}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Question Navigator - Now on the side for desktop */}
        <div className="hidden lg:block">
          <QuestionNavigator 
            evaluationData={evaluationData}
            currentQuestionIndex={currentQuestionIndex}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
          />
        </div>
        
        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Card>
            <AnswerDisplay 
              currentQuestion={currentQuestion}
              currentQuestionIndex={currentQuestionIndex}
              studentId={studentId || ""}
              testId={testId || ""}
              evaluationData={evaluationData}
              viewMode={viewMode}
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              handleViewModeChange={handleViewModeChange}
              navigateToQuestion={navigateToQuestion}
              totalQuestions={totalQuestions}
            />
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-2">
              <GradingPanel 
                currentQuestion={currentQuestion}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userFeedback={userFeedback}
                setUserFeedback={setUserFeedback}
                savedFeedback={savedFeedback}
                currentQuestionIndex={currentQuestionIndex}
              />
            </div>
            
            <Card>
              <div className="p-4 pt-6 space-y-6">
                <h3 className="text-lg font-semibold mb-4">Grading</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm font-medium">AI Suggested Score</p>
                      <p className="font-medium">{currentQuestion?.score[0]}/{currentQuestion?.score[1]}</p>
                    </div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm font-medium">Your Score</p>
                      <p className="font-medium">{userScore}/{currentQuestion?.score[1]}</p>
                    </div>
                    
                    <div className="py-6 px-2">
                      <input 
                        type="range"
                        min="0"
                        max={currentQuestion?.score[1] || 10}
                        step="1"
                        value={userScore}
                        onChange={(e) => setUserScore(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>0</span>
                      <span>{currentQuestion?.score[1] || 10}</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleSaveEvaluation}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Evaluation"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Student Selection Dialog */}
      <StudentSelectionDialog 
        showStudentDialog={showStudentDialog}
        setShowStudentDialog={setShowStudentDialog}
        studentSearchQuery={studentSearchQuery}
        setStudentSearchQuery={setStudentSearchQuery}
        filteredClassmates={classmates.filter(student => 
          student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
          (student.roll_no && student.roll_no.toLowerCase().includes(studentSearchQuery.toLowerCase()))
        )}
        studentId={studentId || ""}
        testId={testId || ""}
        navigate={navigate}
      />
      
      {/* Mobile Question Navigator Dialog */}
      <MobileQuestionNavigator 
        showQuestionNavigator={showQuestionNavigator}
        setShowQuestionNavigator={setShowQuestionNavigator}
        evaluationData={evaluationData}
        currentQuestionIndex={currentQuestionIndex}
        setCurrentQuestionIndex={setCurrentQuestionIndex}
      />
    </div>
  );
}
