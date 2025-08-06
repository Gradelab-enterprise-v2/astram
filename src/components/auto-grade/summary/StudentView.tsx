import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, FileText, AlertCircle, BookOpen, TrendingUp, BookMarked, CheckCircle2, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface StudentViewProps {
  student: any;
  assessmentData: any;
  classData: any;
}

export function StudentView({ student, assessmentData, classData }: StudentViewProps) {
  const { evaluation, score, totalScore, scorePercentage, rank, totalStudents, classAverage, userFeedback: savedTeacherFeedback } = assessmentData;
  const [strengths, setStrengths] = useState<string[]>([]);
  const [areasForImprovement, setAreasForImprovement] = useState<string[]>([]);
  const [teacherComment, setTeacherComment] = useState<string>("");
  const [customTeacherFeedback, setCustomTeacherFeedback] = useState<string>(savedTeacherFeedback || "");
  const [zeroScoreQuestions, setZeroScoreQuestions] = useState<number[]>([]);
  const [studyRecommendations, setStudyRecommendations] = useState<string[]>([]);
  
  // Calculate overall confidence
  const overallConfidence = evaluation?.answers?.reduce(
    (sum: number, answer: any) => sum + (answer.confidence || 0), 0
  ) / (evaluation?.answers?.length || 1) * 100;
  
  // Process evaluation data to extract strengths and areas for improvement
  useEffect(() => {
    if (!evaluation) return;
    
    // Arrays to store our generated feedback
    const extractedStrengths: string[] = [];
    const extractedWeaknesses: string[] = [];
    const zeroQuestions: number[] = [];
    const customStudyRecommendations: string[] = [];
    const processedConcepts = new Set<string>();
    
    // Check if we have structured feedback from the AI
    if (evaluation.overall_performance) {
      // Use the AI-generated structured feedback
      setStrengths(evaluation.overall_performance.strengths || []);
      setAreasForImprovement(evaluation.overall_performance.areas_for_improvement || []);
      setStudyRecommendations(evaluation.overall_performance.study_recommendations || []);
      
      // Use the AI-generated personalized summary
      if (evaluation.overall_performance.personalized_summary) {
        setTeacherComment(evaluation.overall_performance.personalized_summary);
        setCustomTeacherFeedback(evaluation.overall_performance.personalized_summary);
      }
    } else {
      // Fallback to the old logic for backward compatibility
      // Process each answer to extract insights
      evaluation.answers?.forEach((answer: any) => {
        const scoreValue = answer.score && Array.isArray(answer.score) ? answer.score[0] : 0;
        const maxScore = answer.score && Array.isArray(answer.score) ? answer.score[1] : 0;
        const scorePercentage = maxScore > 0 ? (scoreValue / maxScore) * 100 : 0;
        
        // Check if answer has a zero score AND is marked as not matching
        if (scoreValue === 0 && answer.answer_matches === false) {
          zeroQuestions.push(answer.question_no);
        }
        
        // Extract concepts as strengths if the score is good (>70% of possible points)
        if (answer.concepts && Array.isArray(answer.concepts)) {
          answer.concepts.forEach((concept: string) => {
            // Avoid duplicates
            if (!processedConcepts.has(concept.toLowerCase())) {
              processedConcepts.add(concept.toLowerCase());
              
              if (scorePercentage >= 70) {
                extractedStrengths.push(`${concept}`);
              }
            }
          });
        }
        
        // Generate actionable feedback from missing elements only if score is poor
        if (scorePercentage < 70 && answer.missing_elements && Array.isArray(answer.missing_elements)) {
          answer.missing_elements.forEach((element: string) => {
            if (element) {
              // Add to areas for improvement
              extractedWeaknesses.push(`${element} (Q${answer.question_no})`);
              
              // Add to study recommendations
              if (element.toLowerCase().includes("example")) {
                customStudyRecommendations.push("Practice with examples that illustrate key concepts");
              } 
              else if (element.toLowerCase().includes("application")) {
                customStudyRecommendations.push("Connect theoretical concepts to practical applications");
              }
              else {
                customStudyRecommendations.push(`Review ${element.toLowerCase()}`);
              }
            }
          });
        }
      });
      
      // Set the final feedback lists - keeping them concise
      setStrengths(extractedStrengths.slice(0, 3)); // Limit to 3 strengths
      setAreasForImprovement(extractedWeaknesses.slice(0, 3)); // Limit to 3 areas
      setStudyRecommendations(Array.from(new Set(customStudyRecommendations)).slice(0, 3)); // Limit to 3 unique recommendations
      
      // Generate personalized teacher's comment
      if (savedTeacherFeedback) {
        setTeacherComment(savedTeacherFeedback);
        setCustomTeacherFeedback(savedTeacherFeedback);
      } else {
        // Generate a concise teacher comment
        setTeacherComment(generateTeacherComment(
          student?.name || evaluation?.student_name,
          scorePercentage,
          zeroQuestions,
          extractedStrengths,
          extractedWeaknesses
        ));
      }
    }
    
    // Process zero score questions
    evaluation.answers?.forEach((answer: any) => {
      const scoreValue = answer.score && Array.isArray(answer.score) ? answer.score[0] : 0;
      if (scoreValue === 0 && answer.answer_matches === false) {
        zeroQuestions.push(answer.question_no);
      }
    });
    
    setZeroScoreQuestions(zeroQuestions);
  }, [evaluation, student, scorePercentage, savedTeacherFeedback]);
  
  // Helper function to generate overall performance insights
  const generateOverallPerformanceInsights = (scorePercentage: number, evaluation: any) => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const studyRecommendations: string[] = [];
    
    // Return the insights
    return { strengths, weaknesses, studyRecommendations };
  };
  
  // Generate personalized teacher comment
  const generateTeacherComment = (
    studentName: string, 
    scorePercentage: number, 
    zeroScoreQuestions: number[],
    strengths: string[],
    weaknesses: string[]
  ): string => {
    const formattedName = studentName || "The student";
    
    // Start with a personalized greeting
    let comment = `${formattedName}, `;
    
    // Add performance assessment based on score
    if (scorePercentage >= 80) {
      comment += "excellent work on this assessment. You've demonstrated strong understanding of key concepts. ";
      
      // Add specific strength if available
      if (strengths.length > 0) {
        comment += `Your grasp of ${strengths[0]} is particularly impressive. `;
      }
    } 
    else if (scorePercentage >= 60) {
      comment += "you've shown good understanding in several areas of this assessment. ";
      
      // Add specific improvement area if available
      if (weaknesses.length > 0) {
        comment += `To improve further, focus on ${weaknesses[0].split('(')[0].trim()}. `;
      }
    }
    else if (scorePercentage >= 40) {
      comment += "this assessment shows you're grasping some concepts, but there are areas that need strengthening. ";
      comment += "Let's work on building a stronger foundation. ";
    }
    else {
      comment += "we need to address some fundamental concepts to improve your understanding. ";
      comment += "Let's schedule a time to review the core material together. ";
    }
    
    // Add note about zero-score questions if applicable
    if (zeroScoreQuestions.length > 0) {
      if (zeroScoreQuestions.length === 1) {
        comment += `Question ${zeroScoreQuestions[0]} needs particular attention. `;
      } else if (zeroScoreQuestions.length <= 3) {
        comment += `Questions ${zeroScoreQuestions.join(', ')} need particular attention. `;
      }
    }
    
    // End with encouragement
    comment += "I'm here to support your learning journey.";
    
    return comment;
  };

  const handleEmailResults = () => {
    toast.info("Email functionality would be implemented here");
  };
  
  const handlePrintDetailedReport = () => {
    window.print();
  };
  
  const handleSaveTeacherFeedback = () => {
    // This would normally save to the database
    setTeacherComment(customTeacherFeedback);
    toast.success("Teacher feedback saved");
  };
  
  // Calculate grade distribution for chart
  const gradeDistribution = classData?.overview?.gradeDistribution || {
    'A': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C': 0, 'D': 0, 'F': 0
  };
  
  // Simplified grades for visualization
  const simplifiedGrades = {
    'A': gradeDistribution['A'] || 0,
    'B': (gradeDistribution['B+'] || 0) + (gradeDistribution['B'] || 0) + (gradeDistribution['B-'] || 0),
    'C': gradeDistribution['C'] || 0,
    'D': gradeDistribution['D'] || 0,
    'F': gradeDistribution['F'] || 0
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{student.name}</CardTitle>
                <p className="text-sm text-muted-foreground">Student ID: {student.roll_number || "N/A"}</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold">{assessmentData.grade}</span>
                <p className="text-muted-foreground text-sm">{scorePercentage.toFixed(1)}%</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mt-4 mb-8">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Score</p>
                <p className="text-2xl font-bold">{score}/{totalScore}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Class Rank</p>
                <p className="text-2xl font-bold">{rank}/{totalStudents}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">AI Confidence</p>
                <p className="text-2xl font-bold">{Math.round(overallConfidence)}%</p>
              </div>
            </div>
            
            {zeroScoreQuestions.length > 0 && (
              <Alert variant="destructive" className="mb-6 bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {zeroScoreQuestions.length === 1 
                    ? `The answer for question ${zeroScoreQuestions[0]} doesn't match the expected content (0 marks).`
                    : `Answers for questions ${zeroScoreQuestions.join(', ')} don't match the expected content (0 marks).`
                  }
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Question Performance</h3>
                <div className="space-y-4">
                  {evaluation?.answers?.map((answer: any, index: number) => {
                    const scoreValue = answer.score && Array.isArray(answer.score) ? answer.score[0] : 0;
                    const maxScore = answer.score && Array.isArray(answer.score) ? answer.score[1] : 0;
                    const isZeroScore = scoreValue === 0 && answer.answer_matches === false;
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">
                            Question {answer.question_no}
                            {isZeroScore && (
                              <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                                (Answer doesn't match expected content)
                              </span>
                            )}
                          </p>
                          <p className="text-sm font-medium">{scoreValue}/{maxScore} points</p>
                        </div>
                        <Progress value={(maxScore > 0 ? (scoreValue / maxScore) * 100 : 0)} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Personalized Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-primary mb-2 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  Strengths
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  {strengths.length > 0 ? (
                    strengths.map((strength, i) => (
                      <li key={i} className="text-sm">{strength}</li>
                    ))
                  ) : (
                    <li className="text-sm">Continue working to build strengths in core concepts.</li>
                  )}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-primary mb-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                  Areas to Improve
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  {areasForImprovement.length > 0 ? (
                    areasForImprovement.map((area, i) => (
                      <li key={i} className="text-sm">{area}</li>
                    ))
                  ) : (
                    <li className="text-sm">Review the core concepts covered in this assessment.</li>
                  )}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-primary mb-2 flex items-center">
                  <BookMarked className="h-4 w-4 mr-2 text-purple-600" />
                  Study Recommendations
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  {studyRecommendations.length > 0 ? (
                    studyRecommendations.map((recommendation, i) => (
                      <li key={i} className="text-sm">{recommendation}</li>
                    ))
                  ) : (
                    <li className="text-sm">Create a structured study plan focusing on the topics covered in this assessment.</li>
                  )}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-primary mb-2 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
                  Teacher's Feedback
                </h4>
                <p className="text-sm">{teacherComment}</p>
                
                {/* Teacher input area for custom feedback */}
                <div className="mt-4 space-y-2">
                  <label htmlFor="teacherFeedback" className="text-sm font-medium">
                    Add/Edit Teacher Feedback:
                  </label>
                  <Textarea
                    id="teacherFeedback"
                    value={customTeacherFeedback}
                    onChange={(e) => setCustomTeacherFeedback(e.target.value)}
                    placeholder="Enter personalized feedback for this student..."
                    className="min-h-[100px]"
                  />
                  <Button onClick={handleSaveTeacherFeedback} size="sm">
                    Save Feedback
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Student Score</span>
                <span className="text-sm">{scorePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={scorePercentage} className="h-2 bg-muted" />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Class Average</span>
                <span className="text-sm">{classAverage.toFixed(1)}%</span>
              </div>
              <Progress value={classAverage} className="h-2 bg-blue-100" />
            </div>
            
            <div className="pt-2">
              <div className="flex justify-between text-sm">
                <span>Student vs. Class Average</span>
                <span className={scorePercentage > classAverage ? "text-green-600" : "text-red-600"}>
                  {(scorePercentage - classAverage).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 h-24 items-end">
              {Object.entries(simplifiedGrades).map(([grade, count]) => {
                // Ensure count is a number
                const numericCount = typeof count === 'number' ? count : 0;
                
                return (
                  <div key={grade} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full ${getGradeColor(grade)} rounded-t`} 
                      style={{ 
                        height: `${(numericCount / totalStudents) * 100}%`,
                        minHeight: '4px'
                      }}
                    ></div>
                    <div className="mt-2 text-xs">{grade}</div>
                    <div className="text-xs text-muted-foreground">{numericCount.toString()}</div>
                  </div>
                );
              })}
            </div>
            <Separator className="my-4" />
            <p className="text-xs text-center">
              Student's grade: <span className="font-medium">{assessmentData.grade}</span>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleEmailResults}>
              <Mail className="mr-2 h-4 w-4" /> Email Results to Student
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handlePrintDetailedReport}>
              <FileText className="mr-2 h-4 w-4" /> Print Detailed Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-500';
    case 'B': return 'bg-blue-500';
    case 'C': return 'bg-yellow-500';
    case 'D': return 'bg-orange-500';
    case 'F': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}
