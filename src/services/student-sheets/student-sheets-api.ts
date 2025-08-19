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

// Extract text from the uploaded answer sheet - OPTIMIZED VERSION
export const extractTextFromSheet = async (sheet: StudentAnswerSheet): Promise<StudentAnswerSheet> => {
  try {
    console.log(`Starting optimized text extraction for sheet ID: ${sheet.id}`);
    
    // 1. Update status to processing
    const { error: updateError } = await supabase
      .from("student_answer_sheets")
      .update({ 
        status: 'processing',
        extracted_text: "Text extraction in progress: Preparing document..."
      })
      .eq("id", sheet.id);
      
    if (updateError) throw updateError;
    
    // 2. Fetch the PDF file
    const response = await fetch(sheet.file_url);
    const fileBlob = await response.blob();
    const file = new File([fileBlob], "answer-sheet.pdf", { type: "application/pdf" });
    
    // Import needed utility
    const { convertPdfToImages } = await import("@/utils/pdf-processor");
    
    // Update status to show PDF conversion
    await supabase
      .from("student_answer_sheets")
      .update({
        extracted_text: "Text extraction in progress: Converting PDF to images..."
      })
      .eq("id", sheet.id);
    
    // Convert PDF to images with optimized settings for better OCR
    const images = await convertPdfToImages(file, {
      quality: 0.95,     // Slightly reduced for better performance
      grayscale: true,   // Keep grayscale for better OCR
      maxWidth: 2000,    // High resolution for OCR
      imageFormat: 'png' // PNG format for better OCR compatibility
    });
    
    console.log(`Converted PDF to ${images.length} images`);
    
    if (images.length === 0) {
      throw new Error("Failed to convert PDF to images");
    }
    
    // 3. Process images in batches of 10 for optimal Azure OpenAI processing
    const BATCH_SIZE = 10; // Optimized for Azure OpenAI batch processing
    const batches = [];
    
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      batches.push(images.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Created ${batches.length} batches for processing`);
    
    // 4. Process batches with concurrent requests for better performance - SAME AS RESOURCES TAB
    let allExtractedText: string[] = [];
    
    // Process batches in parallel with concurrency limit - optimized for Azure OpenAI
    const CONCURRENT_BATCHES = 3; // Optimized for Azure OpenAI concurrent processing
    
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const currentBatchGroup = batches.slice(i, i + CONCURRENT_BATCHES);
      
      // Update progress
      await supabase
        .from("student_answer_sheets")
        .update({
          extracted_text: `Text extraction in progress: Processing batches ${i + 1} to ${Math.min(i + CONCURRENT_BATCHES, batches.length)} of ${batches.length}...`
        })
        .eq("id", sheet.id);
      
      // Process current batch group concurrently
      const batchPromises = currentBatchGroup.map(async (batchImages, batchIndex) => {
        const globalBatchIndex = i + batchIndex;
        const batchBase64Images = batchImages.map(img => img.split(',')[1]);
        
        try {
          console.log(`Processing batch ${globalBatchIndex + 1} with ${batchImages.length} images...`);
          
          const { data, error } = await supabase.functions.invoke("extract-text", {
            body: {
              documentType: 'student-sheet', // Keep student-sheet for student answer sheets
              sheetId: sheet.id, // Use sheetId for student-sheet document type
              imageUrls: batchBase64Images.map(base64 => `data:image/png;base64,${base64}`) // Convert to image URLs for OpenAI
            }
          });
          
          if (error) {
            console.error(`Error in batch ${globalBatchIndex + 1}:`, error);
            return `[Error processing batch ${globalBatchIndex + 1}: ${error.message || 'Unknown error'}]`;
          }
          
          if (!data.success) {
            return `[Failed to extract text from batch ${globalBatchIndex + 1}: ${data.error || 'Unknown error'}]`;
          }
          
          return data.extractedText || `[No text extracted from batch ${globalBatchIndex + 1}]`;
        } catch (batchError) {
          console.error(`Error processing batch ${globalBatchIndex + 1}:`, batchError);
          return `[Error processing batch ${globalBatchIndex + 1}: ${batchError.message || 'Unknown error'}]`;
        }
      });
      
      // Wait for all batches in current group to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add results to the main array
      allExtractedText.push(...batchResults);
      
      // Update paper with partial results for better user experience
      const partialText = allExtractedText.join("\n\n--- PAGE BREAK ---\n\n");
      await supabase
        .from("student_answer_sheets")
        .update({
          extracted_text: partialText,
          status: 'processing'
        })
        .eq("id", sheet.id);
        
      console.log(`Completed batch group ${Math.floor(i / CONCURRENT_BATCHES) + 1}`);
      
      // Small delay between batch groups to prevent overwhelming the API
      if (i + CONCURRENT_BATCHES < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 5. Combine all extracted text
    const combinedText = allExtractedText.join("\n\n--- PAGE BREAK ---\n\n");
    
    console.log("Text extraction complete, updating sheet data...");
    
    // Check if we actually extracted any meaningful text
    const hasMeaningfulText = allExtractedText.some(text => {
      return text && !text.includes('[Error processing') && !text.includes('[Failed to extract') && !text.includes('[No text extracted');
    });
    
    if (!hasMeaningfulText) {
      throw new Error("No meaningful text was extracted from any pages. Please try again.");
    }
    
    // 6. Final update with completed status
    const { data: updatedSheet, error: finalUpdateError } = await supabase
      .from("student_answer_sheets")
      .update({
        extracted_text: combinedText,
        has_extracted_text: true,
        status: 'completed',
        updated_at: new Date().toISOString(),
        // Note: Using same optimized batch processing as resources tab
        // - Batch size: 25 (same as resources)
        // - Concurrency: 4 batches (same as resources)
        // - API: OpenAI (same as resources tab)
      })
      .eq("id", sheet.id)
      .select()
      .single();
      
    if (finalUpdateError) throw finalUpdateError;
    
    console.log("Sheet data updated successfully with extracted text");
    return updatedSheet;
    
  } catch (error) {
    console.error("Text extraction failed:", error);
    
    // Update status to failed if there's an error
    try {
      const errorMessage = error.message || "Unknown error occurred during text extraction.";
      
      let detailedError = `The OCR service was unable to properly extract text from this document.\n\nError: ${errorMessage}`;
      
      // Add note about large documents if the error suggests it might be a large document issue
      if (errorMessage.includes('timeout') || errorMessage.includes('large') || errorMessage.includes('25')) {
        detailedError += `\n\nNote: For large documents, we process in batches of 25 pages for optimal performance (same batch size as resources tab).`;
      }
      
      detailedError += `\n\nPlease try again or contact support if the problem persists.`;
      
      await supabase
        .from("student_answer_sheets")
        .update({
          status: 'failed',
          extracted_text: detailedError,
          updated_at: new Date().toISOString()
        })
        .eq("id", sheet.id);
    } catch (updateError) {
      console.error("Failed to update sheet with error information:", updateError);
    }
    
    throw error;
  }
};
