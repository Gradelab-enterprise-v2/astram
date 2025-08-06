
import { supabase } from "@/integrations/supabase/client";
import { TestPaper } from "@/types/test-papers";
import { formatPaperData } from "./test-paper-base";

interface DeletePaperParams {
  paperId: string;
  deleteRelated?: boolean;
}

// Delete a paper and related resources
export const deletePaper = async ({ paperId, deleteRelated = false }: DeletePaperParams): Promise<TestPaper> => {
  try {
    // First, get the paper to access its details
    const { data: paper, error: paperError } = await supabase
      .from("test_papers")
      .select("*")
      .eq("id", paperId)
      .single();
    
    if (paperError) {
      throw new Error(`Error fetching paper: ${paperError.message}`);
    }
    
    if (!paper) {
      throw new Error("Paper not found");
    }
    
    // If deleteRelated is true, find and delete related papers
    if (deleteRelated) {
      // Try to determine related paper based on title pattern
      const isTitleMatch = (title1: string, title2: string) => {
        // Remove " - Question Paper" or " - Answer Key" from the titles
        const baseTitle1 = title1.replace(/ - (Question Paper|Answer Key)$/i, "");
        const baseTitle2 = title2.replace(/ - (Question Paper|Answer Key)$/i, "");
        
        return baseTitle1.toLowerCase() === baseTitle2.toLowerCase();
      };
      
      const isRelatedPaper = (p: any) => {
        return p.id !== paperId && 
               p.paper_type !== paper.paper_type && 
               isTitleMatch(p.title, paper.title);
      };
      
      // Try to find the related paper by querying all papers with the same subject_id
      if (paper.subject_id) {
        const { data: subjectPapers, error: spError } = await supabase
          .from("test_papers")
          .select("*")
          .eq("subject_id", paper.subject_id);
        
        if (!spError && subjectPapers) {
          const relatedPaper = subjectPapers.find(isRelatedPaper);
          
          if (relatedPaper) {
            console.log(`Found related paper ${relatedPaper.id}, deleting...`);
            
            // Delete related paper files from storage
            try {
              // Delete any OCR images
              const { data: ocrFiles } = await supabase.storage
                .from("papers")
                .list(`paper-images/${relatedPaper.id}`);
              
              if (ocrFiles && ocrFiles.length > 0) {
                const ocrFilePaths = ocrFiles.map(file => `paper-images/${relatedPaper.id}/${file.name}`);
                await supabase.storage.from("papers").remove(ocrFilePaths);
              }
              
              // Delete the main file if possible (extract file path from URL)
              const filePathMatch = relatedPaper.file_url.match(/\/papers\/([^?]+)/);
              if (filePathMatch && filePathMatch[1]) {
                await supabase.storage.from("papers").remove([filePathMatch[1]]);
              }
            } catch (storageError) {
              console.error("Error deleting related paper storage files:", storageError);
              // Continue with database deletion even if storage deletion fails
            }
            
            // Delete from database
            await supabase
              .from("test_papers")
              .delete()
              .eq("id", relatedPaper.id);
          }
        }
      }
    }
    
    // Delete paper files from storage
    try {
      // Delete any OCR images
      const { data: ocrFiles } = await supabase.storage
        .from("papers")
        .list(`paper-images/${paperId}`);
      
      if (ocrFiles && ocrFiles.length > 0) {
        const ocrFilePaths = ocrFiles.map(file => `paper-images/${paperId}/${file.name}`);
        await supabase.storage.from("papers").remove(ocrFilePaths);
      }
      
      // Delete the main file if possible (extract file path from URL)
      const filePathMatch = paper.file_url.match(/\/papers\/([^?]+)/);
      if (filePathMatch && filePathMatch[1]) {
        await supabase.storage.from("papers").remove([filePathMatch[1]]);
      }
    } catch (storageError) {
      console.error("Error deleting paper storage files:", storageError);
      // Continue with database deletion even if storage deletion fails
    }
    
    // Delete from database
    const { data, error } = await supabase
      .from("test_papers")
      .delete()
      .eq("id", paperId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error deleting paper: ${error.message}`);
    }
    
    return formatPaperData(data);
  } catch (error) {
    console.error("Delete paper error:", error);
    throw error;
  }
};
