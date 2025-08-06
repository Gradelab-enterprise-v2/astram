
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface QuestionData {
  questionNo: number;
  questionText: string;
  classAverage: number;
  maxScore: number;
  confidence: number;
  difficultyLevel: string;
  commonMistakes: string[];
  teachingRecommendations: string;
}

interface QuestionAnalysisSummaryProps {
  questionsData: QuestionData[];
}

export function QuestionAnalysisSummary({ questionsData }: QuestionAnalysisSummaryProps) {
  if (!questionsData || questionsData.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">No question analysis data available.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Question Analysis</h3>
      
      {questionsData.map((question, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-lg">Question {question.questionNo}</h4>
                  <p className="text-sm text-muted-foreground">{question.questionText}</p>
                </div>
                <span className="text-sm font-medium">{question.maxScore} points</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Class Average</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{question.classAverage.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">/ {question.maxScore}</span>
                  </div>
                  <Progress 
                    value={(question.classAverage / question.maxScore) * 100} 
                    className="h-2 mt-2"
                  />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">AI Confidence</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{Math.round(question.confidence * 100)}%</span>
                  </div>
                  <Progress 
                    value={question.confidence * 100} 
                    className="h-2 mt-2 bg-green-100"
                  />
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Difficulty Level</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{question.difficultyLevel}</span>
                  </div>
                  <Progress 
                    value={getDifficultyValue(question.difficultyLevel)} 
                    className="h-2 mt-2 bg-yellow-100"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
              <div className="p-6">
                <h5 className="font-medium mb-3">Common Mistakes</h5>
                <ul className="list-disc pl-5 space-y-2">
                  {question.commonMistakes.length > 0 ? (
                    question.commonMistakes.map((mistake: string, i: number) => (
                      <li key={i} className="text-sm">{mistake}</li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">No common mistakes identified</li>
                  )}
                </ul>
              </div>
              
              <div className="p-6">
                <h5 className="font-medium mb-3">Teaching Recommendations</h5>
                <p className="text-sm">{question.teachingRecommendations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getDifficultyValue(difficulty: string): number {
  switch (difficulty) {
    case 'Easy': return 30;
    case 'Medium': return 60;
    case 'Hard': return 90;
    default: return 50;
  }
}
