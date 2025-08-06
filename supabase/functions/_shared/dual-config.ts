import { createClient } from '@supabase/supabase-js';

// Edge function configuration for remote-only setup
export const getEdgeFunctionConfig = () => {
  // Use remote Supabase URL for edge functions
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://mfnhgldghrnjrwlhtvor.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }
  
  // Create service role client for edge functions
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  return {
    supabase,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  };
};

// Helper to determine if we're in development
export const isDevelopment = () => {
  return Deno.env.get('ENVIRONMENT') === 'development';
};

// Helper to get the appropriate database URL for edge functions
export const getDatabaseUrl = () => {
  // Edge functions always use the remote database
  return Deno.env.get('SUPABASE_URL');
}; 