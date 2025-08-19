
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
import { EvaluationResult } from "@/hooks/auto-grade/types";

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

  // Group answers by section
  const answersBySection = evaluationResult.answers.reduce((acc, answer) => {
    const section = answer.section || "Main Section";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(answer);
    return acc;
  }, {} as { [key: string]: typeof evaluationResult.answers });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">Evaluation Results</DialogTitle>
          <DialogDescription>
            Detailed grading for {evaluationResult.student_name}'s answers
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Student Information Card */}
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
              
              {/* Score and Questions Summary */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Score</p>
                  <p className="text-lg font-semibold">
                    {totalEarned} / {totalPossible} ({percentageScore}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Questions</p>
                  <p className="text-lg font-semibold">
                    {evaluationResult.total_questions_detected || evaluationResult.answers.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Questions by Section</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(evaluationResult.questions_by_section || {}).map(([section, count]) => (
                      <Badge key={section} variant="outline" className="text-xs">
                        {section}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Performance Summary */}
          {evaluationResult.overall_performance && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle>Overall Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {evaluationResult.overall_performance.strengths?.map((strength, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Areas for Improvement</p>
                    <ul className="space-y-1">
                      {evaluationResult.overall_performance.areas_for_improvement?.map((area, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-orange-600 mt-1">•</span>
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Study Recommendations</p>
                    <ul className="space-y-1">
                      {evaluationResult.overall_performance.study_recommendations?.map((rec, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {evaluationResult.overall_performance.personalized_summary && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Personalized Summary</p>
                    <p className="text-sm">{evaluationResult.overall_performance.personalized_summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Answer Evaluation by Section */}
          <ScrollArea className="flex-1 w-full rounded-md border overflow-hidden" type="always">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Answer Evaluation by Section</h3>
              
              {Object.entries(answersBySection).map(([sectionName, sectionAnswers]) => (
                <div key={sectionName} className="mb-6">
                  <h4 className="text-md font-semibold mb-3 text-primary border-b pb-2">
                    {sectionName} ({sectionAnswers.length} questions)
                  </h4>
                  
                  {sectionAnswers.map((answer, index) => (
                    <Card key={index} className="mb-4 border-l-4 border-l-primary overflow-hidden">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>Q{answer.question_no}: {answer.question}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={answer.answer_matches ? "default" : "destructive"}>
                              {answer.answer_matches ? "✓ Matches" : "✗ No Match"}
                            </Badge>
                            <Badge>
                              {answer.score[0]}/{answer.score[1]} marks
                            </Badge>
                          </div>
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
                          
                          {answer.raw_extracted_text && answer.raw_extracted_text !== answer.answer && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Raw Extracted Text:</p>
                              <p className="text-sm bg-muted p-2 rounded mt-1 text-muted-foreground">
                                {answer.raw_extracted_text}
                              </p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Remarks:</p>
                              <p className="text-sm">{answer.remarks}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Confidence:</p>
                              <Badge variant="outline" className={getConfidenceBadge(answer.confidence)}>
                                {Math.round(answer.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Concepts and Missing Elements */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {answer.concepts && answer.concepts.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Concepts Covered:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {answer.concepts.map((concept, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {concept}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {answer.missing_elements && answer.missing_elements.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Missing Elements:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {answer.missing_elements.map((element, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs text-orange-600">
                                      {element}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Personalized Feedback */}
                          {answer.personalized_feedback && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Personalized Feedback:</p>
                              <p className="text-sm bg-blue-50 p-2 rounded mt-1 border-l-2 border-l-blue-500">
                                {answer.personalized_feedback}
                              </p>
                            </div>
                          )}
                          
                          {/* Alignment Notes */}
                          {answer.alignment_notes && answer.alignment_notes !== "Question properly aligned" && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Alignment Notes:</p>
                              <p className="text-sm bg-yellow-50 p-2 rounded mt-1 border-l-2 border-l-yellow-500">
                                {answer.alignment_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
