
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Department } from "@/types/academics";
import { toast } from "sonner";

export function useDepartments() {
  const queryClient = useQueryClient();

  const fetchDepartments = async (): Promise<Department[]> => {
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("name");

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  };

  const createDepartment = async (department: Omit<Department, "id" | "user_id" | "created_at" | "updated_at">): Promise<Department> => {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("departments")
      .insert({
        ...department,
        user_id: userData.user?.id
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  const updateDepartment = async ({ id, ...department }: Partial<Department> & { id: string }): Promise<Department> => {
    const { data, error } = await supabase
      .from("departments")
      .update(department)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  const deleteDepartment = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments
  });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create department: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update department: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete department: ${error.message}`);
    }
  });

  return {
    departments: data || [],
    isLoading,
    error: error as Error,
    createDepartment: createMutation.mutate,
    updateDepartment: updateMutation.mutate,
    deleteDepartment: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
