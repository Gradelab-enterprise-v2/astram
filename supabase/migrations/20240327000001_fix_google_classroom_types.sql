-- Modify google_classroom_courses table
ALTER TABLE google_classroom_courses
    ALTER COLUMN google_course_id TYPE text;

-- Modify google_classroom_students table
ALTER TABLE google_classroom_students
    ALTER COLUMN course_id TYPE text,
    ALTER COLUMN google_student_id TYPE text;

-- Update the unique constraints
ALTER TABLE google_classroom_courses
    DROP CONSTRAINT IF EXISTS google_classroom_courses_connection_id_google_course_id_key,
    ADD CONSTRAINT google_classroom_courses_connection_id_google_course_id_key 
    UNIQUE (connection_id, google_course_id);

ALTER TABLE google_classroom_students
    DROP CONSTRAINT IF EXISTS google_classroom_students_course_id_google_student_id_key,
    ADD CONSTRAINT google_classroom_students_course_id_google_student_id_key 
    UNIQUE (course_id, google_student_id); 