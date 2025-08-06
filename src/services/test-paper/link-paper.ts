
import { supabase } from "@/integrations/supabase/client";
import type { TestPaper } from "@/types/test-papers";
import { formatPaperData } from "./test-paper-base";

/**
 * Links an existing paper to a test
 * @param paperId ID of the existing paper
 * @param testId ID of the test to link the paper to
 * @returns The updated test paper
 */
export const linkPaperToTest = async (paperId: string, testId: string): Promise<TestPaper> => {
  // Get the current paper details
  const { data: paperData, error: fetchError } = await supabase
    .from("test_papers")
    .select("*")
    .eq("id", paperId)
    .single();
  
  if (fetchError) {
    throw new Error(`Failed to fetch paper: ${fetchError.message}`);
  }
  
  // Update the paper with the test ID
  const { data, error } = await supabase
    .from("test_papers")
    .update({ test_id: testId })
    .eq("id", paperId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to link paper to test: ${error.message}`);
  }
  
  return formatPaperData(data) as TestPaper;
};
