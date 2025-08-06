import { supabase } from '@/integrations/supabase/client';
import type { GoogleClassroomCourse, GoogleClassroomStudent } from '../types';

export class GoogleClassroomSyncService {
    private readonly accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    async syncCourses(connectionId: string): Promise<GoogleClassroomCourse[]> {
        try {
            console.log('Starting course sync for connection:', connectionId);
            
            // Fetch courses from Google Classroom
            const response = await fetch('https://classroom.googleapis.com/v1/courses?pageSize=100', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch courses. Status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error('Failed to fetch courses from Google Classroom');
            }

            const data = await response.json();
            console.log('Raw Google Classroom response:', data);
            
            const courses = data.courses || [];
            console.log('Raw courses from Google Classroom:', courses);

            if (courses.length === 0) {
                console.warn('No courses found in Google Classroom response');
                return [];
            }

            // Transform and store courses in Supabase
            const transformedCourses = courses.map((course: any) => ({
                connection_id: connectionId,
                google_course_id: course.id.toString(),
                name: course.name,
                section: course.section || '',
                description: course.description || '',
                room: course.room || '',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            console.log('Transformed courses:', transformedCourses);

            // Store courses in Supabase
            console.log('Storing courses in Supabase...');
            const { data: storedCourses, error } = await supabase
                .from('google_classroom_courses')
                .upsert(transformedCourses, {
                    onConflict: 'connection_id,google_course_id',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error('Error storing courses:', error);
                throw error;
            }

            console.log('Courses stored successfully:', storedCourses?.length);
            return storedCourses || [];
        } catch (error) {
            console.error('Error syncing courses:', error);
            throw error;
        }
    }

    async syncStudents(courseId: string): Promise<GoogleClassroomStudent[]> {
        try {
            console.log('Starting student sync for course:', courseId);
            
            // First, get the UUID of the course from our database
            const { data: course, error: courseError } = await supabase
                .from('google_classroom_courses')
                .select('id, name, google_course_id')
                .eq('google_course_id', courseId)
                .single();

            if (courseError || !course) {
                console.error('Course not found in database:', courseError);
                throw new Error('Course not found in database');
            }

            console.log('Found course in database:', course);

            // Fetch students from Google Classroom
            const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students?pageSize=100`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch students. Status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error('Failed to fetch students from Google Classroom');
            }

            const data = await response.json();
            console.log('Raw Google Classroom response:', data);
            
            const students = data.students || [];
            console.log('Raw students from Google Classroom:', students);

            if (students.length === 0) {
                console.warn('No students found in Google Classroom response');
                return [];
            }

            // Transform and store students in Supabase
            const transformedStudents = students.map((student: any) => ({
                course_id: course.id,
                google_course_id: courseId,
                google_student_id: student.userId.toString(),
                email: student.profile.emailAddress,
                full_name: student.profile.name.fullName,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            console.log('Transformed students:', transformedStudents);

            // Store students in Supabase
            console.log('Storing students in Supabase...');
            const { data: storedStudents, error } = await supabase
                .from('google_classroom_students')
                .upsert(transformedStudents, {
                    onConflict: 'course_id,google_student_id',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error('Error storing students:', error);
                throw error;
            }

            console.log('Students stored successfully:', storedStudents?.length);
            return storedStudents || [];
        } catch (error) {
            console.error('Error syncing students:', error);
            throw error;
        }
    }

    async syncAll(connectionId: string): Promise<{ courses: GoogleClassroomCourse[], students: GoogleClassroomStudent[] }> {
        try {
            console.log('Starting sync process for connection:', connectionId);
            
            // First sync courses
            console.log('Syncing courses...');
            const courses = await this.syncCourses(connectionId);
            console.log('Courses synced:', courses);

            if (courses.length === 0) {
                console.warn('No courses were synced');
                return { courses: [], students: [] };
            }

            // Then sync students for each course
            const allStudents: GoogleClassroomStudent[] = [];
            for (const course of courses) {
                try {
                    console.log(`Syncing students for course: ${course.name} (${course.google_course_id})`);
                    const students = await this.syncStudents(course.google_course_id);
                    console.log(`Synced ${students.length} students for course ${course.name}`);
                    
                    // Add course information to each student
                    const studentsWithCourse = students.map(student => ({
                        ...student,
                        google_course_id: course.google_course_id,
                        course_name: course.name
                    }));
                    
                    allStudents.push(...studentsWithCourse);
                } catch (error) {
                    console.error(`Error syncing students for course ${course.google_course_id}:`, error);
                    // Continue with other courses even if one fails
                }
            }

            console.log('Sync completed. Total courses:', courses.length, 'Total students:', allStudents.length);
            return {
                courses,
                students: allStudents
            };
        } catch (error) {
            console.error('Error syncing all:', error);
            throw error;
        }
    }
} 