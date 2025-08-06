
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AstramLogo } from "@/components/ui/AstramLogo";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { useSystemSettings } from "@/context/SystemSettingsContext";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { settings } = useSystemSettings();
  
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center gap-2 ml-4">
            <AstramLogo size="md" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button 
              variant="ghost" 
              onClick={() => navigate(user ? '/dashboard' : '/')}
            >
              Home
            </Button>
            <Button 
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="bg-primary hover:bg-primary/90 text-white transition-all duration-300"
            >
              {user ? 'Dashboard' : 'Login'}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 pt-4 px-4 sm:px-6 pb-12 animate-page-transition-in">
        <div className="mx-auto h-full max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
