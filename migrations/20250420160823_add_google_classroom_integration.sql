-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Google Classroom Connection Management
CREATE TABLE google_classroom_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT,
    error_message TEXT
);

-- Add RLS policies for google_classroom_connections
ALTER TABLE google_classroom_connections ENABLE ROW LEVEL SECURITY;

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
    USING (auth.uid() = user_id);

-- Course Mapping
CREATE TABLE google_classroom_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES google_classroom_connections(id) ON DELETE CASCADE,
    google_course_id TEXT NOT NULL,
    name TEXT NOT NULL,
    section TEXT,
    description TEXT,
    room TEXT,
    teacher_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(connection_id, google_course_id)
);

-- Add RLS policies for google_classroom_courses
ALTER TABLE google_classroom_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own courses"
    ON google_classroom_courses
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM google_classroom_connections
        WHERE google_classroom_connections.id = google_classroom_courses.connection_id
        AND google_classroom_connections.user_id = auth.uid()
    ));

-- Student Mapping
CREATE TABLE google_classroom_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES google_classroom_courses(id) ON DELETE CASCADE,
    google_student_id TEXT NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    system_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(course_id, google_student_id)
);

-- Add RLS policies for google_classroom_students
ALTER TABLE google_classroom_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own students"
    ON google_classroom_students
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM google_classroom_courses
        JOIN google_classroom_connections ON google_classroom_connections.id = google_classroom_courses.connection_id
        WHERE google_classroom_courses.id = google_classroom_students.course_id
        AND google_classroom_connections.user_id = auth.uid()
    ));

-- Sync Logs
CREATE TABLE google_classroom_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES google_classroom_connections(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB
);

-- Add RLS policies for google_classroom_sync_logs
ALTER TABLE google_classroom_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
    ON google_classroom_sync_logs
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM google_classroom_connections
        WHERE google_classroom_connections.id = google_classroom_sync_logs.connection_id
        AND google_classroom_connections.user_id = auth.uid()
    ));

-- Create indexes for better query performance
CREATE INDEX idx_google_classroom_connections_user_id ON google_classroom_connections(user_id);
CREATE INDEX idx_google_classroom_courses_connection_id ON google_classroom_courses(connection_id);
CREATE INDEX idx_google_classroom_students_course_id ON google_classroom_students(course_id);
CREATE INDEX idx_google_classroom_sync_logs_connection_id ON google_classroom_sync_logs(connection_id);

-- Add index for system_student_id
CREATE INDEX idx_google_classroom_students_system_student_id ON google_classroom_students(system_student_id);

-- Add google_classroom_id columns
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS google_classroom_id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS google_classroom_id TEXT;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_subjects_google_classroom_id ON subjects(google_classroom_id);
CREATE INDEX IF NOT EXISTS idx_students_google_classroom_id ON students(google_classroom_id); 