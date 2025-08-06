
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, List } from "lucide-react";

interface EvaluationHeaderProps {
  studentDetails: any;
  testDetails: any;
  currentQuestionIndex: number;
  totalQuestions: number;
  classmates: any[];
  currentStudentIndex: number;
  navigateToStudent: (direction: "prev" | "next") => void;
  handleBackToDashboard: () => void;
  handleGoToSummary: () => void;
  setShowStudentDialog: (show: boolean) => void;
  setShowQuestionNavigator: (show: boolean) => void;
}

export function EvaluationHeader({
  studentDetails,
  testDetails,
  currentQuestionIndex,
  totalQuestions,
  classmates,
  currentStudentIndex,
  navigateToStudent,
  handleBackToDashboard,
  handleGoToSummary,
  setShowStudentDialog,
  setShowQuestionNavigator
}: EvaluationHeaderProps) {
  return <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleBackToDashboard}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div>
          <h1 className="text-xl font-semibold">{studentDetails?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {testDetails?.title} - Question {currentQuestionIndex + 1} of {totalQuestions}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setShowQuestionNavigator(true)} className="md:hidden">
          <List className="h-4 w-4 mr-2" />
          Questions
        </Button>
        
        <Button variant="default" className="flex items-center gap-1" onClick={handleGoToSummary}>
          <FileText className="h-4 w-4 mr-2" />
          View Summary
        </Button>
      </div>
    </div>;
}
