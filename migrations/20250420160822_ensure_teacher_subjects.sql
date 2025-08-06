-- Ensure teacher_subjects table exists with proper structure
CREATE TABLE IF NOT EXISTS teacher_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(teacher_id, subject_id)
);

-- Enable RLS
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

-- Create policies for teacher_subjects
CREATE POLICY "Teachers can view their own subject associations"
    ON teacher_subjects FOR SELECT
    USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert their own subject associations"
    ON teacher_subjects FOR INSERT
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own subject associations"
    ON teacher_subjects FOR UPDATE
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their own subject associations"
    ON teacher_subjects FOR DELETE
    USING (teacher_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON teacher_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 