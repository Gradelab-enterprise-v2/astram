import { supabase } from '@/integrations/supabase/client';
import type { AuthTokens, GoogleAuthConfig } from '../types';

export class GoogleClassroomAuthService {
    private readonly config: GoogleAuthConfig;

    constructor(config: GoogleAuthConfig) {
        this.config = config;
    }

    async initiateAuth(): Promise<string> {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: 'code',
            scope: this.config.scopes.join(' '),
            access_type: 'offline',
            prompt: 'consent'
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    async handleCallback(code: string): Promise<AuthTokens> {
        try {
            const params = new URLSearchParams({
                code,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                redirect_uri: this.config.redirectUri,
                grant_type: 'authorization_code'
            });

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error('Failed to get access token');
            }

            const tokens = await response.json();
            
            if (!tokens.access_token || !tokens.refresh_token) {
                throw new Error('Invalid token response from Google');
            }

            const authTokens: AuthTokens = {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresIn: tokens.expires_in || 3600,
                tokenType: tokens.token_type || 'Bearer'
            };

            // Store the connection in Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            const { error } = await supabase
                .from('google_classroom_connections')
                .insert({
                    user_id: user.id,
                    access_token: authTokens.accessToken,
                    refresh_token: authTokens.refreshToken,
                    token_expires_at: new Date(Date.now() + authTokens.expiresIn * 1000)
                });

            if (error) {
                throw error;
            }

            return authTokens;
        } catch (error) {
            console.error('Error handling Google auth callback:', error);
            throw error;
        }
    }

    async refreshToken(refreshToken: string): Promise<AuthTokens> {
        try {
            const params = new URLSearchParams({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            });

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const tokens = await response.json();
            
            if (!tokens.access_token) {
                throw new Error('Invalid token response from Google');
            }

            const authTokens: AuthTokens = {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || refreshToken,
                expiresIn: tokens.expires_in || 3600,
                tokenType: tokens.token_type || 'Bearer'
            };

            // Update the connection in Supabase
            const { error } = await supabase
                .from('google_classroom_connections')
                .update({
                    access_token: authTokens.accessToken,
                    refresh_token: authTokens.refreshToken,
                    token_expires_at: new Date(Date.now() + authTokens.expiresIn * 1000),
                    updated_at: new Date()
                })
                .eq('refresh_token', refreshToken);

            if (error) {
                throw error;
            }

            return authTokens;
        } catch (error) {
            console.error('Error refreshing Google token:', error);
            throw error;
        }
    }

    async revokeAccess(connectionId: string): Promise<void> {
        try {
            const { data: connection, error: fetchError } = await supabase
                .from('google_classroom_connections')
                .select('access_token, refresh_token')
                .eq('id', connectionId)
                .single();

            if (fetchError || !connection) {
                throw fetchError || new Error('Connection not found');
            }

            // Revoke the token with Google
            const params = new URLSearchParams({
                token: connection.access_token
            });

            await fetch(`https://oauth2.googleapis.com/revoke?${params.toString()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            // Delete the connection from Supabase
            const { error: deleteError } = await supabase
                .from('google_classroom_connections')
                .delete()
                .eq('id', connectionId);

            if (deleteError) {
                throw deleteError;
            }
        } catch (error) {
            console.error('Error revoking Google access:', error);
            throw error;
        }
    }

    async getConnectionStatus(connectionId: string): Promise<boolean> {
        try {
            const { data: connection, error } = await supabase
                .from('google_classroom_connections')
                .select('access_token, token_expires_at')
                .eq('id', connectionId)
                .single();

            if (error || !connection) {
                return false;
            }

            // Check if token is expired
            if (new Date(connection.token_expires_at) <= new Date()) {
                return false;
            }

            // Verify token is still valid by making a test API call
            const response = await fetch('https://classroom.googleapis.com/v1/courses?pageSize=1', {
                headers: {
                    'Authorization': `Bearer ${connection.access_token}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error checking connection status:', error);
            return false;
        }
    }
} 