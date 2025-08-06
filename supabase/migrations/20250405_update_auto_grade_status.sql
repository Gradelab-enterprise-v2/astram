
-- Update auto_grade_status table to include a JSON column for evaluation results
ALTER TABLE public.auto_grade_status 
ADD COLUMN IF NOT EXISTS evaluation_result JSONB;
