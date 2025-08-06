
import { supabase } from "@/integrations/supabase/client";
import type { TestPaper } from "@/types/test-papers";
import { formatPaperData } from "./test-paper-base";

// Fetch papers by test ID
export const fetchPapersByTest = async (testId: string): Promise<TestPaper[]> => {
  const { data, error } = await supabase
    .from("test_papers")
    .select("*")
    .eq("test_id", testId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Use explicit type casting to avoid deep instantiation issues
  return (data || []).map(paper => formatPaperData(paper) as TestPaper);
};

// Fetch papers by subject ID
export const fetchPapersBySubject = async (subjectId: string): Promise<TestPaper[]> => {
  const { data, error } = await supabase
    .from("test_papers")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Use explicit type casting to avoid deep instantiation issues
  return (data || []).map(paper => formatPaperData(paper) as TestPaper);
};
