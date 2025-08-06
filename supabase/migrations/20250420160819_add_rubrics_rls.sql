-- Enable RLS on rubrics table if not already enabled
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view rubrics for their tests" ON rubrics;
DROP POLICY IF EXISTS "Users can create rubrics for their tests" ON rubrics;
DROP POLICY IF EXISTS "Users can update rubrics for their tests" ON rubrics;
DROP POLICY IF EXISTS "Users can delete rubrics for their tests" ON rubrics;

-- Create new policies that link through tests and teacher_subjects
CREATE POLICY "Users can view rubrics for their tests"
    ON rubrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            JOIN teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = rubrics.test_id
            AND ts.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Users can create rubrics for their tests"
    ON rubrics FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tests t
            JOIN teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Users can update rubrics for their tests"
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

CREATE POLICY "Users can delete rubrics for their tests"
    ON rubrics FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            JOIN teacher_subjects ts ON t.subject_id = ts.subject_id
            WHERE t.id = test_id
            AND ts.teacher_id = auth.uid()
        )
    ); 