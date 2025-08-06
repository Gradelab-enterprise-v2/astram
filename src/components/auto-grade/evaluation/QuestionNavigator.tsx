
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QuestionNavigatorProps {
  evaluationData: any;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (index: number) => void;
}

export function QuestionNavigator({
  evaluationData,
  currentQuestionIndex,
  setCurrentQuestionIndex,
}: QuestionNavigatorProps) {
  if (!evaluationData?.evaluation_result?.answers) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Question Navigator</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            No questions available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Question Navigator</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-2 pr-4">
            {evaluationData?.evaluation_result?.answers?.map((answer: any, index: number) => (
              <div 
                key={index}
                className={`p-3 rounded border flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  index === currentQuestionIndex ? 'bg-slate-100 dark:bg-slate-800/70 border-primary' : ''
                }`}
                onClick={() => setCurrentQuestionIndex(index)}
              >
                <span className="text-sm">
                  <span className="font-medium">Q{index + 1}.</span> {answer.question.substring(0, 20)}...
                </span>
                {answer.score[0] === answer.score[1] && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
