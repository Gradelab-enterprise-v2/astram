
import { supabase } from "@/lib/supabase-hybrid";
import { uploadImageToLocal, STORAGE_BUCKETS } from "@/lib/storage-config";
import { TestPaper } from "@/types/test-papers";
import { formatPaperData } from "./test-paper-base";
import { ensureBucket } from "@/utils/initialize-storage";

// Upload a paper
export const uploadPaper = async (formData: {
  test_id?: string; // Optional test_id
  title: string;
  file: File;
  paper_type: "question" | "answer";
  subject_id?: string; // Optional subject_id
}): Promise<TestPaper> => {
  try {
    // First, ensure the user is authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    const userId = sessionData?.session?.user?.id;
    
    if (!userId) {
      throw new Error("User not authenticated. Please log in and try again.");
    }

    console.log("Current user ID for upload:", userId);

    // If subject_id isn't provided, try to get it from the test
    let subjectId = formData.subject_id || null;
    if (!subjectId && formData.test_id) {
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .select("subject_id")
        .eq("id", formData.test_id)
        .single();
      
      if (testError) {
        console.error("Error fetching test data:", testError);
      } else if (testData?.subject_id) {
        subjectId = testData.subject_id;
        console.log("Retrieved subject ID from test:", subjectId);
      }
    }

    // Ensure the papers bucket exists before attempting to upload
    const bucketExists = await ensureBucket("papers");
    if (!bucketExists) {
      throw new Error("Failed to access or create the storage bucket. Please try again later.");
    }

    // Upload the file to storage - using the papers bucket
    const fileExt = formData.file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    
    // Use the appropriate path based on available IDs
    const pathPrefix = formData.test_id ? `test-papers/${formData.test_id}` : 
                      subjectId ? `subject-papers/${subjectId}` : 
                      'general-papers';
    const filePath = `${pathPrefix}/${fileName}`;

    console.log("Attempting to upload file to path:", filePath);

    // Upload to local storage
    const { data: fileData, publicUrl, error: uploadError } = await uploadImageToLocal(
      STORAGE_BUCKETS.TEST_PAPERS,
      filePath,
      formData.file,
      {
        cacheControl: "3600",
        upsert: false
      }
    );

    if (uploadError) {
      console.error("Upload error details:", uploadError);
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }

    console.log("File uploaded successfully:", fileData?.path);

    console.log("File public URL:", publicUrl);

    // Prepare the record data with TS interface
    const paperData: {
      title: string;
      file_url: string;
      paper_type: "question" | "answer";
      has_extracted_text: boolean;
      user_id: string;
      test_id?: string;
      subject_id?: string;
    } = {
      title: formData.title,
      file_url: publicUrl,
      paper_type: formData.paper_type,
      has_extracted_text: false,
      user_id: userId,
    };
    
    // Only add test_id if it exists and is not empty
    if (formData.test_id && formData.test_id.trim() !== "") {
      paperData.test_id = formData.test_id;
    }
    
    // Only add subject_id if it exists
    if (subjectId) {
      paperData.subject_id = subjectId;
    }

    // Create a record in the test_papers table
    const { data, error } = await supabase
      .from("test_papers")
      .insert(paperData)
      .select()
      .single();

    if (error) {
      // If there's an RLS error, provide a clearer message
      if (error.code === "42501") {
        throw new Error("Permission denied. You don't have access to upload papers to this test.");
      }
      throw new Error(`Error creating paper record: ${error.message}`);
    }

    // Also create an entry in the papers table for subject section if subject_id exists
    if (subjectId) {
      const { error: paperError } = await supabase
        .from("papers")
        .insert({
          subject_id: subjectId,
          title: formData.title,
          file_path: publicUrl,
          user_id: userId
        });

      if (paperError) {
        console.error("Error creating paper in papers table:", paperError);
        // Continue even if this fails
      } else {
        console.log("Successfully created paper in papers table.");
      }
    }

    return formatPaperData(data);
  } catch (error) {
    console.error("Upload paper error:", error);
    throw error;
  }
};
