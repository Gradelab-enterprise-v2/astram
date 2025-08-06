
import { Header } from "@/components/layout/Header";
import { useEffect } from "react";
import { useDeviceType } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isMobile, isTablet, isDesktop } = useDeviceType();
  const { user, loading, isSupabaseReady } = useAuth();
  const location = useLocation();

  // If authentication is still loading, show a loading screen
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading your content...</p>
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user && isSupabaseReady) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pt-4 px-4 sm:px-6 pb-12 animate-page-transition-in">
        <div className="mx-auto h-full max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
