import React from "react";

interface AuthErrorBoundaryProps {
  error?: Error;
  children: React.ReactNode;
}

export const AuthErrorBoundary = ({ error, children }: AuthErrorBoundaryProps) => {
  if (error) {
    console.error("Auth initialization error:", error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-bold">Authentication Error</h2>
          <p className="text-destructive">There was a problem initializing authentication. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 w-full rounded bg-primary px-4 py-2 text-primary-foreground"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
