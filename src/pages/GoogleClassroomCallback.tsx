import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { GoogleClassroomAuthService } from '@/integrations/google-classroom/services/auth.service';
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

export default function GoogleClassroomCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const code = searchParams.get('code');
                if (!code) {
                    throw new Error('No authorization code received');
                }

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error('User not found');
                }

                // Check for existing connections
                const { data: existingConnections } = await supabase
                    .from('google_classroom_connections')
                    .select('id')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                // Handle the callback and get tokens
                const result = await authService.handleCallback(code);

                // Store the connection in Supabase
                const { data: connection, error } = await supabase
                    .from('google_classroom_connections')
                    .insert({
                        user_id: user.id,
                        access_token: result.access_token,
                        refresh_token: result.refresh_token,
                        token_expiry: new Date(Date.now() + result.expires_in * 1000).toISOString(),
                        scope: result.scope
                    })
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                toast({
                    title: 'Success',
                    description: 'Successfully connected to Google Classroom'
                });

                // Redirect back to the integration page
                navigate('/google-classroom');
            } catch (error) {
                console.error('Error handling callback:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to connect to Google Classroom',
                    variant: 'destructive'
                });
                navigate('/google-classroom');
            } finally {
                setIsProcessing(false);
            }
        };

        handleCallback();
    }, [searchParams, navigate, toast]);

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Processing Google Classroom Connection</CardTitle>
                    <CardDescription>
                        Please wait while we complete the connection...
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        </div>
    );
} 