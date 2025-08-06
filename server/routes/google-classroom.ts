import express from 'express';
import { google } from 'googleapis';
import { supabase } from '../lib/supabase';
import { GoogleClassroomAuthService } from '../services/google-classroom/auth.service';
import { GoogleClassroomSyncService } from '../services/google-classroom/sync.service';

const router = express.Router();

// Middleware to check authentication
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
};

// Disconnect Google Classroom
router.post('/disconnect', requireAuth, async (req, res) => {
    try {
        const { connectionId } = req.body;
        if (!connectionId) {
            return res.status(400).json({ error: 'Connection ID is required' });
        }

        const authService = new GoogleClassroomAuthService({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            redirectUri: process.env.GOOGLE_REDIRECT_URI!,
            scopes: []
        });

        await authService.revokeAccess(connectionId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error disconnecting Google Classroom:', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

// Sync courses
router.post('/sync', requireAuth, async (req, res) => {
    try {
        const { connectionId, accessToken } = req.body;
        if (!connectionId || !accessToken) {
            return res.status(400).json({ error: 'Connection ID and access token are required' });
        }

        const syncService = new GoogleClassroomSyncService(accessToken);
        const result = await syncService.syncCourses(connectionId);

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('Error syncing courses:', error);
        res.status(500).json({ error: 'Failed to sync courses' });
    }
});

// Sync students for a course
router.post('/sync/students', requireAuth, async (req, res) => {
    try {
        const { courseId, connectionId } = req.body;
        if (!courseId || !connectionId) {
            return res.status(400).json({ error: 'Course ID and connection ID are required' });
        }

        const { data: connection, error: connectionError } = await supabase
            .from('google_classroom_connections')
            .select('access_token')
            .eq('id', connectionId)
            .single();

        if (connectionError || !connection) {
            return res.status(400).json({ error: 'Connection not found' });
        }

        const syncService = new GoogleClassroomSyncService(connection.access_token);
        const result = await syncService.syncStudents(courseId);

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('Error syncing students:', error);
        res.status(500).json({ error: 'Failed to sync students' });
    }
});

// Map students to system students
router.post('/map-students', requireAuth, async (req, res) => {
    try {
        const { courseId, mapping } = req.body;
        if (!courseId || !mapping) {
            return res.status(400).json({ error: 'Course ID and mapping are required' });
        }

        // Start a transaction
        const { error: transactionError } = await supabase.rpc('begin_transaction');

        if (transactionError) {
            throw transactionError;
        }

        try {
            // Update student mappings
            for (const [googleStudentId, systemStudentId] of Object.entries(mapping)) {
                const { error: updateError } = await supabase
                    .from('google_classroom_students')
                    .update({
                        system_student_id: systemStudentId,
                        updated_at: new Date()
                    })
                    .eq('google_student_id', googleStudentId)
                    .eq('course_id', courseId);

                if (updateError) {
                    throw updateError;
                }
            }

            // Commit the transaction
            await supabase.rpc('commit_transaction');

            res.json({ success: true });
        } catch (error) {
            // Rollback the transaction
            await supabase.rpc('rollback_transaction');
            throw error;
        }
    } catch (error) {
        console.error('Error mapping students:', error);
        res.status(500).json({ error: 'Failed to map students' });
    }
});

export default router; 