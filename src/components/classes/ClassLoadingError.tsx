
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ClassLoadingErrorProps {
  error: string | null;
  onRetry: () => void;
}

export function ClassLoadingError({ error, onRetry }: ClassLoadingErrorProps) {
  const navigate = useNavigate();
  
  return (
    <div className="p-8 text-center">
      <Alert variant="destructive" className="mb-6">
        <AlertTitle>Error Loading Class</AlertTitle>
        <AlertDescription>
          {error || "There was a problem loading the class details. Please try again later."}
        </AlertDescription>
      </Alert>
      <div className="flex justify-center gap-4 mt-6">
        <Button variant="outline" onClick={() => navigate("/classes")}>
          Back to Classes
        </Button>
        <Button onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  );
}
