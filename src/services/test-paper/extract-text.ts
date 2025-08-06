import { supabase } from "@/integrations/supabase/client";
import { TestPaper } from "@/types/test-papers";
import { formatPaperData } from "./test-paper-base";
import { convertPdfToImages, dataUrlToBlob, validateFile } from "@/utils/pdf-processor";
import { toast } from "sonner";
import { ensureBucket, userHasBucketAccess } from "@/utils/initialize-storage";

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
    const imageDataUrls = await convertPdfToImages(pdfFile, {
      quality: 0.95,     // Higher quality for OCR
      grayscale: true,   // Keep grayscale for better OCR
      maxWidth: 2000,    // Higher resolution for OCR
      imageFormat: 'png' // Using PNG format for better OCR compatibility
    });
    
    console.log(`Converted PDF to ${imageDataUrls.length} images`);
    
    if (imageDataUrls.length === 0) {
      throw new Error("Failed to convert PDF to images");
    }

    // Process all pages, but be mindful of potential timeout issues
    // For large documents, process more pages but in smaller batches
    const maxPages = Math.min(imageDataUrls.length, imageDataUrls.length > 40 ? 50 : 20);
    if (imageDataUrls.length > maxPages) {
      toast.warning(`Processing the first ${maxPages} pages out of ${imageDataUrls.length} total pages to ensure reliable extraction.`);
      console.log(`Limited to processing ${maxPages} pages out of ${imageDataUrls.length} total pages`);
    }
    
    // Check if the user has access to the ocr-images bucket
    const hasAccess = await userHasBucketAccess('ocr-images');
    
    // Update status about the approach we're taking
    await supabase
      .from("test_papers")
      .update({
        extracted_text: hasAccess 
          ? "Text extraction in progress: Uploading images for processing..." 
          : "Text extraction in progress: Processing images..."
      })
      .eq("id", paperId);
    
    if (!hasAccess) {
      console.log("Using direct processing method");
      
      // Process in batches using base64 encoding for the images
      // Use smaller batches for large documents to prevent timeouts
      const batchSize = imageDataUrls.length > 40 ? 5 : 10; // Smaller batches for large documents
      const batches = [];
      
      for (let i = 0; i < Math.min(maxPages, imageDataUrls.length); i += batchSize) {
        batches.push(imageDataUrls.slice(i, i + batchSize));
      }
      
      console.log(`Created ${batches.length} batches for processing`);
      
      let allExtractedText = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batchUrls = batches[i];
        console.log(`Processing batch ${i + 1} of ${batches.length} with ${batchUrls.length} images...`);
        
        // Update progress in the database for frontend to read
        await supabase
          .from("test_papers")
          .update({
            extracted_text: `Text extraction in progress: Processing batch ${i + 1} of ${batches.length}...`
          })
          .eq("id", paperId);
        
        try {
          // Convert the image data URLs to base64 strings
          const base64Images = batchUrls.map(dataUrl => {
            // Remove the data:image/png;base64, prefix
            return dataUrl.split(',')[1];
          });
          
          const { data, error } = await supabase.functions.invoke("extract-text", {
            body: { 
              documentType: 'question',
              paperId,
              base64Images
            }
          });
          
          if (error) {
            console.error(`Error in batch ${i + 1}:`, error);
            allExtractedText.push(`[Error processing pages ${i * batchSize + 1}-${i * batchSize + batchUrls.length}: ${error.message || 'Unknown error'}]`);
            continue;
          }
          
          if (data && data.extractedText) {
            allExtractedText.push(data.extractedText);
          } else {
            allExtractedText.push(`[No text extracted from pages ${i * batchSize + 1}-${i * batchSize + batchUrls.length}]`);
          }
        } catch (batchError) {
          console.error(`Error processing batch ${i + 1}:`, batchError);
          allExtractedText.push(`[Error processing pages ${i * batchSize + 1}-${i * batchSize + batchUrls.length}: ${batchError.message || 'Unknown error'}]`);
        }
        
        // Update paper with partial results for better user experience
        if (i === 0 || i === batches.length - 1 || i % 3 === 0) {
          const partialText = allExtractedText.join("\n\n--- PAGE BREAK ---\n\n");
          await supabase
            .from("test_papers")
            .update({
              has_extracted_text: true,
              extracted_text: partialText,
              last_extracted_at: new Date().toISOString()
            })
            .eq("id", paperId);
            
          console.log(`Updated paper with batch ${i+1} results`);
        }
      }
      
      // Combine all batches
      const combinedText = allExtractedText.join("\n\n--- PAGE BREAK ---\n\n");
      
      console.log("Text extraction complete, updating paper data...");
      
      // Check if we actually extracted any meaningful text
      console.log("Checking for meaningful text...");
      console.log("All extracted text entries:", allExtractedText.length);
      
      const hasMeaningfulText = allExtractedText.some(text => {
        const isMeaningful = text && !text.includes('[Error processing') && !text.includes('[No text extracted');
        console.log("Text entry:", text?.substring(0, 100) + "...", "Meaningful:", isMeaningful);
        return isMeaningful;
      });
      
      console.log("Has meaningful text:", hasMeaningfulText);
      
      if (!hasMeaningfulText) {
        console.error("No meaningful text found in any batches");
        throw new Error("No meaningful text was extracted from any pages. Please try again.");
      }
      
      // Create or update metadata
      const metaData = {
        ...(paper.metadata || {}),
        processingDate: new Date().toISOString(),
        totalPages: imageDataUrls.length,
        processedPages: maxPages,
        batchesProcessed: batches.length
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
        console.error("Error updating paper with extracted text:", finalUpdateError);
        throw new Error(`Error updating paper with extracted text: ${finalUpdateError.message}`);
      }
      
      console.log("Paper data updated successfully with extracted text");
      console.log("About to return formatted paper data...");
      try {
        const formattedPaper = formatPaperData(updatedPaper);
        console.log("Successfully formatted paper data");
        return formattedPaper;
      } catch (formatError) {
        console.error("Error formatting paper data:", formatError);
        throw new Error(`Error formatting paper data: ${formatError.message}`);
      }
    }
    
    // Make sure ocr-images bucket exists
    try {
      await ensureBucket('ocr-images');
      console.log("Successfully ensured ocr-images bucket exists");
    } catch (bucketError) {
      console.error("Error creating ocr-images bucket:", bucketError);
      // Continue anyway - bucket might already exist
    }

    // Create a unique name for the ZIP file containing the images
    const zipFileName = `${paperId}_${Date.now()}.zip`;
    console.log(`Creating ZIP file: ${zipFileName}`);
    
    // Update status to show we're uploading images
    await supabase
      .from("test_papers")
      .update({
        extracted_text: "Text extraction in progress: Uploading images for processing..."
      })
      .eq("id", paperId);
    
    // Upload images to Supabase Storage
    const imageUrls: string[] = [];
    
    for (let i = 0; i < maxPages; i++) {
      const imageBlob = dataUrlToBlob(imageDataUrls[i]);
      const imageFile = new File([imageBlob], `page_${i + 1}.png`, { type: 'image/png' });
      
      const filePath = `paper-images/${paperId}/page_${i + 1}.png`;
      
      try {
        // Get the current authenticated user
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          throw new Error("User not authenticated");
        }
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("ocr-images")
          .upload(filePath, imageFile, {
            upsert: true,
            contentType: 'image/png'
          });
        
        if (uploadError) {
          console.error(`Error uploading image ${i + 1}:`, uploadError);
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from("ocr-images")
          .getPublicUrl(filePath);
        
        // Validate that the image URL is accessible
        try {
          const checkResponse = await fetch(publicUrl, { method: 'HEAD', cache: 'no-store' });
          if (!checkResponse.ok) {
            console.error(`Image URL validation failed for ${publicUrl}: ${checkResponse.status}`);
            continue;
          }
        } catch (validationError) {
          console.error(`Error validating image URL ${publicUrl}:`, validationError);
          continue;
        }
        
        imageUrls.push(publicUrl);
        console.log(`Successfully uploaded image ${i + 1} to ${publicUrl}`);
      } catch (uploadError) {
        console.error(`Error in upload process for image ${i + 1}:`, uploadError);
        continue;
      }
    }
    
    if (imageUrls.length === 0) {
      throw new Error("Failed to upload any images to storage");
    }
    
    console.log(`Successfully uploaded ${imageUrls.length} images to storage`);
    console.log(`Calling extract-text Edge Function with ${imageUrls.length} images...`);
    
    // Update status to show OCR processing
    await supabase
      .from("test_papers")
      .update({
        extracted_text: "Text extraction in progress: Performing OCR with GPT-4.1-mini on document images..."
      })
      .eq("id", paperId);
    
    // Call the extract-text Supabase Edge Function
    // Process in batches to improve reliability
    const batchSize = 10; // Process 10 images at a time for better efficiency
    const batches = [];
    
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      batches.push(imageUrls.slice(i, i + batchSize));
    }
    
    let allExtractedText = [];
    let modelUsed = "gpt-4.1-mini"; // Updated default model
    
    for (let i = 0; i < batches.length; i++) {
      const batchUrls = batches[i];
      console.log(`Processing batch ${i + 1} of ${batches.length} with ${batchUrls.length} images...`);
      
      // Update progress in the database for frontend to read
      await supabase
        .from("test_papers")
        .update({
          extracted_text: `Text extraction in progress: Processing batch ${i + 1} of ${batches.length} with GPT-4.1-mini...`
        })
        .eq("id", paperId);
      
      try {
        const { data, error } = await supabase.functions.invoke("extract-text", {
          body: { 
            documentType: 'question',
            paperId,
            imageUrls: batchUrls
          }
        });
        
        if (error) {
          console.error(`Error in batch ${i + 1}:`, error);
          allExtractedText.push(`[Error processing pages ${i * batchSize + 1}-${i * batchSize + batchUrls.length}: ${error.message || 'Unknown error'}]`);
          continue;
        }
        
        if (data && data.extractedText) {
          allExtractedText.push(data.extractedText);
          // Capture model information if available
          if (data.model) {
            modelUsed = data.model;
          }
        } else {
          allExtractedText.push(`[No text extracted from pages ${i * batchSize + 1}-${i * batchSize + batchUrls.length}]`);
        }
      } catch (batchError) {
        console.error(`Error processing batch ${i + 1}:`, batchError);
        allExtractedText.push(`[Error processing pages ${i * batchSize + 1}-${i * batchSize + batchUrls.length}: ${batchError.message || 'Unknown error'}]`);
      }
      
      // Update paper with partial results for better user experience
      if (i === 0 || i === batches.length - 1) {
        const partialText = allExtractedText.join("\n\n--- PAGE BREAK ---\n\n");
        await supabase
          .from("test_papers")
          .update({
            has_extracted_text: true,
            extracted_text: partialText,
            last_extracted_at: new Date().toISOString()
          })
          .eq("id", paperId);
          
        console.log(`Updated paper with batch ${i+1} results`);
      }
    }
    
    // Combine all batches
    const combinedText = allExtractedText.join("\n\n--- PAGE BREAK ---\n\n");
    
    console.log("Text extraction complete, updating paper data...");
    
    // Store the ZIP file name for future reference
    const metaData = {
      ...(paper.metadata || {}),
      zipFileName,
      pageCount: imageUrls.length,
      processingDate: new Date().toISOString(),
      imageFormat: 'png',
      model: modelUsed // Store the model used for extraction
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
      console.error("Error updating paper with extracted text:", finalUpdateError);
      throw new Error(`Error updating paper with extracted text: ${finalUpdateError.message}`);
    }
    
    console.log("Paper data updated successfully with extracted text");
    return formatPaperData(updatedPaper);
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