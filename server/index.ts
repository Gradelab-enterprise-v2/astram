import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import googleClassroomRoutes from './routes/google-classroom';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Test endpoint to verify server is running
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Admin users endpoint
app.get('/api/admin/users', async (req, res) => {
  try {
    console.log('Fetching users...');
    // Fetch all users directly using service role
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Found ${users.length} users`);

    // Get user profiles with additional data
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select(`
        id,
        current_plan:plans (
          name
        )
      `);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw profileError;
    }

    // Merge auth users with their profiles
    const mergedUsers = users.map(user => {
      const profile = profiles?.find(p => p.id === user.id);
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        status: user.banned_until ? 'DISABLED' : 'ACTIVE',
        current_plan: profile?.current_plan || null,
      };
    });

    console.log('Successfully merged users with profiles');
    res.json({ users: mergedUsers });
  } catch (error) {
    console.error('Error in /api/admin/users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user status endpoint
app.post('/api/admin/users/:userId/status', async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body;

    if (!userId || !action || !['ENABLE', 'DISABLE'].includes(action)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Update user status using service role
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: action === 'DISABLE' ? 'none' : undefined }
    );

    if (updateError) {
      throw updateError;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google Classroom routes
app.use('/api/google-classroom', googleClassroomRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 