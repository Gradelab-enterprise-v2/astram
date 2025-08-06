
import type { TestPaper } from "@/types/test-papers";

// Format paper data to ensure it conforms to our TestPaper type
export const formatPaperData = (paper: any): TestPaper => {
  return {
    id: paper.id,
    test_id: paper.test_id || undefined, // Make test_id optional in the returned object
    title: paper.title,
    file_url: paper.file_url,
    paper_type: paper.paper_type as "question" | "answer",
    has_extracted_text: paper.has_extracted_text || false,
    extracted_text: paper.extracted_text,
    user_id: paper.user_id,
    created_at: paper.created_at,
    updated_at: paper.updated_at,
    subject_id: paper.subject_id || undefined, // Make subject_id optional in the returned object
    metadata: paper.metadata || undefined, // Include metadata if available
  };
};
