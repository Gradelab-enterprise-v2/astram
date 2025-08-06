import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { GoogleClassroomCourse } from '../types';

interface CourseSelectorProps {
    connectionId: string;
    onSelectionComplete: (selectedCourses: string[]) => void;
    className?: string;
}

export const CourseSelector: React.FC<CourseSelectorProps> = ({
    connectionId,
    onSelectionComplete,
    className
}) => {
    const [courses, setCourses] = useState<GoogleClassroomCourse[]>([]);
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadCourses();
    }, [connectionId]);

    const loadCourses = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('google_classroom_courses')
                .select('*')
                .eq('connection_id', connectionId)
                .eq('is_active', true)
                .order('name');

            if (error) {
                throw error;
            }

            setCourses(data || []);
        } catch (error) {
            console.error('Error loading courses:', error);
            toast({
                title: 'Error',
                description: 'Failed to load Google Classroom courses.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            const { data: connection, error: connectionError } = await supabase
                .from('google_classroom_connections')
                .select('access_token')
                .eq('id', connectionId)
                .single();

            if (connectionError || !connection) {
                throw connectionError || new Error('Connection not found');
            }

            const response = await fetch('/api/google-classroom/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    connectionId,
                    accessToken: connection.access_token
                })
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            await loadCourses();
            toast({
                title: 'Success',
                description: 'Courses synchronized successfully.'
            });
        } catch (error) {
            console.error('Error syncing courses:', error);
            toast({
                title: 'Sync Error',
                description: 'Failed to synchronize courses. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCourseToggle = (courseId: string) => {
        setSelectedCourses(prev => {
            if (prev.includes(courseId)) {
                return prev.filter(id => id !== courseId);
            } else {
                return [...prev, courseId];
            }
        });
    };

    const handleComplete = () => {
        onSelectionComplete(selectedCourses);
    };

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Loading Courses...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Google Classroom Courses</CardTitle>
                <CardDescription>
                    Select the courses you want to import
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSync}
                            disabled={isSyncing}
                            variant="outline"
                        >
                            {isSyncing ? 'Syncing...' : 'Sync Courses'}
                        </Button>
                    </div>
                    
                    {courses.length === 0 ? (
                        <p className="text-center text-muted-foreground">
                            No courses found. Try syncing with Google Classroom.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {courses.map(course => (
                                <div
                                    key={course.id}
                                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent"
                                >
                                    <Checkbox
                                        id={course.id}
                                        checked={selectedCourses.includes(course.id)}
                                        onCheckedChange={() => handleCourseToggle(course.id)}
                                    />
                                    <label
                                        htmlFor={course.id}
                                        className="flex-1 cursor-pointer"
                                    >
                                        <div className="font-medium">{course.name}</div>
                                        {course.section && (
                                            <div className="text-sm text-muted-foreground">
                                                Section: {course.section}
                                            </div>
                                        )}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleComplete}
                            disabled={selectedCourses.length === 0}
                        >
                            Import Selected Courses
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}; 