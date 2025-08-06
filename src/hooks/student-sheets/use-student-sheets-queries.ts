
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  getStudentAnswerSheet, 
  uploadAnswerSheet, 
  extractTextFromSheet 
} from "@/services/student-sheets/student-sheets-api";
import { StudentAnswerSheet, UploadAnswerSheetParams } from "@/types/student-sheets";

export function useStudentSheetsQueries() {
  const queryClient = useQueryClient();

  // Hook to fetch a specific student's answer sheet
  const useStudentAnswerSheet = (studentId: string, testId: string) => {
    return useQuery({
      queryKey: ["student-answer-sheet", studentId, testId],
      queryFn: () => getStudentAnswerSheet(studentId, testId),
      enabled: !!studentId && !!testId,
      staleTime: 30000, // Cache data for 30 seconds to reduce db load
    });
  };

  // Use mutation for uploading answer sheet
  const useUploadAnswerSheet = () => {
    return useMutation({
      mutationFn: uploadAnswerSheet,
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["student-answer-sheet", data.student_id, data.test_id] });
        queryClient.invalidateQueries({ queryKey: ["auto-grade", "status"] });
        toast.success("Answer sheet uploaded successfully");
      },
      onError: (error: Error) => {
        toast.error(`Failed to upload answer sheet: ${error.message}`);
      }
    });
  };

  // Use mutation for extracting text
  const useExtractText = () => {
    return useMutation({
      mutationFn: extractTextFromSheet,
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["student-answer-sheet", data.student_id, data.test_id] });
        queryClient.invalidateQueries({ queryKey: ["auto-grade", "status"] });
        toast.success("Text extracted successfully");
      },
      onError: (error: Error) => {
        toast.error(`Failed to extract text: ${error.message}`);
        // Invalidate queries to show updated error status
        queryClient.invalidateQueries({ queryKey: ["student-answer-sheet"] });
        queryClient.invalidateQueries({ queryKey: ["auto-grade", "status"] });
      }
    });
  };

  return {
    useStudentAnswerSheet,
    useUploadAnswerSheet,
    useExtractText
  };
}
