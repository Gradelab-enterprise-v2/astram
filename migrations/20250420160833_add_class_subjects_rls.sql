-- Add RLS policies for class_subjects table
-- Enable RLS on class_subjects table
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Users can insert their own class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Users can update their own class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Users can delete their own class_subjects" ON class_subjects;

-- Create policies for class_subjects table
CREATE POLICY "Users can view their own class_subjects"
    ON class_subjects FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own class_subjects"
    ON class_subjects FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own class_subjects"
    ON class_subjects FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own class_subjects"
    ON class_subjects FOR DELETE
    USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_class_subjects_user_id ON class_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject_id ON class_subjects(subject_id);
