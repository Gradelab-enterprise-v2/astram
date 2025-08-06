
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function StudentNotFound() {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
      <h2 className="text-2xl font-bold mb-2">Student Not Found</h2>
      <p className="text-muted-foreground mb-4">The student you're looking for doesn't exist or has been removed.</p>
      <Button onClick={() => navigate("/students")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Students
      </Button>
    </div>
  );
}
