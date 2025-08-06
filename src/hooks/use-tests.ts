import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export interface Test {
  id: string;
  user_id: string;
  subject_id: string;
  class_id: string;
  title: string;
  date: string;
  max_marks: number;
  created_at: string;
  updated_at: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  class?: {
    id: string;
    name: string;
  };
}

export function useTests() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const fetchTests = async (): Promise<Test[]> => {
    try {
      const { data, error } = await supabase
        .from("tests")
        .select(`
          *,
          subject:subjects(id, name, code),
          class:classes(id, name, year)
        `)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching tests:", error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error("Failed to fetch tests:", error);
      throw error;
    }
  };

  const fetchTestsBySubject = async (subjectId: string): Promise<Test[]> => {
    try {
      if (!subjectId) {
        console.warn("No subject ID provided for fetchTestsBySubject");
        return [];
      }

      const { data, error } = await supabase
        .from("tests")
        .select(`
          *,
          subject:subjects(id, name, code),
          class:classes(id, name, year)
        `)
        .eq("subject_id", subjectId)
        .order("date", { ascending: false });

      if (error) {
        console.error(`Error fetching tests for subject ${subjectId}:`, error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error(`Failed to fetch tests for subject ${subjectId}:`, error);
      throw error;
    }
  };

  const fetchTestsByClass = async (classId: string): Promise<Test[]> => {
    try {
      if (!classId) {
        console.warn("No class ID provided for fetchTestsByClass");
        return [];
      }

      const { data, error } = await supabase
        .from("tests")
        .select(`
          *,
          subject:subjects(id, name, code),
          class:classes(id, name, year)
        `)
        .eq("class_id", classId)
        .order("date", { ascending: false });

      if (error) {
        console.error(`Error fetching tests for class ${classId}:`, error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error(`Failed to fetch tests for class ${classId}:`, error);
      throw error;
    }
  };

  const getTestById = async (id: string): Promise<Test> => {
    try {
      if (!id) {
        throw new Error("No test ID provided");
      }

      const { data, error } = await supabase
        .from("tests")
        .select(`
          *,
          subject:subjects(id, name, code),
          class:classes(id, name, year)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching test ${id}:`, error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(`Test with ID ${id} not found`);
      }

      return data;
    } catch (error) {
      console.error(`Failed to fetch test ${id}:`, error);
      throw error;
    }
  };

  const createTest = async (test: Omit<Test, "id" | "user_id" | "created_at" | "updated_at" | "subject" | "class">): Promise<Test> => {
    try {
      console.log("Creating test with data:", test);
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error getting current user:", userError);
        throw new Error(userError.message);
      }
      
      if (!userData.user) {
        throw new Error("No authenticated user found");
      }
      
      const { data, error } = await supabase
        .from("tests")
        .insert({
          ...test,
          user_id: userData.user.id
        })
        .select("*")
        .single();

      if (error) {
        console.error("Error creating test:", error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error("Failed to create test: No data returned");
      }

      console.log("Test created successfully with ID:", data.id);
      return data;
    } catch (error: any) {
      console.error("Failed to create test:", error);
      throw error;
    }
  };

  const updateTest = async ({ id, ...test }: Partial<Test> & { id: string }): Promise<Test> => {
    const { data, error } = await supabase
      .from("tests")
      .update(test)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  const deleteTest = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("tests")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  };

  const useAllTests = () => {
    return useQuery({
      queryKey: ["tests"],
      queryFn: fetchTests,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      meta: {
        onError: (error: Error) => {
          console.error("Error loading tests:", error);
          toast.error(`Failed to load tests: ${error.message}`);
        }
      }
    });
  };

  const useTestsBySubject = (subjectId: string) => {
    return useQuery({
      queryKey: ["tests", "subject", subjectId],
      queryFn: () => fetchTestsBySubject(subjectId),
      enabled: !!subjectId,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      meta: {
        onError: (error: Error) => {
          console.error(`Error loading tests for subject ${subjectId}:`, error);
          toast.error(`Failed to load tests: ${error.message}`);
        }
      }
    });
  };

  const useTestsByClass = (classId: string) => {
    return useQuery({
      queryKey: ["tests", "class", classId],
      queryFn: () => fetchTestsByClass(classId),
      enabled: !!classId,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      meta: {
        onError: (error: Error) => {
          console.error(`Error loading tests for class ${classId}:`, error);
          toast.error(`Failed to load tests: ${error.message}`);
        }
      }
    });
  };

  const createTestMutation = useMutation({
    mutationFn: createTest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      if (data && data.id) {
        queryClient.invalidateQueries({ queryKey: ["tests", data.id] });
        queryClient.invalidateQueries({ queryKey: ["tests", "subject", data.subject_id] });
        queryClient.invalidateQueries({ queryKey: ["tests", "class", data.class_id] });
      }
      console.log("Test created successfully, invalidating queries");
      return data;
    },
    onError: (error: Error) => {
      console.error("Error in createTestMutation:", error);
      toast.error(`Failed to create test: ${error.message}`);
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: updateTest,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      if (data && data.id) {
        queryClient.invalidateQueries({ queryKey: ["tests", data.id] });
        queryClient.invalidateQueries({ queryKey: ["tests", "subject", data.subject_id] });
        queryClient.invalidateQueries({ queryKey: ["tests", "class", data.class_id] });
      }
      toast.success("Test updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update test: ${error.message}`);
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: deleteTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      toast.success("Test deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete test: ${error.message}`);
    },
  });

  return {
    useAllTests,
    useTestsBySubject,
    useTestsByClass,
    getTestById,
    createTest: createTestMutation.mutate,
    updateTest: updateTestMutation.mutate,
    deleteTest: deleteTestMutation.mutate,
    isCreating: createTestMutation.isPending,
    isUpdating: updateTestMutation.isPending,
    isDeleting: deleteTestMutation.isPending,
  };
}
