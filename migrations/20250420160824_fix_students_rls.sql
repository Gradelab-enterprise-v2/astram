-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own students" ON students;
DROP POLICY IF EXISTS "Users can insert their own students" ON students;
DROP POLICY IF EXISTS "Users can update their own students" ON students;
DROP POLICY IF EXISTS "Users can delete their own students" ON students;

-- Enable RLS if not already enabled
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create policies for students table
CREATE POLICY "Users can view their own students"
    ON students FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own students"
    ON students FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own students"
    ON students FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own students"
    ON students FOR DELETE
    USING (user_id = auth.uid());

-- Add index for user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id); 