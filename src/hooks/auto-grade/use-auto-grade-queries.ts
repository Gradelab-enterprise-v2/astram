
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useStudents } from "@/hooks/use-students";
import { useTestPapers } from "@/hooks/use-test-papers";
import { StudentGradingStatus } from "./types";

export function useAutoGradeQueries(selectedTestId: string, selectedSubjectId: string) {
  const { fetchStudentsBySubject } = useStudents();
  const { usePapersByTest } = useTestPapers();

  // Fetch students for the selected subject
  const studentsQuery = useQuery({
    queryKey: ["students", "subject", selectedSubjectId],
    queryFn: () => fetchStudentsBySubject(selectedSubjectId),
    enabled: !!selectedSubjectId,
    staleTime: 60000,
    refetchOnWindowFocus: false
  });

  // Fetch test papers for the selected test
  const testPapersQuery = usePapersByTest(selectedTestId);

  // Fetch grading status data from database
  const gradingDataQuery = useQuery({
    queryKey: ["auto-grade", "status", selectedTestId],
    queryFn: async () => {
      if (!selectedTestId) return [];
      
      const { data, error } = await supabase
        .from("auto_grade_status")
        .select(`
          student_id,
          test_id,
          answer_sheet_id,
          status,
          score,
          feedback,
          evaluation_result,
          user_feedback
        `)
        .eq("test_id", selectedTestId);
      
      if (error) {
        console.error("Error fetching auto grade status:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!selectedTestId,
    staleTime: 30000,
    refetchInterval: false, // Don't automatically refetch data at intervals
    refetchOnWindowFocus: false // Don't refetch when window gains focus
  });

  return {
    studentsQuery,
    testPapersQuery,
    gradingDataQuery
  };
}
