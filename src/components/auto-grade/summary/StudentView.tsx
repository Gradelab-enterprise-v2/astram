import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, FileText, AlertCircle, BookOpen, TrendingUp, BookMarked, CheckCircle2, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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

  const handleSaveFeedback = () => {
    // TODO: Implement save functionality
    toast.success("Feedback saved successfully");
  };

  // Calculate section-wise performance
  const getSectionPerformance = () => {
    if (!evaluation?.answers) return {};
    
    const sectionStats: { [key: string]: { correct: number; total: number; percentage: number } } = {};
    
    evaluation.answers.forEach((answer: any) => {
      const section = answer.section || "Main Section";
      const scoreValue = answer.score && Array.isArray(answer.score) ? answer.score[0] : 0;
      const maxScore = answer.score && Array.isArray(answer.score) ? answer.score[1] : 0;
      
      if (!sectionStats[section]) {
        sectionStats[section] = { correct: 0, total: 0, percentage: 0 };
      }
      
      sectionStats[section].correct += scoreValue;
      sectionStats[section].total += maxScore;
    });
    
    // Calculate percentages
    Object.keys(sectionStats).forEach(section => {
      if (sectionStats[section].total > 0) {
        sectionStats[section].percentage = Math.round((sectionStats[section].correct / sectionStats[section].total) * 100);
      }
    });
    
    return sectionStats;
  };

  const sectionPerformance = getSectionPerformance();

  return (
    <div className="space-y-6">
      {/* Student Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{scorePercentage}%</p>
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{score}/{totalScore}</p>
              <p className="text-sm text-muted-foreground">Marks Obtained</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{rank}/{totalStudents}</p>
              <p className="text-sm text-muted-foreground">Class Rank</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Math.round(overallConfidence)}%</p>
              <p className="text-sm text-muted-foreground">Confidence</p>
            </div>
          </div>

          {/* Questions Summary */}
          {evaluation?.total_questions_detected && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3">Questions Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Questions Detected</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {evaluation.total_questions_detected}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Questions by Section</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(evaluation.questions_by_section || {}).map(([section, count]) => (
                      <Badge key={section} variant="outline" className="text-sm">
                        {section}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section-wise Performance */}
          {Object.keys(sectionPerformance).length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-3">Section-wise Performance</h4>
              <div className="space-y-3">
                {Object.entries(sectionPerformance).map(([section, stats]) => (
                  <div key={section} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{section}</p>
                      <p className="text-sm text-muted-foreground">
                        {stats.correct}/{stats.total} marks
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{stats.percentage}%</p>
                      <Progress value={stats.percentage} className="w-20 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{scorePercentage}%</span>
            </div>
            <Progress value={scorePercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Areas for Improvement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No specific strengths identified yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areasForImprovement.length > 0 ? (
              <ul className="space-y-2">
                {areasForImprovement.map((area, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{area}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No specific areas for improvement identified yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Study Recommendations */}
      {studyRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <BookMarked className="h-5 w-5" />
              Study Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {studyRecommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Teacher Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Teacher Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Personalized Feedback</label>
              <Textarea
                value={customTeacherFeedback}
                onChange={(e) => setCustomTeacherFeedback(e.target.value)}
                placeholder="Enter personalized feedback for the student..."
                className="mt-2"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveFeedback} size="sm">
                Save Feedback
              </Button>
              <Button variant="outline" onClick={handleEmailResults} size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Email Results
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zero Score Questions Alert */}
      {zeroScoreQuestions.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention needed:</strong> The following questions received zero marks and may need review: 
            {zeroScoreQuestions.map((q, index) => (
              <span key={q}>
                {index === 0 ? ' ' : index === zeroScoreQuestions.length - 1 ? ' and ' : ', '}
                <strong>Q{q}</strong>
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
