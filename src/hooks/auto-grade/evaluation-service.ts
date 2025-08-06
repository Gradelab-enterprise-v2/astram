import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/academics";
import { StudentGradingStatus, EvaluationProgress } from "./types";

export const evaluateStudent = async (
  studentId: string,
  testId: string,
  studentGradingStatus: StudentGradingStatus[],
  students: Student[],
  testPapers: any[],
  saveGradingStatus: (data: any) => Promise<any>,
  setStudentGradingStatus: React.Dispatch<React.SetStateAction<StudentGradingStatus[]>>,
  setEvaluationProgress: React.Dispatch<React.SetStateAction<EvaluationProgress>>
): Promise<boolean> => {
  // Find the student status
  const studentStatus = studentGradingStatus.find(s => s.student.id === studentId);
  
  if (!studentStatus) {
    toast.error("Student not found");
    return false;
  }
  
  if (!studentStatus.answerSheetId) {
    toast.error("No answer sheet uploaded for this student");
    return false;
  }
  
  // Check if the user can grade this student
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    toast.error("You must be logged in to evaluate students");
    return false;
  }
  
  // Find student, question paper and answer key data
  const student = students.find(s => s.id === studentId);
  const questionPaper = testPapers.find(p => p.paper_type === "question");
  const answerKey = testPapers.find(p => p.paper_type === "answer");
  
  if (!questionPaper || !questionPaper.extracted_text) {
    toast.error("Question paper not found or text extraction failed");
    return false;
  }
  
  if (!answerKey || !answerKey.extracted_text) {
    toast.error("Answer key not found or text extraction failed");
    return false;
  }
  
  try {
    // Update status to processing
    setStudentGradingStatus(prev => prev.map(s => {
      if (s.student.id === studentId) {
        return { ...s, status: "processing" };
      }
      return s;
    }));
    
    // Start with 0% progress
    setEvaluationProgress(prev => ({ ...prev, [studentId]: 0 }));
    
    // Save the status to the database
    await saveGradingStatus({
      student_id: studentId,
      test_id: testId,
      status: "processing",
      answer_sheet_id: studentStatus.answerSheetId
    });
    
    // Get student answer sheet data from supabase
    const { data: answerSheetData, error: sheetError } = await supabase
      .from("student_answer_sheets")
      .select("*")
      .eq("id", studentStatus.answerSheetId)
      .maybeSingle();
    
    if (sheetError || !answerSheetData) {
      throw new Error(sheetError?.message || "Answer sheet not found");
    }
    
    if (!answerSheetData.extracted_text) {
      throw new Error("Text extraction failed for the answer sheet");
    }
    
    // Simulate progress in steps
    const updateProgress = async () => {
      for (let progress = 10; progress <= 90; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setEvaluationProgress(prev => ({ ...prev, [studentId]: progress }));
      }
    };
    
    // Start the progress simulation
    updateProgress();
    
    // Call the evaluation edge function
    console.log("Calling test-evaluate-answer function...");
    const { data: evaluationData, error: functionError } = await supabase.functions.invoke(
      "test-evaluate-answer",
      {
        body: JSON.stringify({
          questionPaper: questionPaper.extracted_text,
          answerKey: answerKey.extracted_text,
          studentAnswerSheet: answerSheetData.extracted_text,
          studentInfo: {
            name: student?.name || "Unknown Student",
            rollNumber: student?.roll_number || "N/A",
            class: student?.class?.name || "N/A",
            subject: "N/A" // TODO: Get subject name if available
          },
          preserveRawExtractedText: true // Flag to preserve original extracted text
        }),
      }
    );
    
    if (functionError) {
      console.error("Function error:", functionError);
      throw new Error(`Evaluation function error: ${functionError.message}`);
    }
    
    if (!evaluationData) {
      throw new Error("No evaluation data returned");
    }
    
    console.log("Evaluation data received:", evaluationData);
    
    if (!evaluationData.success) {
      throw new Error(evaluationData.error || "Evaluation failed");
    }
    
    const result = evaluationData.evaluation;
    if (!result) {
      throw new Error("No evaluation result returned");
    }
    
    // Calculate total score
    const totalScore = result.answers.reduce((sum, answer) => sum + answer.score[0], 0);
    const totalPossible = result.answers.reduce((sum, answer) => sum + answer.score[1], 0);
    
    // Set progress to 100%
    setEvaluationProgress(prev => ({ ...prev, [studentId]: 100 }));
    
    
    // Update status to completed
    setStudentGradingStatus(prev => prev.map(s => {
      if (s.student.id === studentId) {
        return { 
          ...s, 
          status: "completed",
          score: totalScore,
          feedback: `Scored ${totalScore} out of ${totalPossible}`,
          evaluationResult: result
        };
      }
      return s;
    }));
    
    // Save the status to the database
    await saveGradingStatus({
      student_id: studentId,
      test_id: testId,
      status: "completed",
      answer_sheet_id: studentStatus.answerSheetId,
      score: totalScore,
      feedback: `Scored ${totalScore} out of ${totalPossible}`,
      evaluation_result: result
    });
    
    toast.success(`Evaluation completed for ${student?.name || "student"}`);
    return true;
    
  } catch (error: any) {
    console.error("Error evaluating student:", error);
    console.error("Error details:", error.stack);
    
    // Update status to failed
    setStudentGradingStatus(prev => prev.map(s => {
      if (s.student.id === studentId) {
        return { ...s, status: "failed", feedback: error.message };
      }
      return s;
    }));
    
    // Save the status to the database
    await saveGradingStatus({
      student_id: studentId,
      test_id: testId,
      status: "failed",
      answer_sheet_id: studentStatus.answerSheetId,
      feedback: error.message
    });
    
    toast.error(`Failed to evaluate student: ${error.message}`);
    return false;
  }
};
