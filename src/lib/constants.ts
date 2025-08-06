export const ADMIN_EMAIL = "jainilpadmani99@gmail.com";
export const ADMIN_ROUTE = "/admingl304";

// Feature flags for admin panel
export const FEATURE_FLAGS = {
  TEST_MANAGEMENT: "test_management",
  SUBJECT_MANAGEMENT: "subject_management",
  AI_MCQ_GENERATION: "ai_mcq_generation",
  AI_THEORY_QUESTIONS: "ai_theory_questions",
  AUTO_PAPER_GRADING: "auto_paper_grading",
  HANDWRITING_RECOGNITION: "handwriting_recognition",
  PLAGIARISM_DETECTION: "plagiarism_detection",
} as const;

// User status
export const USER_STATUS = {
  ACTIVE: "active",
  BLOCKED: "blocked",
} as const; 