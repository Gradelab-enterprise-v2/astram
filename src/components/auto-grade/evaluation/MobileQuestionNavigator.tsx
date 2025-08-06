
import { Check } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileQuestionNavigatorProps {
  showQuestionNavigator: boolean;
  setShowQuestionNavigator: (show: boolean) => void;
  evaluationData: any;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (index: number) => void;
}

export function MobileQuestionNavigator({
  showQuestionNavigator,
  setShowQuestionNavigator,
  evaluationData,
  currentQuestionIndex,
  setCurrentQuestionIndex
}: MobileQuestionNavigatorProps) {
  // Handle question selection properly
  const handleQuestionSelect = (index: number) => {
    // First close the dialog to prevent UI issues
    setShowQuestionNavigator(false);
    
    // Then set the question index after a small delay
    // This helps prevent UI interaction issues
    setTimeout(() => {
      setCurrentQuestionIndex(index);
    }, 50);
  };

  return (
    <Dialog open={showQuestionNavigator} onOpenChange={setShowQuestionNavigator}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Question Navigator</DialogTitle>
          <DialogDescription>
            Select a question to view and evaluate
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 p-2">
            {evaluationData?.evaluation_result?.answers?.map((answer: any, index: number) => (
              <div 
                key={index}
                className={`p-3 rounded border flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  index === currentQuestionIndex ? 'bg-slate-100 dark:bg-slate-800/70 border-primary' : ''
                }`}
                onClick={() => handleQuestionSelect(index)}
              >
                <span className="text-sm">
                  <span className="font-medium">Q{index + 1}.</span> {answer.question}
                </span>
                {answer.score[0] === answer.score[1] && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
