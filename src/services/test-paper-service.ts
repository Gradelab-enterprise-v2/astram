import { supabase } from "@/integrations/supabase/client";
import { TestPaper } from "@/types/test-papers";
import { uploadImageToLocal } from "@/lib/storage-config";

export const fetchPapersByTest = async (testId: string): Promise<TestPaper[]> => {
  if (!testId) return [];
  
  const { data, error } = await supabase
    .from("test_papers")
    .select("*")
    .eq("test_id", testId);

  if (error) {
    console.error("Error fetching papers by test:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const fetchPapersBySubject = async (subjectId: string): Promise<TestPaper[]> => {
  if (!subjectId) return [];
  
  const { data, error } = await supabase
    .from("test_papers")
    .select("*")
    .eq("subject_id", subjectId);

  if (error) {
    console.error("Error fetching papers by subject:", error);
    throw new Error(error.message);
  }

  return data || [];
};

export const uploadPaper = async (formData: any): Promise<TestPaper> => {
  // Get authenticated user
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error("User not authenticated");
  }

  // Extract file from form data
  const file = formData.file;
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `test_papers/${userData.user.id}/${fileName}`;

  // Upload file to storage
  const { data: fileData, publicUrl: fileUrl, error: fileError } = await uploadImageToLocal(
    "papers",
    filePath,
    file
  );

  if (fileError) {
    console.error("Error uploading file:", fileError);
    throw new Error(fileError.message);
  }

  // Create paper record in database
  const paperData = {
    subject_id: formData.subject_id,
    test_id: formData.test_id || null,
    title: formData.title,
    paper_type: formData.paper_type,
    file_url: fileUrl,
    user_id: userData.user.id
  };

  const { data, error } = await supabase
    .from("test_papers")
    .insert(paperData)
    .select()
    .single();

  if (error) {
    console.error("Error creating paper record:", error);
    throw new Error(error.message);
  }

  return data;
};

export const extractText = async (paperId: string): Promise<TestPaper> => {
  // First, get the paper details
  const { data: paper, error: paperError } = await supabase
    .from("test_papers")
    .select("*")
    .eq("id", paperId)
    .single();

  if (paperError) {
    console.error("Error fetching paper details:", paperError);
    throw new Error(paperError.message);
  }

  if (!paper) {
    throw new Error("Paper not found");
  }

  // Use the extract-text service which handles the proper image processing
  try {
    const { extractText: extractTextService } = await import('./test-paper/extract-text');
    return await extractTextService(paperId);
  } catch (error) {
    console.error("Error in text extraction process:", error);
    throw error;
  }
};

export const deletePaper = async (params: { paperId: string, deleteRelated?: boolean }): Promise<void> => {
  const { paperId, deleteRelated } = params;
  
  // First get the paper details to know what file to delete
  const { data: paperData, error: fetchError } = await supabase
    .from("test_papers")
    .select("*")
    .eq("id", paperId)
    .single();

  if (fetchError) {
    console.error("Error fetching paper to delete:", fetchError);
    throw new Error(fetchError.message);
  }

  // Delete the database record
  const { error } = await supabase
    .from("test_papers")
    .delete()
    .eq("id", paperId);

  if (error) {
    console.error("Error deleting paper:", error);
    throw new Error(error.message);
  }

  // If deleteRelated is true and this is a question paper, also delete the answer key
  if (deleteRelated && paperData.paper_type === "question" && paperData.test_id) {
    try {
      const { data: answerKey } = await supabase
        .from("test_papers")
        .select("id")
        .eq("test_id", paperData.test_id)
        .eq("paper_type", "answer")
        .maybeSingle();

      if (answerKey) {
        await deletePaper({ paperId: answerKey.id });
      }
    } catch (relatedError) {
      console.error("Error deleting related paper:", relatedError);
      // Continue execution even if deleting related paper fails
    }
  }
};

export const linkPaperToTest = async (paperId: string, testId: string): Promise<TestPaper> => {
  const { data, error } = await supabase
    .from("test_papers")
    .update({ test_id: testId })
    .eq("id", paperId)
    .select()
    .single();

  if (error) {
    console.error("Error linking paper to test:", error);
    throw new Error(error.message);
  }

  return data;
};

export const unlinkPaper = async (params: { paperId: string, testId: string }): Promise<TestPaper> => {
  const { paperId, testId } = params;
  
  // Verify the paper is linked to this test before unlinking
  const { data: paperData, error: fetchError } = await supabase
    .from("test_papers")
    .select("*")
    .eq("id", paperId)
    .eq("test_id", testId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching paper to unlink:", fetchError);
    throw new Error(fetchError.message);
  }

  if (!paperData) {
    throw new Error("Paper is not linked to this test");
  }

  // Update the paper to remove test_id
  const { data, error } = await supabase
    .from("test_papers")
    .update({ test_id: null })
    .eq("id", paperId)
    .select()
    .single();

  if (error) {
    console.error("Error unlinking paper from test:", error);
    throw new Error(error.message);
  }

  return data;
};
