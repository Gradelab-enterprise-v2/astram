import { supabase } from "@/lib/supabase";
import { uploadImageToLocal, STORAGE_BUCKETS } from "@/lib/storage-config";
import { StudentAnswerSheet, UploadAnswerSheetParams } from "@/types/student-sheets";

// Fetch answer sheet by student and test
export const getStudentAnswerSheet = async (studentId: string, testId: string): Promise<StudentAnswerSheet | null> => {
  const { data, error } = await supabase
    .from("student_answer_sheets")
    .select("*")
    .eq("student_id", studentId)
    .eq("test_id", testId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching student answer sheet:", error);
    throw error;
  }

  return data;
};

// Fetch answer sheet by ID
export const getAnswerSheetById = async (sheetId: string): Promise<StudentAnswerSheet | null> => {
  if (!sheetId) return null;
  
  const { data, error } = await supabase
    .from("student_answer_sheets")
    .select("*")
    .eq("id", sheetId)
    .maybeSingle();
    
  if (error) {
    console.error("Error fetching student sheet by ID:", error);
    throw error;
  }
  
  return data;
};

// Upload and process student answer sheet
export const uploadAnswerSheet = async (params: UploadAnswerSheetParams): Promise<StudentAnswerSheet> => {
  const { file, studentId, testId } = params;

  try {
    // Check if an answer sheet already exists
    const existingSheet = await getStudentAnswerSheet(studentId, testId);
    
    if (existingSheet) {
      // If sheet exists but needs to be updated, delete it first
      const { error: deleteError } = await supabase
        .from("student_answer_sheets")
        .delete()
        .eq("id", existingSheet.id);
        
      if (deleteError) throw deleteError;
      
      // Also remove from auto_grade_status
      const { error: updateStatusError } = await supabase
        .from("auto_grade_status")
        .update({ answer_sheet_id: null, status: 'pending' })
        .eq("student_id", studentId)
        .eq("test_id", testId);
      
      if (updateStatusError && updateStatusError.code !== '23505') {
        console.error("Error updating auto grade status:", updateStatusError);
      }
    }

    // 1. Upload file to local storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${studentId}_${testId}_${Date.now()}.${fileExt}`;
    const filePath = `student-sheets/${testId}/${fileName}`;
    
    const { data: fileData, publicUrl, error: uploadError } = await uploadImageToLocal(
      STORAGE_BUCKETS.STUDENT_SHEETS,
      filePath,
      file
    );
      
    if (uploadError) throw uploadError;
    
    // 2. Create an entry in the student_answer_sheets table
    const { data: sheetData, error: insertError } = await supabase
      .from("student_answer_sheets")
      .insert({
        student_id: studentId,
        test_id: testId,
        file_url: publicUrl,
        has_extracted_text: false,
        status: 'pending'
      })
      .select()
      .single();
      
    if (insertError) throw insertError;
    
    // 3. Update the auto_grade_status table with the new answer sheet ID
    // First check if entry exists
    const { data: existingStatus } = await supabase
      .from("auto_grade_status")
      .select("id")
      .eq("student_id", studentId)
      .eq("test_id", testId)
      .maybeSingle();
    
    if (existingStatus) {
      // Update existing status
      const { error: updateError } = await supabase
        .from("auto_grade_status")
        .update({
          answer_sheet_id: sheetData.id,
          status: 'pending'
        })
        .eq("student_id", studentId)
        .eq("test_id", testId);
        
      if (updateError) {
        console.error("Error updating auto grade status:", updateError);
      }
    } else {
      // Create new status
      const { error: insertStatusError } = await supabase
        .from("auto_grade_status")
        .insert({
          student_id: studentId,
          test_id: testId,
          answer_sheet_id: sheetData.id,
          status: 'pending'
        });
        
      if (insertStatusError) {
        console.error("Error creating auto grade status:", insertStatusError);
      }
    }
    
    return sheetData;
  } catch (error) {
    console.error("Error uploading answer sheet:", error);
    throw error;
  }
};

// Extract text from the uploaded answer sheet
export const extractTextFromSheet = async (sheet: StudentAnswerSheet): Promise<StudentAnswerSheet> => {
  try {
    // 1. Update status to processing
    const { error: updateError } = await supabase
      .from("student_answer_sheets")
      .update({ status: 'processing' })
      .eq("id", sheet.id);
      
    if (updateError) throw updateError;
    
    // 2. Call the edge function to extract text
    const response = await fetch(sheet.file_url);
    const fileBlob = await response.blob();
    const file = new File([fileBlob], "answer-sheet.pdf", { type: "application/pdf" });
    
    // Import needed utility
    const { convertPdfToImages } = await import("@/utils/pdf-processor");
    
    // Convert PDF to images with higher quality settings for better OCR
    const images = await convertPdfToImages(file, {
      quality: 1.0,
      grayscale: true,
      maxWidth: 2000,
      imageFormat: 'png'
    });
    
    // Initialize extracted text with page markers
    let extractedText = "";
    
    // Process images in batches of 10
    const batchSize = 10;
    for (let i = 0; i < images.length; i += batchSize) {
      const batchImages = images.slice(i, i + batchSize);
      const batchBase64Images = batchImages.map(img => img.split(',')[1]);
      
      // Update status to show current batch being processed
      await supabase
        .from("student_answer_sheets")
        .update({
          extracted_text: `Processing pages ${i + 1} to ${Math.min(i + batchSize, images.length)} of ${images.length}...\n\n${extractedText}`,
          status: 'processing'
        })
        .eq("id", sheet.id);
      
      // Extract text from current batch
      const { data, error } = await supabase.functions.invoke("extract-text", {
        body: {
          documentType: 'student-sheet',
          sheetId: sheet.id,
          base64Images: batchBase64Images
        }
      });
      
      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || `Failed to extract text from pages ${i + 1} to ${Math.min(i + batchSize, images.length)}`);
      }
      
      // Append the extracted text (it should already have proper page markers)
      extractedText += `\n\n${data.extractedText}\n`;
      
      // Update the sheet with current progress
      await supabase
        .from("student_answer_sheets")
        .update({
          extracted_text: extractedText,
          status: 'processing'
        })
        .eq("id", sheet.id);
    }
    
    // Final update with completed status
    const { data: updatedSheet, error: finalUpdateError } = await supabase
      .from("student_answer_sheets")
      .update({
        extracted_text: extractedText,
        has_extracted_text: true,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq("id", sheet.id)
      .select()
      .single();
      
    if (finalUpdateError) throw finalUpdateError;
    
    return updatedSheet;
  } catch (error) {
    // Update status to failed if there's an error
    await supabase
      .from("student_answer_sheets")
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq("id", sheet.id);
      
    throw error;
  }
};
