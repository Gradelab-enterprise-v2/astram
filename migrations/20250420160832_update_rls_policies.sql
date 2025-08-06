-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can insert their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON subjects;

DROP POLICY IF EXISTS "Users can view their own students" ON students;
DROP POLICY IF EXISTS "Users can insert their own students" ON students;
DROP POLICY IF EXISTS "Users can update their own students" ON students;
DROP POLICY IF EXISTS "Users can delete their own students" ON students;

DROP POLICY IF EXISTS "Users can view their own enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Users can insert their own enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Users can delete their own enrollments" ON subject_enrollments;

-- Enable RLS on all tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for subjects table
CREATE POLICY "Users can view their own subjects"
    ON subjects FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own subjects"
    ON subjects FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subjects"
    ON subjects FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own subjects"
    ON subjects FOR DELETE
    USING (user_id = auth.uid());

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

-- Create policies for subject_enrollments table
CREATE POLICY "Users can view their own enrollments"
    ON subject_enrollments FOR SELECT
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_enrollments.subject_id
            AND s.user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM students st
            WHERE st.id = subject_enrollments.student_id
            AND st.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own enrollments"
    ON subject_enrollments FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_id
            AND s.user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM students st
            WHERE st.id = student_id
            AND st.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own enrollments"
    ON subject_enrollments FOR UPDATE
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_enrollments.subject_id
            AND s.user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM students st
            WHERE st.id = subject_enrollments.student_id
            AND st.user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_id
            AND s.user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM students st
            WHERE st.id = student_id
            AND st.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own enrollments"
    ON subject_enrollments FOR DELETE
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM subjects s
            WHERE s.id = subject_enrollments.subject_id
            AND s.user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM students st
            WHERE st.id = subject_enrollments.student_id
            AND st.user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_user_id ON subject_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_subject_id ON subject_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_student_id ON subject_enrollments(student_id); 