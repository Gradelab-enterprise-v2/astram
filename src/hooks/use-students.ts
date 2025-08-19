
import { Student } from "@/types/academics";
import { useAllStudents } from "./students/use-student-queries";
import { useStudentDetails } from "./students/use-student-details";
import { useCreateStudent, useUpdateStudent, useDeleteStudent } from "./students/use-student-mutations";
import { 
  fetchStudentsByClass,
  fetchStudentsByDepartment,
  fetchStudentsBySubject,
  fetchStudentsWithoutClass,
  fetchStudentsEnrolledInClassSubjects,
  getSubjectsForStudent,
  getStudentById
} from "./students/student-api";
import { useStudentsWithoutClass } from "./students/use-student-queries";

// Main hook that combines all student-related functionality
export function useStudents() {
  const { data, isLoading, error } = useAllStudents();
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const deleteMutation = useDeleteStudent();

  return {
    students: data || [],
    isLoading,
    error: error as Error,
    getStudentById,
    useStudentDetails,
    fetchStudentsByClass,
    fetchStudentsByDepartment,
    fetchStudentsBySubject,
    fetchStudentsWithoutClass,
    fetchStudentsEnrolledInClassSubjects,
    useStudentsWithoutClass,
    getSubjectsForStudent,
    createStudent: createMutation.mutate,
    updateStudent: updateMutation.mutate,
    deleteStudent: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
