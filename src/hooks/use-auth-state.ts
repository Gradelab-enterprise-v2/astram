
import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { isUserAdmin } from "@/lib/supabase";

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        setIsSupabaseReady(true);

        // Set up the auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Auth state changed:", event);
            
            // First, update the session and user state
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            
            // Don't fetch admin status directly in the callback to avoid potential deadlocks
            if (currentSession?.user) {
              setTimeout(() => {
                checkAdminStatus(currentSession.user.id);
              }, 0);
            } else {
              setIsAdmin(false);
            }
            
            if (event === 'SIGNED_OUT') {
              console.log("User signed out, clearing state");
              setUser(null);
              setSession(null);
              setIsAdmin(false);
            }
            
            setLoading(false);
          }
        );

        // THEN check for existing session
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Error getting session:", sessionError);
          throw sessionError;
        }
        
        console.log("Session data:", data.session ? "Session exists" : "No session");
        setSession(data.session);
        setUser(data.session?.user ?? null);

        // Check if the user is an admin
        if (data.session?.user) {
          checkAdminStatus(data.session.user.id);
        }

        setLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      } catch (initError) {
        console.error("Error initializing auth:", initError);
        setError(initError as Error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const adminStatus = await isUserAdmin(userId);
      setIsAdmin(adminStatus);
    } catch (adminError) {
      console.error("Error checking admin status:", adminError);
      setIsAdmin(false);
    }
  };

  return {
    user,
    session,
    loading,
    isSupabaseReady,
    isAdmin,
    error
  };
}
