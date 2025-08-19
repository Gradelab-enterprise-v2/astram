
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/academics";

export const addSubjectToClass = async ({ classId, subjectId }: { classId: string, subjectId: string }): Promise<Subject> => {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user?.id) {
    throw new Error("User not authenticated");
  }
  
  console.log("Adding subject to class:", subjectId, classId);
  
  // Update the subject to link it to the class
  const { data, error } = await supabase
    .from("subjects")
    .update({ class: classId })
    .eq("id", subjectId)
    .eq("user_id", userData.user.id)
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
  
  // Update the subject to remove the class link
  const { error } = await supabase
    .from("subjects")
    .update({ class: null })
    .eq("id", subjectId)
    .eq("class", classId);

  if (error) {
    console.error("Error removing subject from class:", error);
    throw new Error(error.message);
  }
  
  console.log("Subject successfully removed from class:", subjectId, classId);
};
