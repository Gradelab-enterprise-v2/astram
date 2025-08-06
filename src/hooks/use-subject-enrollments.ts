
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudents } from "./use-students";
import { SubjectEnrollment } from "@/types/academics";

export function useSubjectEnrollments() {
  const queryClient = useQueryClient();
  const { fetchStudentsByClass } = useStudents();

  const enrollClassStudentsInSubject = async ({ classId, subjectId }: { classId: string; subjectId: string }) => {
    // Get all students in the class
    const students = await fetchStudentsByClass(classId);
    
    if (!students || students.length === 0) {
      throw new Error("No students found in this class");
    }

    // Get the authenticated user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Create enrollment records for each student
    const enrollmentPromises = students.map(async (student) => {
      // Check if enrollment already exists
      const { data: existingEnrollment } = await supabase
        .from("subject_enrollments")
        .select("*")
        .eq("student_id", student.id)
        .eq("subject_id", subjectId);

      // If enrollment already exists, skip
      if (existingEnrollment && existingEnrollment.length > 0) {
        return null;
      }

      // Create new enrollment
      return supabase
        .from("subject_enrollments")
        .insert({
          student_id: student.id,
          subject_id: subjectId,
          user_id: userId
        });
    });

    await Promise.all(enrollmentPromises);
    
    return { success: true, message: `Enrolled ${students.length} students in the subject` };
  };

  const enrollStudentInSubject = async ({ studentId, subjectId }: { studentId: string; subjectId: string }) => {
    // Get the authenticated user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Check if enrollment already exists
    const { data: existingEnrollment, error: checkError } = await supabase
      .from("subject_enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("subject_id", subjectId);

    if (checkError) {
      throw new Error(checkError.message);
    }

    // If enrollment already exists, return early
    if (existingEnrollment && existingEnrollment.length > 0) {
      return { success: true, message: "Student already enrolled in this subject" };
    }

    // Create new enrollment
    const { error } = await supabase
      .from("subject_enrollments")
      .insert({
        student_id: studentId,
        subject_id: subjectId,
        user_id: userId
      });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: "Student enrolled successfully" };
  };

  const removeStudentFromSubject = async ({ studentId, subjectId }: { studentId: string; subjectId: string }) => {
    const { error } = await supabase
      .from("subject_enrollments")
      .delete()
      .eq("student_id", studentId)
      .eq("subject_id", subjectId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, message: "Student removed from subject successfully" };
  };

  // New function to fetch enrollments for a student
  const fetchStudentEnrollments = async (studentId: string): Promise<SubjectEnrollment[]> => {
    if (!studentId) return [];
    
    const { data, error } = await supabase
      .from("subject_enrollments")
      .select("*, subject:subjects(*)")
      .eq("student_id", studentId);

    if (error) {
      console.error("Error fetching student enrollments:", error);
      throw new Error(error.message);
    }

    return data || [];
  };

  // New hook for student enrollments
  const useStudentEnrollments = (studentId: string) => {
    return useQuery({
      queryKey: ["student-enrollments", studentId],
      queryFn: () => fetchStudentEnrollments(studentId),
      enabled: !!studentId
    });
  };

  const enrollStudentMutation = useMutation({
    mutationFn: enrollStudentInSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
      toast.success("Student enrolled successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to enroll student: ${error.message}`);
    }
  });

  const removeStudentMutation = useMutation({
    mutationFn: removeStudentFromSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
      toast.success("Student removed from subject successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove student: ${error.message}`);
    }
  });

  const enrollClassMutation = useMutation({
    mutationFn: enrollClassStudentsInSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-enrollments"] });
      toast.success("Students enrolled in subject successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to enroll students: ${error.message}`);
    }
  });

  return {
    enrollStudentInSubject: enrollStudentMutation.mutate,
    removeStudentFromSubject: removeStudentMutation.mutate,
    enrollClassStudentsInSubject: enrollClassMutation.mutate,
    isEnrolling: enrollStudentMutation.isPending,
    isRemoving: removeStudentMutation.isPending,
    isEnrollingClass: enrollClassMutation.isPending,
    useStudentEnrollments,
    fetchStudentEnrollments
  };
}
