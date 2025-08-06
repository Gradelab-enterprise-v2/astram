
import { supabase } from "@/integrations/supabase/client";
import { ClassSubject } from "@/types/academics";

export const addSubjectToClass = async ({ classId, subjectId }: { classId: string, subjectId: string }): Promise<ClassSubject> => {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user?.id) {
    throw new Error("User not authenticated");
  }
  
  console.log("Checking if subject already assigned to class:", subjectId, classId);
  const { data: existingData, error: checkError } = await supabase
    .from("class_subjects")
    .select("*")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .maybeSingle();
    
  if (checkError) {
    console.error("Error checking existing class subject:", checkError);
    throw new Error(checkError.message);
  }
  
  if (existingData) {
    console.log("Subject already assigned to class:", subjectId, classId);
    return existingData;
  }
  
  console.log("Adding subject to class:", subjectId, classId);
  const { data, error } = await supabase
    .from("class_subjects")
    .insert({
      class_id: classId,
      subject_id: subjectId,
      user_id: userData.user?.id
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding subject to class:", error);
    throw new Error(error.message);
  }

  console.log("Subject successfully added to class:", subjectId, classId);
  return data;
};

export const removeSubjectFromClass = async ({ classId, subjectId }: { classId: string, subjectId: string }): Promise<void> => {
  console.log("Removing subject from class:", subjectId, classId);
  const { error } = await supabase
    .from("class_subjects")
    .delete()
    .eq("class_id", classId)
    .eq("subject_id", subjectId);

  if (error) {
    console.error("Error removing subject from class:", error);
    throw new Error(error.message);
  }
  
  console.log("Subject successfully removed from class:", subjectId, classId);
};
