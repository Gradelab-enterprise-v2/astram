-- Improve generated_questions table structure and add proper indexing

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_questions_user_id ON generated_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_questions_subject_id ON generated_questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_generated_questions_topic ON generated_questions(topic);
CREATE INDEX IF NOT EXISTS idx_generated_questions_created_at ON generated_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_questions_question_type ON generated_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_generated_questions_difficulty ON generated_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_generated_questions_bloom_level ON generated_questions(bloom_level);
CREATE INDEX IF NOT EXISTS idx_generated_questions_course_outcome_id ON generated_questions(course_outcome_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_generated_questions_topic_subject ON generated_questions(topic, subject_id);
CREATE INDEX IF NOT EXISTS idx_generated_questions_user_created ON generated_questions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_questions_subject_type ON generated_questions(subject_id, question_type);

-- Add constraints to ensure data integrity
ALTER TABLE generated_questions 
ADD CONSTRAINT check_question_type 
CHECK (question_type IN ('MCQ', 'Theory'));

ALTER TABLE generated_questions 
ADD CONSTRAINT check_difficulty_range 
CHECK (difficulty >= 0 AND difficulty <= 100);

ALTER TABLE generated_questions 
ADD CONSTRAINT check_marks_valid 
CHECK (
  (question_type = 'MCQ' AND marks IS NULL) OR 
  (question_type = 'Theory' AND marks IN (1, 2, 4, 8))
);

-- Add a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_generated_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_generated_questions_updated_at ON generated_questions;
CREATE TRIGGER trigger_update_generated_questions_updated_at
  BEFORE UPDATE ON generated_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_questions_updated_at();

-- Add RLS policies if they don't exist
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'generated_questions'
  ) THEN
    ALTER TABLE generated_questions ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view their own generated questions"
      ON generated_questions
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own generated questions"
      ON generated_questions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own generated questions"
      ON generated_questions
      FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own generated questions"
      ON generated_questions
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create a view for question generation sessions
CREATE OR REPLACE VIEW question_generation_sessions AS
SELECT 
  topic,
  subject_id,
  subject.name as subject_name,
  user_id,
  COUNT(*) as question_count,
  MIN(created_at) as first_generated,
  MAX(created_at) as last_generated,
  AVG(difficulty) as avg_difficulty,
  STRING_AGG(DISTINCT question_type, ', ') as question_types,
  STRING_AGG(DISTINCT bloom_level, ', ') as bloom_levels
FROM generated_questions
LEFT JOIN subjects ON generated_questions.subject_id = subjects.id
GROUP BY topic, subject_id, subject.name, user_id
ORDER BY last_generated DESC;

-- Grant permissions on the view
GRANT SELECT ON question_generation_sessions TO authenticated;

-- Create a function to get question statistics
CREATE OR REPLACE FUNCTION get_question_statistics(user_uuid UUID)
RETURNS TABLE(
  total_questions BIGINT,
  mcq_count BIGINT,
  theory_count BIGINT,
  avg_difficulty NUMERIC,
  topics_count BIGINT,
  subjects_count BIGINT,
  recent_activity TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_questions,
    COUNT(*) FILTER (WHERE question_type = 'MCQ') as mcq_count,
    COUNT(*) FILTER (WHERE question_type = 'Theory') as theory_count,
    AVG(difficulty) as avg_difficulty,
    COUNT(DISTINCT topic) as topics_count,
    COUNT(DISTINCT subject_id) as subjects_count,
    MAX(created_at) as recent_activity
  FROM generated_questions
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_question_statistics(UUID) TO authenticated; 