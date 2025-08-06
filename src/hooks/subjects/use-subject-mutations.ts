
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Subject } from "@/types/academics";
import { createSubject, updateSubject, deleteSubject } from "./subject-api";
import { addSubjectToClass, removeSubjectFromClass } from "./subject-class-api";

export function useSubjectMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subject: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update subject: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete subject: ${error.message}`);
    }
  });
  
  const addToClassMutation = useMutation({
    mutationFn: addSubjectToClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Subject added to class successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add subject to class: ${error.message}`);
    }
  });
  
  const removeFromClassMutation = useMutation({
    mutationFn: removeSubjectFromClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Subject removed from class successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove subject from class: ${error.message}`);
    }
  });

  return {
    createSubject: createMutation.mutate,
    updateSubject: updateMutation.mutate,
    deleteSubject: deleteMutation.mutate,
    addSubjectToClass: addToClassMutation.mutate,
    assignSubjectToClass: addToClassMutation.mutate,
    removeSubjectFromClass: removeFromClassMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAddingToClass: addToClassMutation.isPending,
    isRemovingFromClass: removeFromClassMutation.isPending
  };
}
