
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
