
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Student } from "@/types/academics";

export interface TestResult {
  id: string;
  test_id: string;
  student_id: string;
  marks_obtained: number;
  created_at: string;
  updated_at: string;
  student?: Student;
}

export function useTestResults() {
  const queryClient = useQueryClient();

  const fetchResultsByTest = async (testId: string): Promise<TestResult[]> => {
    const { data, error } = await supabase
      .from("test_results")
      .select(`
        *,
        student:students(*)
      `)
      .eq("test_id", testId);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  };

  const getResultById = async (id: string): Promise<TestResult> => {
    const { data, error } = await supabase
      .from("test_results")
      .select(`
        *,
        student:students(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  const createResult = async (result: Omit<TestResult, "id" | "created_at" | "updated_at" | "student">): Promise<TestResult> => {
    const { data, error } = await supabase
      .from("test_results")
      .insert(result)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  const updateResult = async ({ id, ...result }: Partial<TestResult> & { id: string }): Promise<TestResult> => {
    const { data, error } = await supabase
      .from("test_results")
      .update({ marks_obtained: result.marks_obtained })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  const deleteResult = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("test_results")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  };

  const importResults = async (testId: string, results: Array<{ student_id: string, marks_obtained: number }>): Promise<void> => {
    const resultsWithTestId = results.map(result => ({
      ...result,
      test_id: testId
    }));

    const { error } = await supabase
      .from("test_results")
      .insert(resultsWithTestId);

    if (error) {
      throw new Error(error.message);
    }
  };

  const exportTestResults = async (testId: string): Promise<string> => {
    // In a real application, this would generate a CSV/Excel file
    const { data, error } = await supabase
      .from("test_results")
      .select(`
        *,
        student:students(name, gr_number, roll_number)
      `)
      .eq("test_id", testId);

    if (error) {
      throw new Error(error.message);
    }

    // For demo purposes, we're just returning a JSON string
    // In a real app, convert to CSV or Excel and return a download URL
    return JSON.stringify(data, null, 2);
  };

  // Query hooks
  const useResultsByTest = (testId: string) => {
    return useQuery({
      queryKey: ["test-results", testId],
      queryFn: () => fetchResultsByTest(testId),
      enabled: !!testId,
    });
  };

  // Mutation hooks
  const createResultMutation = useMutation({
    mutationFn: createResult,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["test-results", data.test_id] });
      toast.success("Result added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add result: ${error.message}`);
    },
  });

  const updateResultMutation = useMutation({
    mutationFn: updateResult,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["test-results", data.test_id] });
      toast.success("Result updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update result: ${error.message}`);
    },
  });

  const deleteResultMutation = useMutation({
    mutationFn: deleteResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-results"] });
      toast.success("Result deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete result: ${error.message}`);
    },
  });

  const importResultsMutation = useMutation({
    mutationFn: ({ testId, results }: { testId: string, results: Array<{ student_id: string, marks_obtained: number }> }) => 
      importResults(testId, results),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["test-results", variables.testId] });
      toast.success("Results imported successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to import results: ${error.message}`);
    },
  });

  return {
    useResultsByTest,
    getResultById,
    createResult: createResultMutation.mutate,
    updateResult: updateResultMutation.mutate,
    deleteResult: deleteResultMutation.mutate,
    importResults: importResultsMutation.mutate,
    exportTestResults,
    isCreating: createResultMutation.isPending,
    isUpdating: updateResultMutation.isPending,
    isDeleting: deleteResultMutation.isPending,
    isImporting: importResultsMutation.isPending,
  };
}
