
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/academics";

export const fetchAllStudents = async (): Promise<Student[]> => {
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
    console.error("Error fetching students:", error);
    throw new Error(`Error fetching students: ${error.message}`);
  }

  return data || [];
};

export const fetchStudentsByClass = async (classId: string): Promise<Student[]> => {
  if (!classId) {
    console.warn("No class ID provided to fetchStudentsByClass");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        class:classes(*)
      `)
      .eq("class_id", classId)
      .order("name");

    if (error) {
      console.error(`Error fetching students for class ${classId}:`, error);
      throw new Error(`Error fetching students for class: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchStudentsByClass:", error);
    throw error;
  }
};

export const fetchStudentsByDepartment = async (departmentId: string): Promise<Student[]> => {
  if (!departmentId) {
    console.warn("No department ID provided to fetchStudentsByDepartment");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        class:classes(*)
      `)
      .eq("department_id", departmentId)
      .order("name");

    if (error) {
      console.error(`Error fetching students for department ${departmentId}:`, error);
      throw new Error(`Error fetching students for department: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchStudentsByDepartment:", error);
    throw error;
  }
};

export const fetchStudentsBySubject = async (subjectId: string): Promise<Student[]> => {
  if (!subjectId) {
    console.warn("No subject ID provided to fetchStudentsBySubject");
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
    
    // First verify the subject belongs to the user
    const { data: subjectData, error: subjectError } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .eq("user_id", user.id)
      .single();
      
    if (subjectError && subjectError.code !== 'PGRST116') {
      console.error(`Error verifying subject ownership ${subjectId}:`, subjectError);
      throw new Error(`Error verifying subject: ${subjectError.message}`);
    }
    
    if (!subjectData && subjectError.code === 'PGRST116') {
      console.warn(`Subject ${subjectId} not found or doesn't belong to user ${user.id}`);
      return [];
    }

    // First get all student IDs enrolled in this subject
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("subject_enrollments")
      .select("student_id")
      .eq("subject_id", subjectId)
      .eq("user_id", user.id);

    if (enrollmentsError) {
      console.error(`Error fetching enrollments for subject ${subjectId}:`, enrollmentsError);
      throw new Error(`Error fetching enrollments: ${enrollmentsError.message}`);
    }

    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    // Then fetch the actual student data
    const studentIds = enrollments.map(enrollment => enrollment.student_id);
    
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        class:classes(*)
      `)
      .in("id", studentIds)
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error(`Error fetching students for subject ${subjectId}:`, error);
      throw new Error(`Error fetching students: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchStudentsBySubject:", error);
    throw error;
  }
};

export const fetchStudentsWithoutClass = async (): Promise<Student[]> => {
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
      throw new Error(`Error fetching students without class: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchStudentsWithoutClass:", error);
    throw error;
  }
};

export const getSubjectsForStudent = async (studentId: string): Promise<any[]> => {
  if (!studentId) {
    console.warn("No student ID provided to getSubjectsForStudent");
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
    
    // First verify the student belongs to the user
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("user_id", user.id)
      .single();
      
    if (studentError && studentError.code !== 'PGRST116') {
      console.error(`Error verifying student ownership ${studentId}:`, studentError);
      throw new Error(`Error verifying student: ${studentError.message}`);
    }
    
    if (!studentData && studentError.code === 'PGRST116') {
      console.warn(`Student ${studentId} not found or doesn't belong to user ${user.id}`);
      return [];
    }

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("subject_enrollments")
      .select(`
        subject_id,
        subject:subjects(*)
      `)
      .eq("student_id", studentId)
      .eq("user_id", user.id);

    if (enrollmentsError) {
      console.error(`Error fetching subjects for student ${studentId}:`, enrollmentsError);
      throw new Error(`Error fetching student subjects: ${enrollmentsError.message}`);
    }

    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    return enrollments.map(enrollment => enrollment.subject);
  } catch (error) {
    console.error("Error in getSubjectsForStudent:", error);
    throw error;
  }
};

export const getStudentById = async (id: string): Promise<Student> => {
  if (!id) {
    console.warn("No student ID provided to getStudentById");
    throw new Error("Student ID is required");
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
      throw new Error("Authentication required");
    }
    
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        class:classes(*)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error(`Error fetching student ${id}:`, error);
      throw new Error(`Error fetching student: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error in getStudentById:", error);
    throw error;
  }
};

export const createStudent = async (student: Omit<Student, "id" | "created_at" | "updated_at" | "class">): Promise<Student> => {
  try {
    // Get the current authenticated user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Error getting authenticated user:", userError);
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!userData.user) {
      throw new Error("No authenticated user found");
    }
    
    const { data, error } = await supabase
      .from("students")
      .insert({
        ...student,
        user_id: userData.user.id
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating student:", error);
      throw new Error(`Error creating student: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error in createStudent:", error);
    throw error;
  }
};

export const updateStudent = async ({ id, ...student }: Partial<Student> & { id: string }): Promise<Student> => {
  if (!id) {
    console.warn("No student ID provided to updateStudent");
    throw new Error("Student ID is required for updates");
  }

  try {
    const { data, error } = await supabase
      .from("students")
      .update(student)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating student ${id}:`, error);
      throw new Error(`Error updating student: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error in updateStudent:", error);
    throw error;
  }
};

export const deleteStudent = async (id: string): Promise<void> => {
  if (!id) {
    console.warn("No student ID provided to deleteStudent");
    throw new Error("Student ID is required for deletion");
  }

  try {
    // First check if this student has any subject enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("subject_enrollments")
      .select("id")
      .eq("student_id", id);
      
    if (enrollmentError) {
      console.error(`Error checking enrollments for student ${id}:`, enrollmentError);
    } else if (enrollments && enrollments.length > 0) {
      // Delete all subject enrollments for this student first
      const { error: deleteEnrollmentsError } = await supabase
        .from("subject_enrollments")
        .delete()
        .eq("student_id", id);
        
      if (deleteEnrollmentsError) {
        console.error(`Error deleting enrollments for student ${id}:`, deleteEnrollmentsError);
        throw new Error(`Error deleting student enrollments: ${deleteEnrollmentsError.message}`);
      }
    }
    
    // Then delete the student
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`Error deleting student ${id}:`, error);
      throw new Error(`Error deleting student: ${error.message}`);
    }
  } catch (error) {
    console.error("Error in deleteStudent:", error);
    throw error;
  }
};
