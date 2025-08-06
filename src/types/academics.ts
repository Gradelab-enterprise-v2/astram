export interface Class {
  id: string;
  name: string;
  year: string;
  grade?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  department?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  class: string;
  semester?: string;
  information?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  created_at?: string;
  user_id?: string;
}

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  gr_number: string;
  year: string;
  gender?: string;
  profile_picture?: string;
  date_of_birth?: string;
  address?: string;
  phone?: string;
  email?: string;
  parent_name?: string;
  parent_contact?: string;
  notes?: string;
  department?: string;
  class_id?: string;
  class?: Class;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface Department {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface Test {
  id: string;
  title: string;
  date: string;
  max_marks: number;
  subject_id: string;
  class_id: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface TestResult {
  id: string;
  test_id: string;
  student_id: string;
  marks_obtained: number;
  created_at?: string;
  updated_at?: string;
}

export interface CourseOutcome {
  id: string;
  subject_id: string;
  description: string;
  display_number: number;
  created_at?: string;
  updated_at?: string;
}

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
  updated_at?: string;
}

export interface GeneratedQuestion {
  id: string;
  question_text: string;
  answer_text?: string;
  question_type: "MCQ" | "Theory";
  topic: string;
  bloom_level?: string;
  difficulty?: number;
  marks?: number;
  options?: QuestionOption[];
  subject_id: string;
  subject?: Subject;
  course_outcome_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionOption {
  text: string;
  is_correct: boolean;
}

export interface GeneratedPaper {
  id: string;
  title: string;
  subject_id: string;
  user_id?: string;
  question_mode: string;
  difficulty: number;
  question_count: number;
  content_reference?: string;
  bloomsdata?: any;
  created_at?: string;
}

export interface SubjectEnrollment {
  id: string;
  student_id: string;
  subject_id: string;
  subject?: Subject;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}
