import { supabase } from "@/integrations/supabase/client";
import { TestPaper } from "@/types/test-papers";
import { formatPaperData } from "./test-paper-base";
import { convertPdfToImages, dataUrlToBlob, validateFile, getPdfTroubleshootingTips } from "@/utils/pdf-processor";
import { toast } from "sonner";
import { ensureBucket, userHasBucketAccess } from "@/utils/initialize-storage";
import { uploadImageToLocal } from "@/lib/storage-config";

// Extract text from a paper
export const extractText = async (paperId: string): Promise<TestPaper> => {
  try {
    console.log(`Starting text extraction for paper ID: ${paperId}`);
    
    // Ensure user is authenticated
    const { data: sessionData, error: authError } = await supabase.auth.getSession();
    if (authError || !sessionData?.session?.user) {
      console.error("Authentication error:", authError || "No user session found");
      throw new Error("You must be logged in to extract text from papers");
    }
    
    // First, get the paper details to access the file URL
    const { data: paper, error: paperError } = await supabase
      .from("test_papers")
      .select("*")
      .eq("id", paperId)
      .maybeSingle();
    
    if (paperError) {
      console.error("Error fetching paper details:", paperError);
      throw new Error(`Error fetching paper details: ${paperError.message}`);
    }
    
    if (!paper || !paper.file_url) {
      console.error("Paper does not have a file URL");
      throw new Error("Paper does not have a file URL");
    }
    
    console.log(`Starting PDF processing for paper: ${paper.title}`);
    
    // First, update paper to show processing status
    const { error: statusUpdateError } = await supabase
      .from("test_papers")
      .update({
        has_extracted_text: false,
        extracted_text: "Text extraction in progress: Preparing document..."
      })
      .eq("id", paperId);
      
    if (statusUpdateError) {
      console.error("Error updating paper with processing status:", statusUpdateError);
      throw new Error("Permission denied: You don't have access to update this paper.");
    }
    
    // Fetch the PDF file with timeout handling
    let pdfResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // Increased to 300 seconds
      
      pdfResponse = await fetch(paper.file_url, { 
        signal: controller.signal,
        cache: 'no-store' // Prevent caching
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      console.error("Error fetching PDF:", fetchError);
      throw new Error(`Failed to fetch PDF file: ${fetchError.message}`);
    }
    
    if (!pdfResponse || !pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF file: ${pdfResponse?.statusText || 'Unknown error'}`);
    }
    
    const pdfBlob = await pdfResponse.blob();
    const pdfFile = new File([pdfBlob], `${paper.title}.pdf`, { type: 'application/pdf' });
    
    console.log(`Downloaded PDF file: ${pdfFile.name}, size: ${pdfFile.size} bytes, type: ${pdfFile.type}`);
    
    // Validate the file
    const validation = validateFile(pdfFile);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }
    
    if (validation.message) {
      toast.info(validation.message);
    }
    
    // Update status to show we're processing PDF pages
    await supabase
      .from("test_papers")
      .update({
        extracted_text: "Text extraction in progress: Converting PDF to images..."
      })
      .eq("id", paperId);
      
    // Convert PDF to images with optimized settings for OCR
    let imageDataUrls;
    try {
      imageDataUrls = await convertPdfToImages(pdfFile, {
        quality: 0.95,     // Higher quality for OCR
        grayscale: true,   // Keep grayscale for better OCR
        maxWidth: 2000,    // Higher resolution for OCR
        imageFormat: 'png' // Using PNG format for better OCR compatibility
      });
    } catch (pdfError) {
      console.error('PDF conversion error:', pdfError);
      
      // Get troubleshooting tips for the specific error
      const troubleshootingTips = getPdfTroubleshootingTips(pdfError.message);
      
      // Create a detailed error message with troubleshooting tips
      const errorMessage = `PDF processing failed: ${pdfError.message}

Troubleshooting tips:
${troubleshootingTips.map((tip, index) => `${index + 1}. ${tip}`).join('\n')}

Please try uploading a different PDF file.`;
      
      // Update the database with the detailed error
      await supabase
        .from("test_papers")
        .update({
          extracted_text: errorMessage,
          has_extracted_text: false
        })
        .eq("id", paperId);
      
      // Show a toast with the main error
      toast.error(`PDF processing failed: ${pdfError.message}`);
      
      throw new Error(`Failed to convert PDF to images: ${pdfError.message}`);
    }
    
    console.log(`Converted PDF to ${imageDataUrls.length} images`);
    
    if (imageDataUrls.length === 0) {
      throw new Error("Failed to convert PDF to images");
    }

    // Process all pages with optimized batch processing
    const maxPages = imageDataUrls.length; // Process all pages
    console.log(`Processing ${maxPages} pages with optimized batch processing`);
    
    // Use larger batches for better performance
    const BATCH_SIZE = 10; // Optimized for Azure OpenAI batch processing
    const batches = [];
    
    for (let i = 0; i < maxPages; i += BATCH_SIZE) {
      batches.push(imageDataUrls.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Created ${batches.length} batches for processing`);
    
    // Process batches with concurrent requests for better performance
    let allExtractedText: string[] = [];
    const CONCURRENT_BATCHES = 5; // Optimized for Azure OpenAI concurrent processing
    
    for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
      const currentBatchGroup = batches.slice(i, i + CONCURRENT_BATCHES);
      
      // Update progress
      await supabase
        .from("test_papers")
        .update({
          extracted_text: `Text extraction in progress: Processing batches ${i + 1} to ${Math.min(i + CONCURRENT_BATCHES, batches.length)} of ${batches.length}...`
        })
        .eq("id", paperId);
      
      // Process current batch group concurrently
      const batchPromises = currentBatchGroup.map(async (batchImages, batchIndex) => {
        const globalBatchIndex = i + batchIndex;
        const base64Images = batchImages.map(dataUrl => dataUrl.split(',')[1]);
        
        try {
          console.log(`Processing batch ${globalBatchIndex + 1} with ${batchImages.length} images...`);
          
          const { data, error } = await supabase.functions.invoke("extract-text", {
            body: { 
              documentType: 'question',
              paperId,
              base64Images
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
      allExtractedText.push(...batchResults);
      
      // Update paper with partial results for better user experience
      const partialText = allExtractedText.join("\n\n--- PAGE BREAK ---\n\n");
      await supabase
        .from("test_papers")
        .update({
          has_extracted_text: true,
          extracted_text: partialText,
          last_extracted_at: new Date().toISOString()
        })
        .eq("id", paperId);
        
      console.log(`Completed batch group ${Math.floor(i / CONCURRENT_BATCHES) + 1}`);
      
      // Small delay between batch groups
      if (i + CONCURRENT_BATCHES < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Combine all batches
    const combinedText = allExtractedText.join("\n\n--- PAGE BREAK ---\n\n");
    
    console.log("Text extraction complete, updating paper data...");
    
    // Check if we actually extracted any meaningful text
    const hasMeaningfulText = allExtractedText.some(text => {
      return text && !text.includes('[Error processing') && !text.includes('[Failed to extract') && !text.includes('[No text extracted');
    });
    
    if (!hasMeaningfulText) {
      throw new Error("No meaningful text was extracted from any pages. Please try again.");
    }
    
    // Create metadata
    const metaData = {
      ...(paper.metadata || {}),
      processingDate: new Date().toISOString(),
      totalPages: imageDataUrls.length,
      processedPages: maxPages,
      batchesProcessed: batches.length,
      batchSize: BATCH_SIZE,
      concurrentBatches: CONCURRENT_BATCHES,
      processingMethod: 'optimized-concurrent'
    };
    
    // Update the paper with the complete extracted text
    const { data: updatedPaper, error: finalUpdateError } = await supabase
      .from("test_papers")
      .update({
        has_extracted_text: true,
        extracted_text: combinedText,
        last_extracted_at: new Date().toISOString(),
        metadata: metaData
      })
      .eq("id", paperId)
      .select()
      .single();
    
    if (finalUpdateError) {
      throw new Error(`Error updating paper with extracted text: ${finalUpdateError.message}`);
    }
    
    console.log("Paper data updated successfully with extracted text");
    return formatPaperData(updatedPaper);
    
    // Note: We're now using the optimized concurrent processing approach above
    // No need to upload images to storage - everything is processed in memory
    console.log("Using optimized concurrent processing - no image storage required");
  } catch (error) {
    console.error("Text extraction failed:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    // Update paper record with error information
    try {
      const errorMessage = error.message || "Unknown error occurred during text extraction.";
      
      let detailedError = `The OCR service was unable to properly extract text from this document.\n\nError: ${errorMessage}`;
      
      // Add note about large documents if the error suggests it might be a large document issue
      if (errorMessage.includes('timeout') || errorMessage.includes('large') || errorMessage.includes('40')) {
        detailedError += `\n\nNote: For large documents (40+ pages), we process the first 50 pages to ensure reliable extraction.`;
      }
      
      detailedError += `\n\nPlease try again or contact support if the problem persists.`;
      
      await supabase
        .from("test_papers")
        .update({
          has_extracted_text: true, // Mark as having text so user can see error
          extracted_text: detailedError,
          last_extracted_at: new Date().toISOString()
        })
        .eq("id", paperId);
    } catch (updateError) {
      console.error("Failed to update paper with error information:", updateError);
    }
    
    throw error;
  }
};

// Helper function to convert a Blob to a base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Utility: Send a base64 image to OpenAI Vision API and get extracted text
async function extractTextFromImageWithOpenAI(base64Image: string, prompt: string, apiKey: string): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
  const body = {
    model: "gpt-4o", // Use gpt-4o for best OCR
    messages: [
      {
        role: "system",
        content: "You are an OCR assistant. Extract all visible text from the provided image as accurately as possible, preserving formatting, line breaks, and any mathematical symbols."
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { "url": `data:image/png;base64,${base64Image}` } }
        ]
      }
    ],
    max_tokens: 4096,
    temperature: 0.0
  };
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Vision API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  // Extract the text from the response
  const text = data.choices?.[0]?.message?.content || "";
  return text;
}