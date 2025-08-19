
import { Student } from "@/types/academics";

export interface StudentGradingStatus {
  student: Student;
  answerSheetId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  score?: number;
  feedback?: string;
  evaluationResult?: any;
  userFeedback?: any;
}

export interface EvaluationProgress {
  [studentId: string]: number;
}

// New comprehensive evaluation result interface
export interface EvaluationResult {
  student_name: string;
  roll_no: string | number;
  class: string;
  subject: string;
  total_questions_detected: number;
  questions_by_section: {
    [sectionName: string]: number;
  };
  overall_performance: {
    strengths: string[];
    areas_for_improvement: string[];
    study_recommendations: string[];
    personalized_summary: string;
  };
  answers: EvaluationAnswer[];
}

export interface EvaluationAnswer {
  question_no: number;
  section: string;
  question: string;
  expected_answer: string;
  answer: string;
  raw_extracted_text: string;
  score: [number, number]; // [assigned_score, total_score]
  remarks: string;
  confidence: number;
  concepts: string[];
  missing_elements: string[];
  answer_matches: boolean;
  personalized_feedback: string;
  alignment_notes: string;
}
