import { createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useAuthState } from "@/hooks/use-auth-state";
import { useAuthMethods } from "@/hooks/use-auth-methods";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{error?: Error, data?: any}>;
  signOut: () => Promise<{error?: Error}>;
  resetPassword: (email: string) => Promise<{error?: Error}>;
  updatePassword: (password: string) => Promise<{error?: Error, data?: any}>;
  loading: boolean;
  isSupabaseReady: boolean;
  isAdmin: boolean;
  adminInviteUser: (email: string, planId: string, isAnnual: boolean) => Promise<{error?: Error, data?: any}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user, session, loading, isSupabaseReady, isAdmin } = useAuthState();
  const { signIn, signOut, resetPassword, updatePassword, adminInviteUser } = useAuthMethods();

  return (
    <AuthErrorBoundary>
      <AuthContext.Provider
        value={{
          user,
          session,
          signIn,
          signOut,
          resetPassword,
          updatePassword,
          loading,
          isSupabaseReady,
          isAdmin,
          adminInviteUser,
        }}
      >
        {children}
      </AuthContext.Provider>
    </AuthErrorBoundary>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
