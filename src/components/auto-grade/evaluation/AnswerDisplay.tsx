
import { EyeIcon, FileText, ZoomIn, ZoomOut, ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuestionPaperView } from "@/components/auto-grade/QuestionPaperView";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { CardContent } from "@/components/ui/card";

interface AnswerDisplayProps {
  currentQuestion: any;
  currentQuestionIndex: number;
  studentId: string;
  testId: string;
  evaluationData: any;
  viewMode: "text" | "paper";
  zoomLevel: number;
  setZoomLevel: (zoomLevel: number) => void;
  handleViewModeChange: (mode: "text" | "paper") => void;
  navigateToQuestion: (direction: "prev" | "next") => void;
  totalQuestions: number;
}

export function AnswerDisplay({
  currentQuestion,
  currentQuestionIndex,
  studentId,
  testId,
  evaluationData,
  viewMode,
  zoomLevel,
  setZoomLevel,
  handleViewModeChange,
  navigateToQuestion,
  totalQuestions
}: AnswerDisplayProps) {
  // Instead of using functional updates, we'll calculate the new values first
  const handleZoomIn = () => {
    const newZoomLevel = Math.min(zoomLevel + 0.1, 1.5);
    setZoomLevel(newZoomLevel);
  };

  const handleZoomOut = () => {
    const newZoomLevel = Math.max(zoomLevel - 0.1, 0.7);
    setZoomLevel(newZoomLevel);
  };

  return (
    <CardContent className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">
          Q{currentQuestion?.question_no}: {currentQuestion?.question}
        </h2>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                {viewMode === "text" ? <EyeIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                View Mode
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewModeChange("text")}>
                <EyeIcon className="h-4 w-4 mr-2" />
                Text View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewModeChange("paper")}>
                <FileText className="h-4 w-4 mr-2" />
                Paper View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {viewMode === "text" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <h3 className="font-medium">Student's Answer</h3>
            <ScrollArea className="h-[500px] bg-slate-100 dark:bg-slate-800 rounded-md p-4 text-muted-foreground">
              <div style={{ fontSize: `${Math.floor(14 * zoomLevel)}px` }}>
                {currentQuestion?.answer || "No answer provided"}
              </div>
            </ScrollArea>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Expected Answer</h3>
            <ScrollArea className="h-[500px] bg-slate-100 dark:bg-slate-800 rounded-md p-4">
              <div style={{ fontSize: `${Math.floor(14 * zoomLevel)}px` }}>
                {currentQuestion?.expected_answer || "No expected answer available"}
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : (
        <div className="h-[500px] mb-6">
          <QuestionPaperView 
            studentId={studentId} 
            testId={testId} 
            answerSheetId={evaluationData?.answer_sheet_id} 
          />
        </div>
      )}
      
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => navigateToQuestion("prev")}
          disabled={totalQuestions <= 1}
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <Button 
          className="flex items-center gap-2"
          onClick={() => navigateToQuestion("next")}
          disabled={totalQuestions <= 1}
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  );
}
