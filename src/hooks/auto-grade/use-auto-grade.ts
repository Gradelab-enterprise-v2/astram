
import { useState, useEffect } from "react";
import { useStudents } from "@/hooks/use-students";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { StudentGradingStatus, EvaluationProgress } from "./types";
import { useAutoGradeQueries } from "./use-auto-grade-queries";
import { useAutoGradeMutations } from "./use-auto-grade-mutations";
import { evaluateStudent } from "./evaluation-service";

export function useAutoGrade() {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const { user } = useAuth();
  
  // Get queries and mutations
  const { studentsQuery, testPapersQuery, gradingDataQuery } = useAutoGradeQueries(selectedTestId, selectedSubjectId);
  const { saveAutoGradeStatusMutation } = useAutoGradeMutations(selectedTestId);
  
  // Destructure query results
  const students = studentsQuery.data || [];
  const testPapers = testPapersQuery.data || [];
  const storedGradingData = gradingDataQuery.data || [];
  const isLoadingStudents = studentsQuery.isLoading;
  const isLoadingPapers = testPapersQuery.isLoading;
  const isLoadingGradingData = gradingDataQuery.isLoading;

  const [studentGradingStatus, setStudentGradingStatus] = useState<StudentGradingStatus[]>([]);
  const [evaluationProgress, setEvaluationProgress] = useState<EvaluationProgress>({});
  const [uploadingStudents, setUploadingStudents] = useState<{[studentId: string]: boolean}>({});
  const [dataInitialized, setDataInitialized] = useState(false);

  // Initialize student grading status when data loads
  useEffect(() => {
    if (students.length > 0 && !isLoadingGradingData && storedGradingData && !dataInitialized) {
      const initialStatus = students.map(student => {
        const existingRecord = storedGradingData.find(
          (record: any) => record.student_id === student.id
        );
        
        if (existingRecord) {
          return {
            student,
            answerSheetId: existingRecord.answer_sheet_id,
            status: existingRecord.status as "pending" | "processing" | "completed" | "failed",
            score: existingRecord.score,
            feedback: existingRecord.feedback,
            evaluationResult: existingRecord.evaluation_result,
            userFeedback: existingRecord.user_feedback
          };
        }
        
        return {
          student,
          status: "pending" as const,
          answerSheetId: undefined,
          score: undefined,
          feedback: undefined,
          evaluationResult: undefined,
          userFeedback: undefined
        };
      });
      
      setStudentGradingStatus(initialStatus);
      setDataInitialized(true);
    }
  }, [students, storedGradingData, isLoadingGradingData, dataInitialized]);

  // Reset data initialization when test or subject changes
  useEffect(() => {
    setDataInitialized(false);
  }, [selectedTestId, selectedSubjectId]);

  // Wrapper for saveAutoGradeStatusMutation to make it compatible with the evaluateStudent function
  const saveAutoGradeStatus = async (data: any): Promise<any> => {
    return saveAutoGradeStatusMutation.mutateAsync(data);
  };

  // Wrapper for evaluateStudent to inject dependencies
  const evaluateStudentWrapper = async (studentId: string): Promise<boolean> => {
    return evaluateStudent(
      studentId, 
      selectedTestId, 
      studentGradingStatus, 
      students, 
      testPapers, 
      saveAutoGradeStatus, 
      setStudentGradingStatus,
      setEvaluationProgress
    );
  };

  const evaluateAll = async () => {
    toast.info("Starting evaluation for all students with uploaded answer sheets...");
    
    const studentsToEvaluate = studentGradingStatus.filter(status => 
      status.answerSheetId && status.status !== 'completed'
    );
    
    if (studentsToEvaluate.length === 0) {
      toast.info("No students with answer sheets to evaluate");
      return;
    }
    
    let successCount = 0;
    for (const status of studentsToEvaluate) {
      const success = await evaluateStudentWrapper(status.student.id);
      if (success) successCount++;
    }
    
    toast.success(`Evaluation completed for ${successCount} out of ${studentsToEvaluate.length} students`);
  };

  const getEvaluationProgress = (studentId: string): number => {
    return evaluationProgress[studentId] || 0;
  };

  const setStudentUploading = (studentId: string, isUploading: boolean) => {
    setUploadingStudents(prev => ({
      ...prev,
      [studentId]: isUploading
    }));
  };

  const isStudentUploading = (studentId: string): boolean => {
    return uploadingStudents[studentId] || false;
  };

  const hasQuestionPaper = testPapers.some(paper => paper.paper_type === "question");
  const hasAnswerKey = testPapers.some(paper => paper.paper_type === "answer");
  const canEvaluate = hasQuestionPaper && hasAnswerKey;

  return {
    selectedClassId,
    setSelectedClassId,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTestId,
    setSelectedTestId,
    students,
    isLoadingStudents,
    testPapers,
    isLoadingPapers,
    studentGradingStatus,
    isLoadingGradingData,
    evaluateStudent: evaluateStudentWrapper,
    evaluateAll,
    getEvaluationProgress,
    canEvaluate,
    hasQuestionPaper,
    hasAnswerKey,
    setStudentUploading,
    isStudentUploading
  };
}
