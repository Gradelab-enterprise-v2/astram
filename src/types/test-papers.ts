export interface TestPaper {
  id: string;
  test_id?: string;
  title: string;
  file_url: string;
  paper_type: "question" | "answer";
  has_extracted_text: boolean;
  extracted_text?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  subject_id?: string;
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
  selected?: boolean; // Added to track selection in UI
  metadata?: any; // Add metadata field to match with formatPaperData
  generated_answer_key?: string; // AI-generated answer key
}

export interface AutoGradeStatus {
  student_id: string;
  test_id: string;
  answer_sheet_id?: string;
  status: "pending" | "processing" | "completed" | "failed";
  score?: number;
  created_at: string;
  updated_at: string;
  feedback?: string;
  evaluation_result?: any; // For storing the detailed grading result
}

// Import Student from academics types to avoid circular dependency
import { Student } from "./academics";

// Export for convenience
export type { Student };
