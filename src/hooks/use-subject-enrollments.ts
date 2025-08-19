
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudents } from "./use-students";
import { SubjectEnrollment } from "@/types/academics";

export function useSubjectEnrollments() {
  const queryClient = useQueryClient();
  const { fetchStudentsByClass } = useStudents();

  const enrollClassStudentsInSubject = async ({ classId, subjectId }: { classId: string; subjectId: string }) => {
    console.log(`Starting enrollment for class ${classId} and subject ${subjectId}`);
    
    // Get all students in the class
    const students = await fetchStudentsByClass(classId);
    console.log(`Found ${students?.length || 0} students in class ${classId}`);
    
    if (!students || students.length === 0) {
      throw new Error("No students found in this class");
    }

    // Get the authenticated user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    let enrolledCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Create enrollment records for each student
    for (const student of students) {
      try {
        // Check if enrollment already exists
        const { data: existingEnrollment, error: checkError } = await supabase
          .from("subject_enrollments")
          .select("*")
          .eq("student_id", student.id)
          .eq("subject_id", subjectId)
          .eq("user_id", userId);

        if (checkError) {
          console.error(`Error checking existing enrollment for student ${student.id}:`, checkError);
          errors.push(`Failed to check enrollment for ${student.name}: ${checkError.message}`);
          continue;
        }

        // If enrollment already exists, skip
        if (existingEnrollment && existingEnrollment.length > 0) {
          skippedCount++;
          continue;
        }

        // Create new enrollment
        const { error: insertError } = await supabase
          .from("subject_enrollments")
          .insert({
            student_id: student.id,
            subject_id: subjectId,
            user_id: userId
          });

        if (insertError) {
          console.error(`Error enrolling student ${student.id}:`, insertError);
          errors.push(`Failed to enroll ${student.name}: ${insertError.message}`);
        } else {
          enrolledCount++;
        }
      } catch (error) {
        console.error(`Error processing student ${student.id}:`, error);
        errors.push(`Failed to process ${student.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Enrollment completed: ${enrolledCount} enrolled, ${skippedCount} skipped, ${errors.length} errors`);
    
    // If there were any errors, throw an error with details
    if (errors.length > 0) {
      throw new Error(`Enrollment completed with errors: ${errors.join('; ')}`);
    }
    
    return { 
      success: true, 
      message: `Enrolled ${enrolledCount} students in the subject${skippedCount > 0 ? `, ${skippedCount} already enrolled` : ''}` 
    };
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
      queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students", "by-subject"] });
      queryClient.invalidateQueries({ queryKey: ["students", "by-class"] });
      queryClient.invalidateQueries({ queryKey: ["students", "enrolled-in-class-subjects"] });
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
