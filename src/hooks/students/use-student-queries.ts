
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/academics";
import { toast } from "sonner";
import { fetchStudentsByClass, fetchStudentsEnrolledInClassSubjects } from "./student-api";

export const fetchStudentsBySubject = async (subjectId: string): Promise<Student[]> => {
  console.log("Fetching students by subject ID:", subjectId);
  
  if (!subjectId) {
    console.warn("No subject ID provided");
    return [];
  }

  try {
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Error getting authenticated user:", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!user) {
      console.warn("No authenticated user found");
      return [];
    }
    
    // Get students enrolled in this subject through subject_enrollments
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("subject_enrollments")
      .select("student:students(*)")
      .eq("subject_id", subjectId)
      .eq("user_id", user.id);

    if (enrollmentsError) {
      console.error("Error fetching students by subject:", enrollmentsError);
      throw new Error(enrollmentsError.message);
    }

    // Transform the data structure to extract student objects
    const students = enrollmentsData
      ?.map(item => (item.student as unknown) as Student)
      .filter(Boolean) || [];
    
    console.log(`Found ${students.length} students for subject ${subjectId}`);
    return students;
  } catch (error) {
    console.error("Error in fetchStudentsBySubject:", error);
    throw error;
  }
};

export const useStudentsBySubject = (subjectId: string) => {
  return useQuery({
    queryKey: ["students", "by-subject", subjectId],
    queryFn: () => fetchStudentsBySubject(subjectId),
    enabled: !!subjectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      onError: (error: Error) => {
        console.error(`Error loading students for subject ${subjectId}:`, error);
        toast.error(`Failed to load students: ${error.message}`);
      }
    }
  });
};

// Function to fetch all students
export const fetchAllStudents = async (): Promise<Student[]> => {
  console.log("Fetching all students");
  
  try {
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Error getting authenticated user:", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!user) {
      console.warn("No authenticated user found");
      return [];
    }
    
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        class:classes(*)
      `)
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error fetching all students:", error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchAllStudents:", error);
    throw error;
  }
};

// Hook to get all students
export const useAllStudents = () => {
  return useQuery({
    queryKey: ["students", "all"],
    queryFn: fetchAllStudents,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      onError: (error: Error) => {
        console.error("Error loading all students:", error);
        toast.error(`Failed to load students: ${error.message}`);
      }
    }
  });
};

// Function to fetch students without a class
export const fetchStudentsWithoutClass = async (): Promise<Student[]> => {
  console.log("Fetching students without a class");
  
  try {
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Error getting authenticated user:", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!user) {
      console.warn("No authenticated user found");
      return [];
    }
    
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        class:classes(*)
      `)
      .is("class_id", null)
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error fetching students without class:", error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchStudentsWithoutClass:", error);
    throw error;
  }
};

// Hook to get students without a class
export const useStudentsWithoutClass = () => {
  return useQuery({
    queryKey: ["students", "without-class"],
    queryFn: fetchStudentsWithoutClass,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      onError: (error: Error) => {
        console.error("Error loading students without class:", error);
        toast.error(`Failed to load unassigned students: ${error.message}`);
      }
    }
  });
};

// Hook to get students by class
export const useStudentsByClass = (classId: string) => {
  return useQuery({
    queryKey: ["students", "by-class", classId],
    queryFn: () => fetchStudentsByClass(classId),
    enabled: !!classId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      onError: (error: Error) => {
        console.error(`Error loading students for class ${classId}:`, error);
        toast.error(`Failed to load students: ${error.message}`);
      }
    }
  });
};

// Hook to get students enrolled in subjects within a class
export const useStudentsEnrolledInClassSubjects = (classId: string) => {
  return useQuery({
    queryKey: ["students", "enrolled-in-class-subjects", classId],
    queryFn: () => fetchStudentsEnrolledInClassSubjects(classId),
    enabled: !!classId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      onError: (error: Error) => {
        console.error(`Error loading students enrolled in class subjects ${classId}:`, error);
        toast.error(`Failed to load students: ${error.message}`);
      }
    }
  });
};
