import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { convertPdfToImages, validateFile, dataUrlToBlob } from "@/utils/pdf-processor";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export interface ChapterMaterial {
  id: string;
  title: string;
  file_url: string;
  has_extracted_text: boolean;
  text_content: string | null;
  status: string;
  extraction_status: string;
  subject_id?: string;
  created_at: string;
}

interface ExtractionOptions {
  batchSize?: number;
  onProgress?: (progress: number, batchText: string | null, batchNumber: number, totalBatches: number) => void;
}

export function useChapterMaterials() {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const { user } = useAuth();

  const uploadDocument = async (file: File, title: string, subjectId?: string): Promise<ChapterMaterial | null> => {
    if (!user) {
      toast.error("You must be logged in to upload documents");
      return null;
    }

    setIsUploading(true);
    try {
      const validation = validateFile(file);
      if (!validation.isValid) {
        toast.error(validation.message);
        return null;
      }

      const fileName = `${user.id}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("chapter_materials")
        .upload(fileName, file);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error(`Error uploading file: ${uploadError.message}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("chapter_materials")
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from("analysis_history")
        .insert([{
          title: title,
          file_url: publicUrl,
          status: "processing",
          subject_id: subjectId,
          has_extracted_text: false,
          extraction_status: "pending",
          user_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creating record:", error);
        toast.error(`Error creating document record: ${error.message}`);
        return null;
      }

      toast.success("Document uploaded successfully");
      
      // Don't automatically extract text, let the user initiate it
      return data;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred while uploading the document");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const extractTextFromDocument = async (
    document: ChapterMaterial,
    options: ExtractionOptions = {}
  ) => {
    if (!document.file_url) {
      toast.error("Document has no file URL");
      return null;
    }

    if (document.has_extracted_text && document.text_content) {
      console.log("Text already extracted for this document, skipping extraction");
      return document.text_content;
    }

    setIsExtracting(true);
    
    const { batchSize = 10, onProgress } = options;

    await supabase
      .from("analysis_history")
      .update({
        extraction_status: "processing",
        extraction_started_at: new Date().toISOString()
      })
      .eq("id", document.id);

    try {
      const response = await fetch(document.file_url);
      const blob = await response.blob();
      const file = new File([blob], document.title, { type: blob.type });

      // Convert PDF to images
      const imageDataUrls = await convertPdfToImages(file, {
        quality: 0.95,
        grayscale: true,
        maxWidth: 2000,
        imageFormat: 'png'
      });

      if (imageDataUrls.length === 0) {
        throw new Error("Failed to convert document to images");
      }

      // Limit processing to first 40 pages to avoid timeouts
      const maxPages = Math.min(imageDataUrls.length, 40);
      if (imageDataUrls.length > maxPages) {
        console.warn(`Document has ${imageDataUrls.length} pages, limiting to first ${maxPages} pages to avoid timeouts`);
        imageDataUrls.splice(maxPages); // Keep only first 40 pages
      }

      console.log(`Converted PDF to ${imageDataUrls.length} images (limited to ${maxPages} pages)`);
      
      // Process images in batches using base64 (like student sheets)
      let allExtractedText = [];
      
      for (let i = 0; i < imageDataUrls.length; i += batchSize) {
        const batchDataUrls = imageDataUrls.slice(i, i + batchSize);
        const batchBase64Images = batchDataUrls.map(dataUrl => dataUrl.split(',')[1]); // Extract base64 part
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(imageDataUrls.length / batchSize);
        
        console.log(`Processing batch ${batchNumber} of ${totalBatches} (pages ${i + 1} to ${Math.min(i + batchSize, imageDataUrls.length)})...`);
        
        // Update progress
        const progress = Math.floor(((i) / imageDataUrls.length) * 100);
        
        if (onProgress) {
          onProgress(
            progress, 
            i > 0 ? allExtractedText.join("\n\n") : null,
            batchNumber,
            totalBatches
          );
        }

        try {
          // Process batch of images using extract-text function
          const { data, error } = await supabase.functions.invoke("extract-text", {
            body: { 
              documentType: 'chapter-material',
              sheetId: document.id,
              base64Images: batchBase64Images
            }
          });

          if (error) {
            console.error(`Error processing batch ${batchNumber}:`, error);
            allExtractedText.push(`=== BATCH ${batchNumber} (Pages ${i + 1}-${Math.min(i + batchSize, imageDataUrls.length)}) ===\n\n[Error processing batch: ${error.message || 'Unknown error'}]`);
            continue;
          }

          if (data && data.success && data.extractedText) {
            // The extract-text function now returns text with proper page markers
            // Each page should be marked with === PAGE X ===
            allExtractedText.push(data.extractedText);
          } else {
            allExtractedText.push(`=== BATCH ${batchNumber} (Pages ${i + 1}-${Math.min(i + batchSize, imageDataUrls.length)}) ===\n\n[No text extracted from this batch]`);
          }
          
          // Update the document with partial results after every batch
          const partialText = allExtractedText.join("\n\n");
          await supabase
            .from("analysis_history")
            .update({
              text_content: partialText,
              extraction_status: i + batchSize < imageDataUrls.length ? "processing" : "completed"
            })
            .eq("id", document.id);
            
          if (onProgress) {
            onProgress(
              Math.floor(((i + batchSize) / imageDataUrls.length) * 100),
              partialText,
              batchNumber,
              totalBatches
            );
          }
            
          console.log(`Processed batch ${batchNumber} of ${totalBatches}`);
        } catch (batchError) {
          console.error(`Error processing batch ${batchNumber}:`, batchError);
          allExtractedText.push(`=== BATCH ${batchNumber} (Pages ${i + 1}-${Math.min(i + batchSize, imageDataUrls.length)}) ===\n\n[Error processing batch: ${batchError.message || 'Unknown error'}]`);
        }
      }

      const combinedText = allExtractedText.join("\n\n");
      
      // Check if we have any successful extractions (not just error messages)
      const hasSuccessfulExtractions = allExtractedText.some(text => 
        !text.includes('[Error processing') && 
        !text.includes('[No text extracted') && 
        text.trim().length > 0
      );
      
      if (!hasSuccessfulExtractions) {
        throw new Error("Failed to extract any text from the document. Please try again.");
      }
      
      // Validate that we got meaningful text
      if (!combinedText || combinedText.trim().length === 0) {
        throw new Error("No text was extracted from the document. Please try again.");
      }
      
      console.log("Text extraction complete, updating document data...");
      
      const { error: finalUpdateError } = await supabase
        .from("analysis_history")
        .update({
          has_extracted_text: true,
          text_content: combinedText,
          extraction_status: "completed",
          last_extracted_at: new Date().toISOString()
        })
        .eq("id", document.id);
      
      if (finalUpdateError) {
        console.error("Error updating document with extracted text:", finalUpdateError);
        throw new Error(`Error updating document with extracted text: ${finalUpdateError.message}`);
      }
      
      if (onProgress) {
        onProgress(100, combinedText, imageDataUrls.length, imageDataUrls.length);
      }
      
      console.log("Document data updated successfully with extracted text");
      return combinedText;
    } catch (error) {
      console.error("Text extraction failed:", error);
      
      await supabase
        .from("analysis_history")
        .update({
          extraction_status: "failed"
        })
        .eq("id", document.id);
        
      toast.error(`Text extraction failed: ${error.message || "Unknown error"}`);
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  const getChapterMaterials = async (subjectId?: string) => {
    if (!user) return [];

    try {
      let query = supabase
        .from("analysis_history")
        .select("*")
        .eq("user_id", user.id);
      
      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching chapter materials:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching chapter materials:", error);
      return [];
    }
  };

  const getChapterMaterial = async (id: string): Promise<ChapterMaterial | null> => {
    try {
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching chapter material:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching chapter material:", error);
      return null;
    }
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
    if (!user) {
      toast.error("You must be logged in to delete documents");
      return false;
    }

    try {
      // First, get the document to check if it exists and belongs to the user
      const { data: document, error: fetchError } = await supabase
        .from("analysis_history")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        console.error("Error fetching document:", fetchError);
        toast.error("Could not find document to delete");
        return false;
      }

      if (!document) {
        toast.error("Document not found");
        return false;
      }

      // Delete the file from storage if file_url exists
      if (document.file_url) {
        try {
          // Extract the file path from the URL
          const fileUrlParts = document.file_url.split('chapter_materials/');
          if (fileUrlParts.length > 1) {
            const filePath = fileUrlParts[1].split('?')[0];
            
            if (filePath) {
              console.log("Attempting to delete file:", filePath);
              const { error: storageError } = await supabase.storage
                .from("chapter_materials")
                .remove([filePath]);
              
              if (storageError) {
                console.error("Error deleting file from storage:", storageError);
                // Continue with deletion even if storage removal fails
              } else {
                console.log("Successfully deleted file from storage:", filePath);
              }
            }
          }
          
          // Delete any converted images from the ocr-images bucket
          try {
            // First, check if the directory exists
            const { data: imageFiles, error: listError } = await supabase.storage
              .from("ocr-images")
              .list(`document-images/${id}`);
              
            if (!listError && imageFiles && imageFiles.length > 0) {
              // Delete each image file found
              const imagePaths = imageFiles.map(file => `document-images/${id}/${file.name}`);
              console.log("Attempting to delete image files:", imagePaths);
              
              const { error: imagesError } = await supabase.storage
                .from("ocr-images")
                .remove(imagePaths);
                
              if (imagesError) {
                console.error("Error deleting images from storage:", imagesError);
              } else {
                console.log(`Successfully deleted ${imagePaths.length} image files for document ${id}`);
              }
            }
          } catch (imageError) {
            console.error("Error handling image deletion:", imageError);
            // Continue with deletion even if image removal fails
          }
        } catch (storageError) {
          console.error("Error processing storage deletion:", storageError);
          // Continue with deletion even if storage removal fails
        }
      }

      // Delete the record from the database
      const { error: deleteError } = await supabase
        .from("analysis_history")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("Error deleting document:", deleteError);
        throw new Error(deleteError.message);
      }

      console.log("Document successfully deleted from database:", id);
      return true;
    } catch (error) {
      console.error("Error deleting document:", error);
      throw error;
    }
  };

  return {
    uploadDocument,
    extractTextFromDocument,
    getChapterMaterials,
    getChapterMaterial,
    deleteDocument,
    isUploading,
    isExtracting
  };
}
