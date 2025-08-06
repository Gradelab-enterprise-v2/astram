-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own connections" ON google_classroom_connections;
DROP POLICY IF EXISTS "Users can insert their own connections" ON google_classroom_connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON google_classroom_connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON google_classroom_connections;

DROP POLICY IF EXISTS "Users can view courses from their connections" ON google_classroom_courses;
DROP POLICY IF EXISTS "Users can insert courses for their connections" ON google_classroom_courses;
DROP POLICY IF EXISTS "Users can update courses from their connections" ON google_classroom_courses;
DROP POLICY IF EXISTS "Users can delete courses from their connections" ON google_classroom_courses;

DROP POLICY IF EXISTS "Users can view students from their courses" ON google_classroom_students;
DROP POLICY IF EXISTS "Users can insert students for their courses" ON google_classroom_students;
DROP POLICY IF EXISTS "Users can update students from their courses" ON google_classroom_students;
DROP POLICY IF EXISTS "Users can delete students from their courses" ON google_classroom_students;

-- Enable RLS on Google Classroom tables
ALTER TABLE google_classroom_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_classroom_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_classroom_students ENABLE ROW LEVEL SECURITY;

-- Create policies for google_classroom_connections
CREATE POLICY "Users can view their own connections"
    ON google_classroom_connections
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
    ON google_classroom_connections
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
    ON google_classroom_connections
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
    ON google_classroom_connections
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for google_classroom_courses
CREATE POLICY "Users can view courses from their connections"
    ON google_classroom_courses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM google_classroom_connections
            WHERE google_classroom_connections.id = google_classroom_courses.connection_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert courses for their connections"
    ON google_classroom_courses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM google_classroom_connections
            WHERE google_classroom_connections.id = connection_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update courses from their connections"
    ON google_classroom_courses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM google_classroom_connections
            WHERE google_classroom_connections.id = google_classroom_courses.connection_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM google_classroom_connections
            WHERE google_classroom_connections.id = connection_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete courses from their connections"
    ON google_classroom_courses
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM google_classroom_connections
            WHERE google_classroom_connections.id = google_classroom_courses.connection_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    );

-- Create policies for google_classroom_students
CREATE POLICY "Users can view students from their courses"
    ON google_classroom_students
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM google_classroom_courses
            JOIN google_classroom_connections ON google_classroom_connections.id = google_classroom_courses.connection_id
            WHERE google_classroom_courses.google_course_id = google_classroom_students.course_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert students for their courses"
    ON google_classroom_students
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM google_classroom_courses
            JOIN google_classroom_connections ON google_classroom_connections.id = google_classroom_courses.connection_id
            WHERE google_classroom_courses.google_course_id = course_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update students from their courses"
    ON google_classroom_students
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM google_classroom_courses
            JOIN google_classroom_connections ON google_classroom_connections.id = google_classroom_courses.connection_id
            WHERE google_classroom_courses.google_course_id = google_classroom_students.course_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM google_classroom_courses
            JOIN google_classroom_connections ON google_classroom_connections.id = google_classroom_courses.connection_id
            WHERE google_classroom_courses.google_course_id = course_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete students from their courses"
    ON google_classroom_students
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM google_classroom_courses
            JOIN google_classroom_connections ON google_classroom_connections.id = google_classroom_courses.connection_id
            WHERE google_classroom_courses.google_course_id = google_classroom_students.course_id
            AND google_classroom_connections.user_id = auth.uid()
        )
    ); 