
import { supabase } from "@/integrations/supabase/client";
import type { TestPaper } from "@/types/test-papers";
import { formatPaperData } from "./test-paper-base";

interface UnlinkPaperParams {
  paperId: string;
  testId: string;
}

/**
 * Unlinks a paper from a test (sets test_id to null) without deleting it
 * @param params Object containing paperId and testId
 * @returns The updated test paper
 */
export const unlinkPaper = async (params: UnlinkPaperParams): Promise<TestPaper> => {
  const { paperId } = params;
  
  // Get the current paper details
  const { data: paperData, error: fetchError } = await supabase
    .from("test_papers")
    .select("*")
    .eq("id", paperId)
    .single();
  
  if (fetchError) {
    throw new Error(`Failed to fetch paper: ${fetchError.message}`);
  }
  
  // Update the paper by removing the test ID
  const { data, error } = await supabase
    .from("test_papers")
    .update({ test_id: null })
    .eq("id", paperId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to unlink paper from test: ${error.message}`);
  }
  
  return formatPaperData(data) as TestPaper;
};
