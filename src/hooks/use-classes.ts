import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Class } from "@/types/academics";
import { toast } from "sonner";

export function useClasses() {
  const queryClient = useQueryClient();

  const fetchClasses = async (): Promise<Class[]> => {
    console.log("Fetching classes...");
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching classes:", error);
      throw new Error(error.message);
    }
    
    console.log("Classes fetched:", data?.length || 0);
    return data || [];
  };

  const getClassById = async (id: string): Promise<Class | null> => {
    // Check if the ID is "new" and return null to handle the case for creating new classes
    if (id === "new") return null;
    
    console.log("Fetching class by ID:", id);
    const { data, error } = await supabase
      .from("classes")
      .select(`
        *,
        class_subjects (
          subject:subjects (*)
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching class by ID:", error);
      throw new Error(error.message);
    }

    return data;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["classes"],
    queryFn: fetchClasses,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attempt) => Math.min(attempt > 1 ? 2000 : 1000, 30 * 1000)
  });

  const useClassById = (id: string) => {
    return useQuery({
      queryKey: ["class", id],
      queryFn: () => getClassById(id),
      enabled: !!id && id !== "new",
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      retryDelay: (attempt) => Math.min(attempt > 1 ? 2000 : 1000, 30 * 1000)
    });
  };

  const createClass = async (classData: Omit<Class, "id" | "user_id" | "created_at" | "updated_at">): Promise<Class> => {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user?.id) {
      throw new Error("User not authenticated");
    }
    
    // Only include valid fields from the database schema
    const validClassData = {
      name: classData.name,
      year: classData.year,
      grade: classData.grade,
      department: classData.department,
      user_id: userData.user?.id
    };
    
    const { data, error } = await supabase
      .from("classes")
      .insert(validClassData)
      .select()
      .single();

    if (error) {
      console.error("Error creating class:", error);
      throw new Error(error.message);
    }

    return data;
  };

  const updateClass = async ({ id, ...classData }: Partial<Class> & { id: string }): Promise<Class> => {
    const { data, error } = await supabase
      .from("classes")
      .update(classData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating class:", error);
      throw new Error(error.message);
    }

    return data;
  };

  const deleteClass = async (id: string): Promise<void> => {
    // First, unassign all students from this class
    const { error: unassignError } = await supabase
      .from("students")
      .update({ class_id: null })
      .eq("class_id", id);

    if (unassignError) {
      console.error("Error unassigning students from class:", unassignError);
      throw new Error(unassignError.message);
    }

    // Then delete the class
    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting class:", error);
      throw new Error(error.message);
    }
  };

  const createMutation = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create class: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateClass,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["class", data.id] });
      toast.success("Class updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update class: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete class: ${error.message}`);
    }
  });

  return {
    classes: data || [],
    isLoading,
    error: error as Error,
    refetchClasses: refetch,
    getClassById,
    useClassById,
    createClass: createMutation.mutate,
    updateClass: updateMutation.mutate,
    deleteClass: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
