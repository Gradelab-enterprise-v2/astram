export interface GoogleClassroomConnection {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    lastSyncAt?: Date;
    syncStatus?: string;
    errorMessage?: string;
}

export interface GoogleClassroomCourse {
    id: string;
    connectionId: string;
    googleCourseId: string;
    name: string;
    section?: string;
    description?: string;
    room?: string;
    teacherEmail?: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
}

export interface GoogleClassroomStudent {
    id: string;
    course_id: string;
    google_course_id: string;
    google_student_id: string;
    email: string;
    full_name: string;
    system_student_id?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface SyncLog {
    id: string;
    connectionId: string;
    syncType: 'COURSES' | 'STUDENTS';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    startedAt: Date;
    completedAt?: Date;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}

export interface GoogleAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
}

export interface SyncResult {
    success: boolean;
    error?: string;
    syncedItems?: number;
    metadata?: Record<string, any>;
}

export interface MappingResult {
    success: boolean;
    error?: string;
    mappedItems?: number;
    conflicts?: MappingConflict[];
}

export interface MappingConflict {
    googleStudentId: string;
    email: string;
    existingStudentId?: string;
    resolution?: 'KEEP_EXISTING' | 'CREATE_NEW' | 'MERGE';
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'; 