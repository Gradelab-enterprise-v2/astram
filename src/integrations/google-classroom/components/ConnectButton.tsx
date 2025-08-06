import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { GoogleClassroomAuthService } from '../services/auth.service';
import type { ConnectionStatus } from '../types';

interface ConnectButtonProps {
    onConnect: () => Promise<void>;
    onDisconnect: () => Promise<void>;
    connectionStatus: ConnectionStatus;
    className?: string;
}

const GOOGLE_CLASSROOM_SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.profile.emails'
];

export const ConnectButton: React.FC<ConnectButtonProps> = ({
    onConnect,
    onDisconnect,
    connectionStatus,
    className
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleConnect = async () => {
        try {
            setIsLoading(true);
            const authService = new GoogleClassroomAuthService({
                clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
                redirectUri: `${window.location.origin}/google-classroom/callback`,
                scopes: GOOGLE_CLASSROOM_SCOPES
            });

            const authUrl = await authService.initiateAuth();
            window.location.href = authUrl;
        } catch (error) {
            console.error('Error initiating Google Classroom connection:', error);
            toast({
                title: 'Connection Error',
                description: 'Failed to connect to Google Classroom. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setIsLoading(true);
            await onDisconnect();
            toast({
                title: 'Disconnected',
                description: 'Successfully disconnected from Google Classroom.'
            });
        } catch (error) {
            console.error('Error disconnecting from Google Classroom:', error);
            toast({
                title: 'Disconnection Error',
                description: 'Failed to disconnect from Google Classroom. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getButtonText = () => {
        switch (connectionStatus) {
            case 'CONNECTED':
                return 'Disconnect Google Classroom';
            case 'CONNECTING':
                return 'Connecting...';
            case 'ERROR':
                return 'Connection Error - Try Again';
            default:
                return 'Connect Google Classroom';
        }
    };

    const getButtonVariant = () => {
        switch (connectionStatus) {
            case 'CONNECTED':
                return 'destructive';
            case 'ERROR':
                return 'destructive';
            default:
                return 'default';
        }
    };

    return (
        <Button
            onClick={connectionStatus === 'CONNECTED' ? handleDisconnect : handleConnect}
            disabled={isLoading || connectionStatus === 'CONNECTING'}
            variant={getButtonVariant()}
            className={className}
        >
            {isLoading ? 'Loading...' : getButtonText()}
        </Button>
    );
}; 