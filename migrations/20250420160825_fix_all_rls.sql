-- Fix RLS for students table
DROP POLICY IF EXISTS "Users can view their own students" ON students;
DROP POLICY IF EXISTS "Users can insert their own students" ON students;
DROP POLICY IF EXISTS "Users can update their own students" ON students;
DROP POLICY IF EXISTS "Users can delete their own students" ON students;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

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

-- Fix RLS for classes table
DROP POLICY IF EXISTS "Users can view their own classes" ON classes;
DROP POLICY IF EXISTS "Users can insert their own classes" ON classes;
DROP POLICY IF EXISTS "Users can update their own classes" ON classes;
DROP POLICY IF EXISTS "Users can delete their own classes" ON classes;

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own classes"
    ON classes FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own classes"
    ON classes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own classes"
    ON classes FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own classes"
    ON classes FOR DELETE
    USING (user_id = auth.uid());

-- Fix RLS for subjects table
DROP POLICY IF EXISTS "Users can view their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can insert their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON subjects;

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

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

-- Fix RLS for tests table
DROP POLICY IF EXISTS "Users can view their own tests" ON tests;
DROP POLICY IF EXISTS "Users can insert their own tests" ON tests;
DROP POLICY IF EXISTS "Users can update their own tests" ON tests;
DROP POLICY IF EXISTS "Users can delete their own tests" ON tests;

ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tests"
    ON tests FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tests"
    ON tests FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tests"
    ON tests FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own tests"
    ON tests FOR DELETE
    USING (user_id = auth.uid());

-- Fix RLS for subject_enrollments table
DROP POLICY IF EXISTS "Users can view their own enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Users can insert their own enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Users can delete their own enrollments" ON subject_enrollments;

ALTER TABLE subject_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrollments"
    ON subject_enrollments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own enrollments"
    ON subject_enrollments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own enrollments"
    ON subject_enrollments FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own enrollments"
    ON subject_enrollments FOR DELETE
    USING (user_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_user_id ON classes(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_subject_enrollments_user_id ON subject_enrollments(user_id); 