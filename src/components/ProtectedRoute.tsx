
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            return prev; // Cap at 90% until actually loaded
          }
          return prev + 10;
        });
      }, 300);

      return () => clearInterval(interval);
    } else {
      setProgress(100); // Complete the progress when loaded
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md mb-4">
          <Progress value={progress} className="h-2" />
        </div>
        <p className="text-lg font-medium mb-2">Loading your content...</p>
        <p className="text-sm text-muted-foreground">
          This may take a moment while we set up your account.
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
