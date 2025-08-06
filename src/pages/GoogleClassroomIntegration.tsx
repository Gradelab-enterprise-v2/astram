import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@/integrations/google-classroom/components/ConnectButton';
import { CourseSelector } from '@/integrations/google-classroom/components/CourseSelector';
import { StudentMapper } from '@/integrations/google-classroom/components/StudentMapper';
import { supabase } from '@/integrations/supabase/client';
import type { ConnectionStatus } from '@/integrations/google-classroom/types';
import { GoogleClassroomAuthService } from '@/integrations/google-classroom/services/auth.service';
import { GoogleClassroomSyncService } from '@/integrations/google-classroom/services/sync.service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${window.location.origin}/google-classroom/callback`;

const authService = new GoogleClassroomAuthService({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
    scopes: [
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.rosters.readonly',
        'https://www.googleapis.com/auth/classroom.profile.emails',
        'https://www.googleapis.com/auth/classroom.profile.photos'
    ]
});

const GoogleClassroomIntegration: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }

            const { data: connections, error } = await supabase
                .from('google_classroom_connections')
                .select('id, access_token, token_expires_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error checking connection:', error);
                setConnectionStatus('ERROR');
                return;
            }

            if (connections && connections.length > 0) {
                const connection = connections[0];
                // Check if token is expired
                if (new Date(connection.token_expires_at) <= new Date()) {
                    setConnectionStatus('ERROR');
                    setIsConnected(false);
                    return;
                }
                setConnectionId(connection.id);
                setIsConnected(true);
                setConnectionStatus('CONNECTED');
            } else {
                setConnectionStatus('DISCONNECTED');
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Error checking connection:', error);
            setConnectionStatus('ERROR');
            setIsConnected(false);
        }
    };

    const handleConnect = async () => {
        try {
            setIsConnecting(true);
            const authUrl = await authService.initiateAuth();
            window.location.href = authUrl;
        } catch (error) {
            console.error('Error initiating auth:', error);
            toast({
                title: 'Error',
                description: 'Failed to connect to Google Classroom',
                variant: 'destructive'
            });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleSync = async () => {
        if (!connectionId) {
            console.error('No connection ID available');
            return;
        }

        try {
            console.log('Starting sync process with connection ID:', connectionId);
            setIsSyncing(true);
            setConnectionStatus('SYNCING');
            
            const { data: connections, error } = await supabase
                .from('google_classroom_connections')
                .select('access_token, token_expires_at')
                .eq('id', connectionId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error fetching connection:', error);
                throw new Error('Failed to fetch connection details');
            }

            if (!connections || connections.length === 0) {
                console.error('No connection found');
                throw new Error('Connection not found');
            }

            // Check if token is expired
            if (new Date(connections[0].token_expires_at) <= new Date()) {
                console.error('Token expired at:', connections[0].token_expires_at);
                throw new Error('Access token has expired. Please reconnect.');
            }

            console.log('Connection details fetched successfully');
            console.log('Starting sync process...');
            
            const syncService = new GoogleClassroomSyncService(connections[0].access_token);
            console.log('Sync service initialized');
            
            const result = await syncService.syncAll(connectionId);
            console.log('Sync completed with result:', {
                coursesCount: result.courses.length,
                studentsCount: result.students.length,
                courses: result.courses.map(c => ({ id: c.id, name: c.name })),
                students: result.students.map(s => ({ id: s.id, name: s.full_name }))
            });

            if (result.courses.length === 0) {
                console.error('No courses found in sync result');
                throw new Error('No courses found in Google Classroom');
            }

            // Import data into our app's tables
            console.log('Starting data import...');
            try {
                await importData(result);
                console.log('Data import completed successfully');
            } catch (importError) {
                console.error('Error during data import:', importError);
                throw importError;
            }

            // Update last sync time
            console.log('Updating last sync time...');
            const { error: updateError } = await supabase
                .from('google_classroom_connections')
                .update({ last_sync_at: new Date().toISOString() })
                .eq('id', connectionId);

            if (updateError) {
                console.error('Error updating last sync time:', updateError);
            }

            setConnectionStatus('CONNECTED');
            toast({
                title: 'Sync Complete',
                description: `Synced ${result.courses.length} courses and ${result.students.length} students`
            });

            // Verify the data was imported correctly
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');

            console.log('Verifying data for user:', user.id);

            // Check subjects
            const { data: subjects, error: subjectsError } = await supabase
                .from('subjects')
                .select('id, name, google_classroom_id')
                .eq('user_id', user.id);

            console.log('Subjects verification:', {
                count: subjects?.length || 0,
                error: subjectsError,
                subjects: subjects
            });

            // Check students
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id, name, google_classroom_id')
                .eq('user_id', user.id);

            console.log('Students verification:', {
                count: students?.length || 0,
                error: studentsError,
                students: students
            });

            // Check enrollments
            const { data: enrollments, error: enrollmentsError } = await supabase
                .from('subject_enrollments')
                .select('id, subject_id, student_id')
                .eq('user_id', user.id);

            console.log('Enrollments verification:', {
                count: enrollments?.length || 0,
                error: enrollmentsError,
                enrollments: enrollments
            });

            // Check Google Classroom intermediate tables
            const { data: googleCourses, error: googleCoursesError } = await supabase
                .from('google_classroom_courses')
                .select('id, name, google_course_id')
                .eq('connection_id', connectionId);

            console.log('Google Classroom courses verification:', {
                count: googleCourses?.length || 0,
                error: googleCoursesError,
                courses: googleCourses
            });

            const { data: googleStudents, error: googleStudentsError } = await supabase
                .from('google_classroom_students')
                .select('id, full_name, google_student_id, course_id')
                .eq('course_id', googleCourses?.[0]?.id);

            console.log('Google Classroom students verification:', {
                count: googleStudents?.length || 0,
                error: googleStudentsError,
                students: googleStudents
            });

            console.log('Final verification results:', {
                subjects: subjects?.length || 0,
                students: students?.length || 0,
                enrollments: enrollments?.length || 0,
                googleCourses: googleCourses?.length || 0,
                googleStudents: googleStudents?.length || 0,
                errors: {
                    subjects: subjectsError,
                    students: studentsError,
                    enrollments: enrollmentsError,
                    googleCourses: googleCoursesError,
                    googleStudents: googleStudentsError
                }
            });

            // Navigate to dashboard after successful import
            navigate('/dashboard');
        } catch (error) {
            console.error('Error during sync process:', error);
            setConnectionStatus('ERROR');
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to sync with Google Classroom. Check console for details.',
                variant: 'destructive'
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const importData = async (result: { courses: any[], students: any[] }) => {
        try {
            console.log('Starting data import with:', {
                coursesCount: result.courses.length,
                studentsCount: result.students.length,
                courses: result.courses.map(c => ({ id: c.id, name: c.name, google_course_id: c.google_course_id })),
                students: result.students.map(s => ({ id: s.id, name: s.full_name, google_student_id: s.google_student_id }))
            });

            // Start a transaction
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not found');
            console.log('Current user:', user.id);

            // Verify Google Classroom data first
            const { data: googleCourses, error: googleCoursesError } = await supabase
                .from('google_classroom_courses')
                .select('*')
                .eq('connection_id', result.courses[0].connection_id);

            console.log('Google Classroom courses in database:', {
                count: googleCourses?.length || 0,
                error: googleCoursesError,
                courses: googleCourses
            });

            const { data: googleStudents, error: googleStudentsError } = await supabase
                .from('google_classroom_students')
                .select('*')
                .eq('course_id', googleCourses?.[0]?.id);

            console.log('Google Classroom students in database:', {
                count: googleStudents?.length || 0,
                error: googleStudentsError,
                students: googleStudents
            });

            // Helper function to determine class
            const determineClass = (name: string): string => {
                if (name.includes('TY') || name.includes('Third Year') || name.includes('Fourth Year')) return 'TY';
                if (name.includes('SY') || name.includes('Second Year') || name.includes('Sem-VI') || name.includes('Sem-V')) return 'SY';
                if (name.includes('FY') || name.includes('First Year') || name.includes('Sem-IV') || name.includes('Sem-III') || name.includes('Sem-II') || name.includes('Sem-I')) return 'FY';
                if (name.includes('Sem-VII')) return 'TY';
                return 'TY'; // Default to TY
            };

            // Import courses as subjects
            const importedSubjects = [];
            for (const course of result.courses) {
                console.log('Processing course:', {
                    name: course.name,
                    google_course_id: course.google_course_id
                });
                
                // Check if subject already exists
                const { data: existingSubject, error: subjectError } = await supabase
                    .from('subjects')
                    .select('id, name, google_classroom_id')
                    .eq('google_classroom_id', course.google_course_id)
                    .maybeSingle();

                if (subjectError) {
                    console.error('Error checking existing subject:', subjectError);
                    continue;
                }

                if (!existingSubject) {
                    console.log('Creating new subject for course:', course.name);
                    const { data: newSubject, error: insertError } = await supabase
                        .from('subjects')
                        .insert({
                            name: course.name,
                            code: course.section || '',
                            class: determineClass(course.name),
                            user_id: user.id,
                            google_classroom_id: course.google_course_id
                        })
                        .select()
                        .single();

                    if (insertError) {
                        console.error('Error creating subject:', insertError);
                    } else {
                        console.log('Created new subject:', newSubject);
                        importedSubjects.push(newSubject);
                    }
                } else {
                    console.log('Subject already exists:', existingSubject);
                    importedSubjects.push(existingSubject);
                }
            }

            // Verify subjects after import
            const { data: allSubjects, error: allSubjectsError } = await supabase
                .from('subjects')
                .select('*')
                .eq('user_id', user.id);

            console.log('All subjects after import:', {
                count: allSubjects?.length || 0,
                error: allSubjectsError,
                subjects: allSubjects
            });

            if (importedSubjects.length === 0) {
                throw new Error('Failed to import any subjects');
            }

            // Import students
            const importedStudents = [];
            const uniqueStudents = new Map(); // Track unique students by Google Classroom ID

            for (const student of result.students) {
                const googleStudentId = student.google_student_id;
                
                // Skip if we've already processed this student
                if (uniqueStudents.has(googleStudentId)) {
                    console.log('Skipping duplicate student:', student.full_name);
                    continue;
                }

                console.log('Processing student:', {
                    name: student.full_name,
                    google_student_id: googleStudentId
                });
                
                // Check if student already exists
                const { data: existingStudent, error: studentError } = await supabase
                    .from('students')
                    .select('id, name, google_classroom_id')
                    .eq('google_classroom_id', googleStudentId)
                    .maybeSingle();

                if (studentError) {
                    console.error('Error checking existing student:', studentError);
                    continue;
                }

                if (!existingStudent) {
                    console.log('Creating new student:', student.full_name);
                    const { data: newStudent, error: insertError } = await supabase
                        .from('students')
                        .insert({
                            name: student.full_name,
                            email: student.email,
                            gr_number: 'GR' + new Date().getFullYear() + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
                            roll_number: 'R' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
                            year: '2024',
                            date_of_birth: '2000-01-01',
                            gender: 'Male',
                            user_id: user.id,
                            google_classroom_id: googleStudentId
                        })
                        .select()
                        .single();

                    if (insertError) {
                        console.error('Error creating student:', insertError);
                    } else {
                        console.log('Created new student:', newStudent);
                        importedStudents.push(newStudent);
                        uniqueStudents.set(googleStudentId, newStudent);
                    }
                } else {
                    console.log('Student already exists:', existingStudent);
                    importedStudents.push(existingStudent);
                    uniqueStudents.set(googleStudentId, existingStudent);
                }
            }

            // Verify students after import
            const { data: allStudents, error: allStudentsError } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', user.id);

            console.log('All students after import:', {
                count: allStudents?.length || 0,
                error: allStudentsError,
                students: allStudents
            });

            // Create subject-student relationships
            const createdRelationships = [];
            for (const course of result.courses) {
                console.log('Creating relationships for course:', course.name);
                
                const { data: subject, error: subjectError } = await supabase
                    .from('subjects')
                    .select('id, name')
                    .eq('google_classroom_id', course.google_course_id)
                    .maybeSingle();

                if (subjectError) {
                    console.error('Error finding subject for course:', subjectError);
                    continue;
                }

                if (subject) {
                    // Get all students for this course from the sync result
                    const courseStudents = result.students.filter(
                        s => s.google_course_id === course.google_course_id
                    );
                    console.log(`Found ${courseStudents.length} students for course ${course.name}`);

                    for (const student of courseStudents) {
                        const studentData = uniqueStudents.get(student.google_student_id);
                        
                        if (!studentData) {
                            console.warn('Student not found in imported students:', {
                                googleClassroomId: student.google_student_id,
                                name: student.full_name
                            });
                            continue;
                        }

                        console.log('Processing student for relationship:', {
                            studentName: studentData.name,
                            studentId: studentData.id,
                            courseName: subject.name,
                            courseId: subject.id
                        });

                        // Check if relationship already exists
                        const { data: existingRelationship, error: relationshipCheckError } = await supabase
                            .from('subject_enrollments')
                            .select('id')
                            .eq('subject_id', subject.id)
                            .eq('student_id', studentData.id)
                            .maybeSingle();

                        if (relationshipCheckError) {
                            console.error('Error checking existing relationship:', relationshipCheckError);
                            continue;
                        }

                        if (!existingRelationship) {
                            console.log('Creating new relationship:', {
                                subjectName: subject.name,
                                subjectId: subject.id,
                                studentName: studentData.name,
                                studentId: studentData.id
                            });

                            const { data: relationship, error: relationshipError } = await supabase
                                .from('subject_enrollments')
                                .insert({
                                    subject_id: subject.id,
                                    student_id: studentData.id,
                                    user_id: user.id
                                })
                                .select()
                                .single();

                            if (relationshipError) {
                                console.error('Error creating relationship:', relationshipError);
                            } else {
                                console.log('Successfully created relationship:', relationship);
                                createdRelationships.push(relationship);
                            }
                        } else {
                            console.log('Relationship already exists:', existingRelationship);
                            createdRelationships.push(existingRelationship);
                        }
                    }
                } else {
                    console.warn('Subject not found for course:', {
                        courseName: course.name,
                        googleClassroomId: course.google_course_id
                    });
                }
            }

            // Verify relationships after import
            const { data: allRelationships, error: allRelationshipsError } = await supabase
                .from('subject_enrollments')
                .select('*')
                .eq('user_id', user.id);

            console.log('All relationships after import:', {
                count: allRelationships?.length || 0,
                error: allRelationshipsError,
                relationships: allRelationships
            });

            console.log('Final import results:', {
                subjects: importedSubjects.length,
                students: importedStudents.length,
                relationships: createdRelationships.length,
                allSubjects: allSubjects?.length || 0,
                allStudents: allStudents?.length || 0,
                allRelationships: allRelationships?.length || 0
            });

            toast({
                title: 'Import Complete',
                description: `Successfully imported ${importedSubjects.length} subjects, ${importedStudents.length} students, and ${createdRelationships.length} relationships`
            });

            // Navigate to dashboard after successful import
            navigate('/dashboard');
        } catch (error) {
            console.error('Error importing data:', error);
            toast({
                title: 'Import Error',
                description: error instanceof Error ? error.message : 'Failed to import data. Check console for details.',
                variant: 'destructive'
            });
            throw error;
        }
    };

    const handleDisconnect = async () => {
        if (!connectionId) return;

        try {
            await authService.revokeAccess(connectionId);
            setConnectionId(null);
            setIsConnected(false);
            toast({
                title: 'Success',
                description: 'Disconnected from Google Classroom'
            });
        } catch (error) {
            console.error('Error disconnecting:', error);
            toast({
                title: 'Error',
                description: 'Failed to disconnect from Google Classroom',
                variant: 'destructive'
            });
        }
    };

    const handleCourseSelection = (courseIds: string[]) => {
        if (courseIds.length > 0) {
            setSelectedCourseId(courseIds[0]);
        }
    };

    const handleStudentMapping = async (mapping: Record<string, string>) => {
        try {
            if (!selectedCourseId) return;

            const response = await fetch('/api/google-classroom/map-students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    courseId: selectedCourseId,
                    mapping
                })
            });

            if (!response.ok) {
                throw new Error('Failed to map students');
            }

            // Navigate back to the main page or show success message
            navigate('/dashboard');
        } catch (error) {
            console.error('Error mapping students:', error);
        }
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Google Classroom Integration</CardTitle>
                    <CardDescription>
                        Connect your Google Classroom account to sync courses and students
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!isConnected ? (
                        <Button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="w-full"
                        >
                            {isConnecting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                'Connect Google Classroom'
                            )}
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="text-sm text-muted-foreground">
                                        Connected to Google Classroom
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleDisconnect}
                                >
                                    Disconnect
                                </Button>
                            </div>
                            <Button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="w-full"
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    'Sync Courses and Students'
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {connectionStatus === 'CONNECTED' && connectionId && (
                <div className="space-y-8">
                    {!selectedCourseId ? (
                        <CourseSelector
                            connectionId={connectionId}
                            onSelectionComplete={handleCourseSelection}
                        />
                    ) : (
                        <StudentMapper
                            courseId={selectedCourseId}
                            onMappingComplete={handleStudentMapping}
                        />
                    )}
                </div>
            )}

            {connectionStatus === 'ERROR' && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                    <p>There was an error with the Google Classroom connection.</p>
                    <p>Please try disconnecting and reconnecting.</p>
                </div>
            )}
        </div>
    );
};

export default GoogleClassroomIntegration; 