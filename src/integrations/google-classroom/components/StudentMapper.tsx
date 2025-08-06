import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { GoogleClassroomStudent, MappingConflict } from '../types';

interface StudentMapperProps {
    courseId: string;
    onMappingComplete: (mapping: Record<string, string>) => void;
    className?: string;
}

interface SystemStudent {
    id: string;
    email: string;
    name: string;
}

export const StudentMapper: React.FC<StudentMapperProps> = ({
    courseId,
    onMappingComplete,
    className
}) => {
    const [googleStudents, setGoogleStudents] = useState<GoogleClassroomStudent[]>([]);
    const [systemStudents, setSystemStudents] = useState<SystemStudent[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [conflicts, setConflicts] = useState<MappingConflict[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, [courseId]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            await Promise.all([
                loadGoogleStudents(),
                loadSystemStudents()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load student data.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const loadGoogleStudents = async () => {
        const { data, error } = await supabase
            .from('google_classroom_students')
            .select('*')
            .eq('course_id', courseId)
            .eq('is_active', true)
            .order('full_name');

        if (error) {
            throw error;
        }

        setGoogleStudents(data || []);
    };

    const loadSystemStudents = async () => {
        const { data, error } = await supabase
            .from('students')
            .select('id, email, name')
            .order('name');

        if (error) {
            throw error;
        }

        setSystemStudents(data || []);
    };

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            const { data: course, error: courseError } = await supabase
                .from('google_classroom_courses')
                .select('connection_id')
                .eq('id', courseId)
                .single();

            if (courseError || !course) {
                throw courseError || new Error('Course not found');
            }

            const response = await fetch('/api/google-classroom/sync/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    courseId,
                    connectionId: course.connection_id
                })
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            await loadGoogleStudents();
            toast({
                title: 'Success',
                description: 'Students synchronized successfully.'
            });
        } catch (error) {
            console.error('Error syncing students:', error);
            toast({
                title: 'Sync Error',
                description: 'Failed to synchronize students. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleMappingChange = (googleStudentId: string, systemStudentId: string) => {
        setMapping(prev => ({
            ...prev,
            [googleStudentId]: systemStudentId
        }));
    };

    const findConflicts = () => {
        const newConflicts: MappingConflict[] = [];
        const mappedSystemIds = new Set<string>();

        googleStudents.forEach(googleStudent => {
            const systemStudentId = mapping[googleStudent.id];
            if (systemStudentId) {
                if (mappedSystemIds.has(systemStudentId)) {
                    newConflicts.push({
                        googleStudentId: googleStudent.id,
                        email: googleStudent.email,
                        existingStudentId: systemStudentId,
                        resolution: 'KEEP_EXISTING'
                    });
                }
                mappedSystemIds.add(systemStudentId);
            }
        });

        setConflicts(newConflicts);
        return newConflicts.length > 0;
    };

    const handleComplete = () => {
        if (findConflicts()) {
            toast({
                title: 'Mapping Conflicts',
                description: 'Please resolve the mapping conflicts before proceeding.',
                variant: 'destructive'
            });
            return;
        }

        onMappingComplete(mapping);
    };

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Loading Students...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Map Google Classroom Students</CardTitle>
                <CardDescription>
                    Map Google Classroom students to your system students
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
                            {isSyncing ? 'Syncing...' : 'Sync Students'}
                        </Button>
                    </div>

                    {googleStudents.length === 0 ? (
                        <p className="text-center text-muted-foreground">
                            No students found. Try syncing with Google Classroom.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {googleStudents.map(googleStudent => (
                                <div
                                    key={googleStudent.id}
                                    className="flex items-center space-x-4 p-4 rounded-lg border"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium">
                                            {googleStudent.fullName}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {googleStudent.email}
                                        </div>
                                    </div>
                                    <Select
                                        value={mapping[googleStudent.id] || ''}
                                        onValueChange={(value) => handleMappingChange(googleStudent.id, value)}
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Select student" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">
                                                <span className="text-muted-foreground">
                                                    Not mapped
                                                </span>
                                            </SelectItem>
                                            {systemStudents.map(systemStudent => (
                                                <SelectItem
                                                    key={systemStudent.id}
                                                    value={systemStudent.id}
                                                >
                                                    {systemStudent.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    )}

                    {conflicts.length > 0 && (
                        <div className="mt-4 p-4 rounded-lg bg-destructive/10">
                            <h4 className="font-medium text-destructive mb-2">
                                Mapping Conflicts
                            </h4>
                            <ul className="space-y-2">
                                {conflicts.map(conflict => {
                                    const googleStudent = googleStudents.find(
                                        s => s.id === conflict.googleStudentId
                                    );
                                    const systemStudent = systemStudents.find(
                                        s => s.id === conflict.existingStudentId
                                    );

                                    return (
                                        <li key={conflict.googleStudentId}>
                                            {googleStudent?.fullName} is mapped to{' '}
                                            {systemStudent?.name}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleComplete}
                            disabled={Object.keys(mapping).length === 0}
                        >
                            Complete Mapping
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}; 