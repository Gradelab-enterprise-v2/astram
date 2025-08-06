import { supabase } from "@/integrations/supabase/client";
import { Subject, ClassSubject, Student } from "@/types/academics";

export const fetchSubjects = async (): Promise<Subject[]> => {
  console.log("Fetching all subjects...");
  const { data, error } = await supabase
    .from("subjects")
    .select(`
      *,
      class_subjects (
        class:classes (
          id,
          name,
          year
        )
      )
    `)
    .order("name");

  if (error) {
    console.error("Error fetching subjects:", error);
    throw new Error(error.message);
  }

  // Transform the data to include class information
  const subjectsWithClass = data?.map(subject => ({
    ...subject,
    class: subject.class_subjects?.[0]?.class?.name || "No Class Assigned"
  })) || [];

  console.log("Subjects fetched:", subjectsWithClass.length);
  return subjectsWithClass;
};

export const getSubjectById = async (id: string): Promise<Subject> => {
  console.log("Fetching subject by ID:", id);
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching subject by ID:", error);
    throw new Error(error.message);
  }

  return data;
};

export const getSubjectsByClassId = async (classId: string): Promise<Subject[]> => {
  console.log("Fetching subjects by class ID:", classId);
  
  const { data: classSubjectsData, error: classSubjectsError } = await supabase
    .from("class_subjects")
    .select("subject:subjects(*)")
    .eq("class_id", classId);

  if (classSubjectsError) {
    console.error("Error fetching subjects for class:", classSubjectsError);
    throw new Error(classSubjectsError.message);
  }

  const subjects = classSubjectsData?.map(item => (item.subject as unknown) as Subject) || [];
  console.log("Subjects fetched for class:", subjects.length);
  return subjects;
};

export const getStudentsForSubject = async (subjectId: string): Promise<Student[]> => {
  const { data: enrollmentsData, error: enrollmentsError } = await supabase
    .from("subject_enrollments")
    .select("student:students(*)")
    .eq("subject_id", subjectId);

  if (enrollmentsError) {
    console.error("Error fetching students for subject:", enrollmentsError);
    throw new Error(enrollmentsError.message);
  }

  const students = enrollmentsData?.map(item => (item.student as unknown) as Student) || [];
  return students;
};

export const getClassForSubject = async (subjectId: string) => {
  const { data: classSubjectData, error: classSubjectError } = await supabase
    .from("class_subjects")
    .select(`
      class:classes (
        id,
        name,
        year
      )
    `)
    .eq("subject_id", subjectId)
    .maybeSingle();

  if (classSubjectError) {
    console.error("Error fetching class for subject:", classSubjectError);
    throw new Error(classSubjectError.message);
  }

  return classSubjectData?.class || null;
};

export const createSubject = async (subject: Omit<Subject, "id" | "user_id" | "created_at" | "updated_at">): Promise<Subject> => {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user?.id) {
    throw new Error("User not authenticated");
  }
  
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name: subject.name,
      code: subject.code,
      class: subject.class,
      semester: subject.semester || null,
      information: subject.information || null,
      user_id: userData.user.id
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error creating subject:", error);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Failed to create subject");
  }

  return data;
};

export const updateSubject = async ({ id, ...subject }: Partial<Subject> & { id: string }): Promise<Subject> => {
  const { data, error } = await supabase
    .from("subjects")
    .update({
      name: subject.name,
      code: subject.code,
      class: subject.class,
      semester: subject.semester || null,
      information: subject.information || null
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error updating subject:", error);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Failed to update subject");
  }

  return data;
};

export const deleteSubject = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting subject:", error);
    throw new Error(error.message);
  }
};
