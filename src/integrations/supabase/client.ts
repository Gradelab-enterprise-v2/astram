import { createClient } from '@supabase/supabase-js';

// Values from the connected Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single, consistent client instance with improved error handling and retry logic
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Enable session detection in URL (needed for email verification)
  },
  global: {
    fetch: (url: RequestInfo | URL, options?: RequestInit) => {
      // Enhanced error handling with safer timeout and retry logic
      const fetchWithRetry = async (attempt = 1, maxAttempts = 3): Promise<Response> => {
        try {
          // Create a new AbortController for each attempt to avoid issues with reusing aborted signals
          const controller = new AbortController();
          
          // Create a timeout that will abort the request after 60 seconds
          const timeoutId = setTimeout(() => {
            console.warn(`Request timeout reached after 60 seconds, aborting attempt ${attempt}`);
            controller.abort(new Error("Request timeout after 60 seconds"));
          }, 60000);
          
          // Merge the abort signal with any existing options
          const fetchOptions = {
            ...options,
            signal: controller.signal
          };
          
          // Perform the fetch request
          const response = await fetch(url, fetchOptions);
          
          // Clear the timeout when the request completes
          clearTimeout(timeoutId);
          
          // Log successful API calls in development
          if (process.env.NODE_ENV !== 'production') {
            console.debug(`Supabase API call successful: ${url.toString().split('?')[0]}`);
          }
          
          return response;
        } catch (error) {
          console.warn(`Fetch attempt ${attempt} failed:`, error);
          
          // Check if we've reached max attempts
          if (attempt < maxAttempts) {
            // Exponential backoff with jitter for retry
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 1000, 10000);
            console.log(`Retrying in ${backoffMs}ms... (attempt ${attempt + 1} of ${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            return fetchWithRetry(attempt + 1, maxAttempts);
          }
          
          // Provide a more specific error message for common issues
          if (error.name === 'AbortError') {
            console.error("Request aborted due to timeout");
            throw new Error("Request timed out. The server took too long to respond.");
          }
          
          // Log error details for debugging
          console.error("Network error:", error);
          throw error;
        }
      };
      
      return fetchWithRetry();
    }
  }
});

// Export a function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey ? true : false;
};

// Check if the current user is authenticated (can be used to verify auth state)
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
