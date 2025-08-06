
export interface StudentAnswerSheet {
  id: string;
  student_id: string;
  test_id: string;
  file_url: string;
  has_extracted_text: boolean;
  extracted_text?: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface UploadAnswerSheetParams {
  file: File;
  studentId: string;
  testId: string;
}
