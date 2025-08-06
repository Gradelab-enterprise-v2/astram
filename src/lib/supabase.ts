import { createClient } from '@supabase/supabase-js';
import { toast } from "sonner";

// Create a single, consistent client instance using remote Supabase
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: (url: RequestInfo | URL, options?: RequestInit) => {
        const fetchWithRetry = async (attempt = 1, maxAttempts = 3): Promise<Response> => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              console.warn(`Request timeout reached after 30 seconds, aborting attempt ${attempt}`);
              controller.abort(new Error("Request timeout after 30 seconds"));
            }, 60000);
            
            const fetchOptions = {
              ...options,
              signal: controller.signal
            };
            
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            
            if (import.meta.env.DEV) {
              console.debug(`Supabase API call successful: ${url.toString().split('?')[0]}`);
            }
            
            return response;
          } catch (error) {
            console.warn(`Fetch attempt ${attempt} failed:`, error);
            
            if (attempt < maxAttempts) {
              const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 10000);
              console.log(`Retrying in ${backoffMs}ms... (attempt ${attempt + 1} of ${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              return fetchWithRetry(attempt + 1, maxAttempts);
            }
            
            if (error.name === 'AbortError') {
              console.error("Request aborted due to timeout");
              throw new Error("Request timed out. The server took too long to respond.");
            }
            
            console.error("Network error:", error);
            throw error;
          }
        };
        
        return fetchWithRetry();
      }
    }
  }
);

// Export a function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
};

// Check if the current user is authenticated
export const isAuthenticated = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
    return !!user;
  } catch (error) {
    console.error("Exception checking authentication:", error);
    return false;
  }
};

// Log authentication status for debugging
export const logAuthStatus = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.info("Auth state checked:", user ? "Authenticated" : "Not authenticated");
    return !!user;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return false;
  }
};

// Check if a user is an admin
export const isUserAdmin = async (userId: string) => {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase.rpc('is_admin', { uid: userId });
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data;
  } catch (error) {
    console.error('Exception checking admin status:', error);
    return false;
  }
};

// Check if a user is a super admin
export const isSuperAdmin = async (userId: string) => {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase.rpc('is_super_admin', { uid: userId });
    if (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
    
    return data;
  } catch (error) {
    console.error('Exception checking super admin status:', error);
    return false;
  }
};

// Increment student grading usage count
export const incrementStudentGradingUsage = async (userId: string, count: number = 1) => {
  if (!userId) return;
  
  try {
    const { error } = await supabase.rpc('increment_student_grading_usage', { 
      uid: userId,
      count
    });
    
    if (error) {
      console.error('Error incrementing student grading usage:', error);
    }
  } catch (error) {
    console.error('Exception incrementing student grading usage:', error);
  }
};

// Increment test generation usage count
export const incrementTestGenerationUsage = async (userId: string, count: number = 1) => {
  if (!userId) return;
  
  try {
    const { error } = await supabase.rpc('increment_test_generation_usage', { 
      uid: userId,
      count
    });
    
    if (error) {
      console.error('Error incrementing test generation usage:', error);
    }
  } catch (error) {
    console.error('Exception incrementing test generation usage:', error);
  }
};

// Get user's current role
export const getUserRole = async (userId: string) => {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase.rpc('get_user_role', { uid: userId });
    if (error) {
      console.error('Error getting user role:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception getting user role:', error);
    return null;
  }
};
