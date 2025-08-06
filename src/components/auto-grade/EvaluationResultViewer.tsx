
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface EvaluationResult {
  student_name: string;
  roll_no: string | number;
  class: string;
  subject: string;
  answers: {
    question_no: number;
    question: string;
    expected_answer: string;
    answer: string;
    score: [number, number]; // [assigned_score, total_score]
    remarks: string;
    confidence: number;
  }[];
}

interface EvaluationResultViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  evaluationResult: EvaluationResult | null;
}

export function EvaluationResultViewer({
  isOpen,
  onOpenChange,
  evaluationResult,
}: EvaluationResultViewerProps) {
  if (!evaluationResult) return null;

  // Calculate total score
  const totalEarned = evaluationResult.answers.reduce((sum, answer) => sum + answer.score[0], 0);
  const totalPossible = evaluationResult.answers.reduce((sum, answer) => sum + answer.score[1], 0);
  const percentageScore = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  // Function to determine badge color based on confidence
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-500";
    if (confidence >= 0.7) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">Evaluation Results</DialogTitle>
          <DialogDescription>
            Detailed grading for {evaluationResult.student_name}'s answers
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-base">{evaluationResult.student_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Roll Number</p>
                  <p className="text-base">{evaluationResult.roll_no}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Class</p>
                  <p className="text-base">{evaluationResult.class}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Subject</p>
                  <p className="text-base">{evaluationResult.subject}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground">Score</p>
                <p className="text-lg font-semibold">
                  {totalEarned} / {totalPossible} ({percentageScore}%)
                </p>
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="flex-1 w-full rounded-md border overflow-hidden" type="always">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Answer Evaluation</h3>
              
              {evaluationResult.answers.map((answer, index) => (
                <Card key={index} className="mb-4 border-l-4 border-l-primary overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Q{answer.question_no}: {answer.question}</span>
                      <Badge>
                        {answer.score[0]}/{answer.score[1]} marks
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="grid gap-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Expected Answer:</p>
                        <p className="text-sm bg-muted p-2 rounded mt-1">{answer.expected_answer}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Student's Answer:</p>
                        <p className="text-sm bg-muted p-2 rounded mt-1">{answer.answer}</p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Remarks:</p>
                          <p className="text-sm">{answer.remarks}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-muted-foreground">Confidence:</p>
                          <Badge variant="outline" className={getConfidenceBadge(answer.confidence)}>
                            {Math.round(answer.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
