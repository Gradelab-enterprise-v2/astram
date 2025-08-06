
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function useAutoGradeMutations(selectedTestId: string) {
  const queryClient = useQueryClient();

  const saveAutoGradeStatusMutation = useMutation({
    mutationFn: async (status: {
      student_id: string;
      test_id: string;
      answer_sheet_id?: string;
      status: string;
      score?: number;
      feedback?: string;
      evaluation_result?: any;
      user_feedback?: {[key: number]: string};
    }) => {
      // Use upsert instead of insert to handle duplicate student_id + test_id combination
      const { data, error } = await supabase
        .from("auto_grade_status")
        .upsert({
          student_id: status.student_id,
          test_id: status.test_id,
          answer_sheet_id: status.answer_sheet_id,
          status: status.status,
          score: status.score,
          feedback: status.feedback,
          evaluation_result: status.evaluation_result,
          user_feedback: status.user_feedback,
          updated_at: new Date().toISOString()
        }, {
          // Specify the conflict target - on conflict of the unique constraint, update the record
          onConflict: 'student_id,test_id',
          // These are the fields to update when there's a conflict
          ignoreDuplicates: false
        })
        .select();
          
      if (error) {
        console.error("Error updating auto grade status:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-grade", "status", selectedTestId] });
    }
  });

  return {
    saveAutoGradeStatusMutation
  };
}
