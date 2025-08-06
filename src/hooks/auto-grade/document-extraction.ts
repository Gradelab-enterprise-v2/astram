
import { supabase } from "@/lib/supabase";

// Functions for extracting text from documents
export async function getExtractedText(paperId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("test_papers")
      .select("extracted_text")
      .eq("id", paperId)
      .maybeSingle();
      
    if (error) throw error;
    return data?.extracted_text || "";
  } catch (error) {
    console.error("Error fetching extracted text:", error);
    return "";
  }
}

export async function getStudentAnswerSheet(sheetId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("student_answer_sheets")
      .select("extracted_text")
      .eq("id", sheetId)
      .maybeSingle();
      
    if (error) throw error;
    return data?.extracted_text || "";
  } catch (error) {
    console.error("Error fetching student answer sheet:", error);
    return "";
  }
}

export function getStudentInfo(student: any) {
  return {
    name: student.name,
    rollNumber: student.roll_number || "",
    class: student.class?.name || "",
    subject: ""
  };
}
