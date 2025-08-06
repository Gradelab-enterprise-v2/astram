
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStudent, updateStudent, deleteStudent } from "./student-api";
import { toast } from "sonner";
import { Student } from "@/types/academics";
import { useNavigate } from "react-router-dom";

// Mutation hooks for creating, updating, and deleting students
export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: createStudent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Student created successfully");
      navigate("/students");
    },
    meta: {
      onError: (error: Error) => {
        toast.error(`Failed to create student: ${error.message}`);
      }
    }
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: updateStudent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["student", data.id] });
      toast.success("Student updated successfully");
      navigate(`/students/${data.id}`);
    },
    meta: {
      onError: (error: Error) => {
        toast.error(`Failed to update student: ${error.message}`);
      }
    }
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully");
    },
    meta: {
      onError: (error: Error) => {
        toast.error(`Failed to delete student: ${error.message}`);
      }
    }
  });
};
