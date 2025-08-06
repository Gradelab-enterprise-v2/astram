-- First, ensure we have the proper foreign key constraints
ALTER TABLE rubrics 
  ADD CONSTRAINT fk_rubrics_test 
  FOREIGN KEY (test_id) 
  REFERENCES tests(id) 
  ON DELETE CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view any rubrics" ON rubrics;
DROP POLICY IF EXISTS "Users can create rubrics if authenticated" ON rubrics;
DROP POLICY IF EXISTS "Users can update their rubrics" ON rubrics;
DROP POLICY IF EXISTS "Users can delete their rubrics" ON rubrics;

-- Create proper policies that verify the teacher has access to the subject
CREATE POLICY "Teachers can view rubrics for their subjects"
    ON rubrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            JOIN teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = rubrics.test_id
            AND ts.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create rubrics for their subjects"
    ON rubrics FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tests t
            JOIN teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update rubrics for their subjects"
    ON rubrics FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            JOIN teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tests t
            JOIN teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete rubrics for their subjects"
    ON rubrics FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            JOIN teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    ); 