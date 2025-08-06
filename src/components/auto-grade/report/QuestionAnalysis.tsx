
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuestionWithAnswer {
  question_no: number;
  question: string;
  expected_answer: string;
  answer: string;
  score: [number, number]; 
  remarks: string;
  confidence: number;
  concepts?: string[];
  missing_elements?: string[];
}

interface QuestionAnalysisProps {
  answers: QuestionWithAnswer[];
  userFeedback?: {[key: number]: string};
  userEmail?: string;
}

export function QuestionAnalysis({ 
  answers, 
  userFeedback, 
  userEmail 
}: QuestionAnalysisProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 1.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.7));
  };
  
  const fontSize = Math.floor(14 * zoomLevel);

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center gap-2 mb-4">
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
      
      {answers.map((answer, index) => (
        <div key={index} className="border rounded-lg p-4">
          <div className="flex justify-between mb-4">
            <h4 className="font-medium">Q{answer.question_no}: {answer.question}</h4>
            <span className="font-semibold">{answer.score[0]}/{answer.score[1]} marks</span>
          </div>
          
          <div className="grid gap-6 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Expected Answer:</p>
                <ScrollArea className="h-[400px] bg-muted p-4 rounded">
                  <div className="pr-4" style={{ fontSize: `${fontSize}px` }}>
                    {answer.expected_answer}
                  </div>
                </ScrollArea>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Student's Answer:</p>
                <ScrollArea className="h-[400px] bg-muted p-4 rounded">
                  <div className="pr-4" style={{ fontSize: `${fontSize}px` }}>
                    {answer.answer}
                  </div>
                </ScrollArea>
              </div>
            </div>
            
            {/* Show key concepts if available */}
            {answer.concepts && Array.isArray(answer.concepts) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Key Concepts:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {answer.concepts.map((concept: string, i: number) => (
                    <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                      {concept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Show missing elements if available */}
            {answer.missing_elements && Array.isArray(answer.missing_elements) && answer.missing_elements.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missing Elements:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {answer.missing_elements.map((element: string, i: number) => (
                    <Badge key={i} variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
                      {element}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">AI Remarks:</p>
              <p className="text-sm mt-1">{answer.remarks}</p>
            </div>
            
            {/* Show teacher feedback if available */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Teacher Feedback:</p>
              <p className="text-sm mt-1">
                {userFeedback && userFeedback[index] 
                  ? userFeedback[index]
                  : `No feedback given by ${userEmail || 'teacher'}`}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Confidence:</p>
              <Badge 
                variant="outline" 
                className={`${getConfidenceColor(answer.confidence)}`}
              >
                {Math.round(answer.confidence * 100)}%
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "bg-green-100 text-green-800 border-green-200";
  if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
}
