
import { getStudentAnswerSheet, getAnswerSheetById } from "@/services/student-sheets/student-sheets-api";
import { useStudentSheetsQueries } from "@/hooks/student-sheets/use-student-sheets-queries";
import { StudentAnswerSheet } from "@/types/student-sheets";

export type { StudentAnswerSheet } from "@/types/student-sheets";

export function useStudentSheets() {
  const { 
    useStudentAnswerSheet, 
    useUploadAnswerSheet, 
    useExtractText 
  } = useStudentSheetsQueries();

  return {
    // Direct API functions
    getStudentAnswerSheet,
    getAnswerSheetById,
    
    // React Query hooks
    useStudentAnswerSheet,
    useUploadAnswerSheet,
    useExtractText
  };
}
