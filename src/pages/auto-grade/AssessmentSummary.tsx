import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Share, ChevronLeft, ChevronRight, Users, FileText, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTests } from "@/hooks/use-tests";
import { useStudents } from "@/hooks/use-students";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { StudentView } from "@/components/auto-grade/summary/StudentView";
import { ClassOverview } from "@/components/auto-grade/summary/ClassOverview";
import { QuestionAnalysisSummary } from "@/components/auto-grade/summary/QuestionAnalysisSummary";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AssessmentSummary() {
  const { testId, studentId } = useParams<{ testId: string; studentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [classData, setClassData] = useState<any>(null);
  const { getTestById } = useTests();
  const { getStudentById } = useStudents();
  const [test, setTest] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("student");
  const [dataFetched, setDataFetched] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Navigation between students
  const [currentStudentIndex, setCurrentStudentIndex] = useState<number>(0);
  const [allStudentIds, setAllStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  
  // Student details for search dropdown
  const [studentsDetails, setStudentsDetails] = useState<any[]>([]);

  // Use useCallback to prevent infinite re-renders
  const fetchAssessmentData = useCallback(async () => {
    if (!testId || !studentId || dataFetched) return;

    try {
      setLoading(true);
      setError(null);
      console.log("Fetching assessment data for test:", testId, "student:", studentId);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 30000)
      );
      
      // Fetch the test details with timeout
      const testDataPromise = getTestById(testId);
      const testData = await Promise.race([testDataPromise, timeoutPromise]) as any;
      
      if (testData) {
        console.log("Test data fetched:", testData);
        setTest(testData);
      } else {
        console.error("Test data not found");
        throw new Error("Test not found");
      }
      
      // Fetch the student details with timeout
      const studentDataPromise = getStudentById(studentId);
      const studentData = await Promise.race([studentDataPromise, timeoutPromise]) as any;
      
      if (studentData) {
        console.log("Student data fetched:", studentData);
        setStudent(studentData);
      } else {
        console.error("Student data not found");
        throw new Error("Student not found");
      }
      
      // Fetch evaluation result for this student with timeout
      console.log("Fetching auto grade status...");
      const studentResultPromise = supabase
        .from("auto_grade_status")
        .select("evaluation_result, status, score, user_feedback")
        .eq("test_id", testId)
        .eq("student_id", studentId)
        .maybeSingle();
        
      const { data: studentResult, error: studentError } = await Promise.race([
        studentResultPromise,
        timeoutPromise
      ]) as any;

      if (studentError) {
        console.error("Error fetching student result:", studentError);
        throw new Error(studentError.message || "Failed to load student assessment data");
      }

      if (!studentResult) {
        // If no auto-grade data found, check if there's a test result
        console.log("No auto-grade data found, checking test_results...");
        const testResultPromise = supabase
          .from("test_results")
          .select("*")
          .eq("test_id", testId)
          .eq("student_id", studentId)
          .maybeSingle();
          
        const { data: testResult, error: testResultError } = await Promise.race([
          testResultPromise,
          timeoutPromise
        ]) as any;
        
        if (testResultError) {
          console.error("Error fetching test result:", testResultError);
          throw new Error(testResultError.message);
        }
        
        if (testResult) {
          console.log("Test result found, creating basic assessment data");
          // Create a basic evaluation result for test results without AI grading
          const basicEvaluationResult = {
            student_name: studentData?.name || "Unknown Student",
            roll_no: studentData?.roll_number || "N/A",
            class: testData?.class?.name || "N/A",
            subject: testData?.subject?.name || "N/A",
            answers: []
          };
          
          // Create assessment data from test result
          const basicAssessmentData = {
            evaluation: basicEvaluationResult,
            score: testResult.marks_obtained,
            totalScore: testData.max_marks,
            scorePercentage: testResult.marks_obtained / testData.max_marks * 100,
            rank: 0, // Will be calculated below
            totalStudents: 0, // Will be updated below
            grade: calculateGrade(testResult.marks_obtained / testData.max_marks * 100),
            classAverage: 0 // Will be calculated below
          };
          
          setAssessmentData(basicAssessmentData);
          
          // Set minimal class data for basic view
          setClassData({
            overview: {
              average: 0,
              median: 0,
              highest: 0,
              lowest: 0,
              rankings: [],
              gradeDistribution: { 'A': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C': 0, 'D': 0, 'F': 0 }
            },
            questions: []
          });
        } else {
          console.error("No result data found for this student");
          throw new Error("No assessment data found for this student");
        }
      } else if (studentResult && studentResult.status !== 'completed') {
        console.log("Auto-grade status found but not completed:", studentResult.status);
        throw new Error("Assessment is still processing. Please try again later.");
      } else if (studentResult && studentResult.evaluation_result) {
        console.log("Auto-grade data found with evaluation result");
        
        // Fetch class data - all students' results for this test with timeout
        const classResultsPromise = supabase
          .from("auto_grade_status")
          .select(`
            id, 
            score, 
            status,
            student_id,
            evaluation_result,
            user_feedback
          `)
          .eq("test_id", testId);

        const { data: classResults, error: classError } = await Promise.race([
          classResultsPromise,
          timeoutPromise
        ]) as any;

        if (classError) {
          console.error("Error fetching class results:", classError);
          throw new Error(classError.message);
        }

        // Safety check: ensure classResults is defined and is an array
        const validClassResults = Array.isArray(classResults) ? classResults : [];
        
        // Filter only completed evaluations with valid results for navigation
        const validStudentResults = validClassResults
          .filter((result: any) => 
            result && 
            result.status === 'completed' && 
            result.score !== null &&
            result.student_id // Ensure student ID exists
          );
          
        // Extract all student IDs with completed evaluations for navigation
        const studentIds = validStudentResults
          .filter((result: any) => result && result.student_id) // Extra safety check
          .map((result: any) => result.student_id);
        
        // Fetch student details separately
        let studentsDetailsList: any[] = [];
        if (studentIds.length > 0) {
          try {
            const studentsPromise = supabase
              .from("students")
              .select("id, name, roll_number")
              .in("id", studentIds);
              
            const { data: studentsData, error: studentsError } = await Promise.race([
              studentsPromise,
              timeoutPromise
            ]) as any;
            
            if (studentsError) {
              console.error("Error fetching students:", studentsError);
              // Continue without student details rather than failing completely
            } else {
              studentsDetailsList = studentsData || [];
            }
          } catch (error) {
            console.error("Error fetching student details:", error);
            // Continue without student details
          }
        }
        
        // Only set if there are valid IDs
        if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
          setAllStudentIds(studentIds);
          
          // Find the index of the current student
          const currentIndex = studentIds.findIndex((id: string) => id === studentId);
          setCurrentStudentIndex(currentIndex !== -1 ? currentIndex : 0);
        } else {
          // Fallback if no valid student IDs
          setAllStudentIds([studentId].filter(Boolean)); // At least include current student if valid
          setCurrentStudentIndex(0);
        }
        
        // Store student details for search - with extra safeguards
        const studentDetailsList = validStudentResults
          .filter((result: any) => 
            result && 
            result.student_id
          )
          .map((result: any) => {
            // Find corresponding student data
            const studentData = studentsDetailsList.find(s => s.id === result.student_id);
            return {
              id: result.student_id,
              name: studentData?.name || 'Unknown Student',
              rollNumber: studentData?.roll_number || 'N/A',
              score: result.score,
              status: result.status
            };
          });
        
        setStudentsDetails(studentDetailsList || []);

        // Calculate class statistics and rankings - with error handling
        const studentsWithScores = validStudentResults
          .filter((result: any) => 
            result && 
            result.student_id && 
            result.score !== null && 
            result.score !== undefined
          )
          .map((result: any) => {
            // Find corresponding student data
            const studentData = studentsDetailsList.find(s => s.id === result.student_id);
            return {
              id: result.student_id,
              name: studentData?.name || 'Unknown Student',
              roll_number: studentData?.roll_number || 'N/A',
              score: result.score || 0,
              scorePercentage: (result.score / (testData?.max_marks || 100)) * 100,
              grade: calculateGrade((result.score / (testData?.max_marks || 100)) * 100),
              status: result.status,
              evaluation_result: result.evaluation_result,
              user_feedback: result.user_feedback
            };
          });
          
        // Sort by score (descending) - with safeguards
        if (studentsWithScores && Array.isArray(studentsWithScores)) {
          studentsWithScores.sort((a: any, b: any) => 
            (b?.scorePercentage || 0) - (a?.scorePercentage || 0)
          );
        }
        
        // Calculate class average, median, highest and lowest scores - with safeguards
        const validScores = studentsWithScores
          .filter(student => student && typeof student.scorePercentage === 'number')
          .map(student => student.scorePercentage);
          
        const totalScore = validScores.reduce((sum: number, score: number) => sum + score, 0);
        const classAverage = validScores.length > 0 ? totalScore / validScores.length : 0;
        
        // Calculate median score
        const medianScore = calculateMedian(validScores);
        
        // Calculate highest and lowest scores
        const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
        const lowestScore = validScores.length > 0 ? Math.min(...validScores) : 0;
        
        // Calculate grade distribution
        const gradeDistribution = calculateGradeDistribution(studentsWithScores);
        
        // Find current student's rank
        const studentRank = studentsWithScores.findIndex((s: any) => s.id === studentId) + 1;
        
        const studentAssessmentData = {
          evaluation: studentResult.evaluation_result,
          score: studentResult.score,
          totalScore: testData.max_marks,
          scorePercentage: studentResult.score / testData.max_marks * 100,
          rank: studentRank > 0 ? studentRank : 1, // Ensure valid rank
          totalStudents: studentsWithScores.length || 1, // Ensure at least 1
          grade: calculateGrade(studentResult.score / testData.max_marks * 100),
          classAverage,
          userFeedback: studentResult.user_feedback
        };
        
        const classOverviewData = {
          average: classAverage,
          median: medianScore,
          highest: highestScore,
          lowest: lowestScore,
          rankings: studentsWithScores || [],
          gradeDistribution
        };
        
        // Analyze questions for insights - with safety check
        let questionsAnalysis = [];
        try {
          questionsAnalysis = analyzeQuestions(validClassResults, testData);
        } catch (error) {
          console.error("Error analyzing questions:", error);
          questionsAnalysis = []; // Fallback to empty array
        }
        
        setAssessmentData(studentAssessmentData);
        setClassData({ 
          overview: classOverviewData,
          questions: questionsAnalysis 
        });
      }
      
      // Mark data as fetched to prevent additional fetches
      setDataFetched(true);
      
    } catch (error: any) {
      console.error("Error fetching assessment data:", error);
      setError(error.message || "Failed to load assessment data");
      toast.error(error.message || "Failed to load assessment data");
    } finally {
      setLoading(false);
    }
  }, [testId, studentId, getTestById, getStudentById, dataFetched]);

  useEffect(() => {
    fetchAssessmentData();
  }, [fetchAssessmentData]);

  // Navigate to the next or previous student
  const navigateToStudent = (direction: 'next' | 'prev') => {
    if (!allStudentIds || !Array.isArray(allStudentIds) || allStudentIds.length === 0) {
      toast.error("No student data available for navigation");
      return;
    }
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentStudentIndex + 1) % allStudentIds.length;
    } else {
      newIndex = (currentStudentIndex - 1 + allStudentIds.length) % allStudentIds.length;
    }
    
    const nextStudentId = allStudentIds[newIndex];
    if (nextStudentId) {
      setDataFetched(false);
      navigate(`/auto-grade/assessment-summary/${testId}/${nextStudentId}`);
    } else {
      toast.error("Invalid student selection");
    }
  };

  // Handle navigating to a specific student from search
  const navigateToSpecificStudent = (selectedStudentId: string) => {
    if (selectedStudentId) {
      setDataFetched(false);
      setSearchOpen(false);
      navigate(`/auto-grade/assessment-summary/${testId}/${selectedStudentId}`);
    }
  };

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'B-';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const calculateMedian = (values: number[]): number => {
    if (!values || !Array.isArray(values) || values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  };

  const calculateGradeDistribution = (students: any[]): Record<string, number> => {
    if (!students || !Array.isArray(students)) {
      return { 'A': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C': 0, 'D': 0, 'F': 0 };
    }
    
    const distribution: Record<string, number> = {
      'A': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C': 0, 'D': 0, 'F': 0
    };
    
    students.forEach(student => {
      if (student && student.grade && distribution[student.grade] !== undefined) {
        distribution[student.grade]++;
      }
    });
    
    return distribution;
  };

  const analyzeQuestions = (results: any[], testData: any) => {
    if (!results || !Array.isArray(results) || results.length === 0) return [];
    
    // Get only completed assessments with evaluation results
    const completedAssessments = results.filter((r: any) => 
      r && r.status === 'completed' && r.evaluation_result && r.evaluation_result.answers
    );
    
    if (completedAssessments.length === 0) return [];
    
    // Assume that all evaluation results have the same questions
    // Use the first result to get question structure
    const firstResult = completedAssessments[0].evaluation_result;
    
    if (!firstResult || !firstResult.answers || !Array.isArray(firstResult.answers)) {
      console.warn("Invalid evaluation result structure:", firstResult);
      return [];
    }
    
    // Ensure answers is an array before mapping
    if (!Array.isArray(firstResult.answers)) {
      console.error("Answers is not an array:", firstResult.answers);
      return [];
    }
    
    return firstResult.answers.map((question: any, questionIndex: number) => {
      // Safety check for question
      if (!question) {
        return {
          questionNo: questionIndex + 1,
          questionText: "Unknown Question",
          classAverage: 0,
          maxScore: 0,
          confidence: 0,
          difficultyLevel: "Medium",
          commonMistakes: [],
          teachingRecommendations: "Insufficient data for recommendations"
        };
      }
      
      // Calculate class average for this question
      let totalScore = 0;
      let totalPossibleScore = 0;
      let confidenceSum = 0;
      
      // Collect common mistakes
      const mistakes: Record<string, number> = {};
      
      completedAssessments.forEach((assessment: any) => {
        if (!assessment || !assessment.evaluation_result || !assessment.evaluation_result.answers) return;
        
        const answers = assessment.evaluation_result.answers;
        if (Array.isArray(answers) && answers.length > questionIndex) {
          const q = answers[questionIndex];
          if (q && Array.isArray(q.score) && q.score.length >= 2) {
            totalScore += q.score[0];
            totalPossibleScore += q.score[1];
            confidenceSum += q.confidence || 0;
            
            // Analyze remarks for common mistakes
            if (q.remarks) {
              // This is simplified - in a real app, you'd need more sophisticated NLP
              const keywords = q.remarks.toLowerCase().split(' ');
              keywords.forEach((word: string) => {
                if (word.length > 5) { // Only consider substantial words
                  if (!mistakes[word]) mistakes[word] = 0;
                  mistakes[word]++;
                }
              });
            }
          }
        }
      });
      
      const classAverage = (completedAssessments.length > 0 && totalPossibleScore > 0) ? 
        (totalScore / completedAssessments.length) : 0;
      const maxScore = question.score && Array.isArray(question.score) && question.score.length >= 2 ? 
        question.score[1] : 0;
      const averageConfidence = completedAssessments.length > 0 ? 
        (confidenceSum / completedAssessments.length) : 0;
      
      // Determine difficulty level based on average scores
      let difficultyLevel = "Medium";
      const averagePercentage = maxScore > 0 ? (classAverage / maxScore) * 100 : 0;
      if (averagePercentage >= 80) difficultyLevel = "Easy";
      else if (averagePercentage <= 40) difficultyLevel = "Hard";
      
      // Extract common mistakes - safely handle as there might not be any
      const mistakesEntries = Object.entries(mistakes);
      const commonMistakesArray = mistakesEntries.length > 0 
        ? mistakesEntries
            .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
            .slice(0, 3)
            .map(([mistake]) => mistake)
        : [];
      
      return {
        questionNo: question.question_no || questionIndex + 1,
        questionText: question.question || "Question not available",
        classAverage,
        maxScore,
        confidence: averageConfidence,
        difficultyLevel,
        commonMistakes: commonMistakesArray,
        teachingRecommendations: generateTeachingRecommendations(difficultyLevel, commonMistakesArray)
      };
    });
  };

  const generateTeachingRecommendations = (difficultyLevel: string, mistakes: string[]): string => {
    if (difficultyLevel === "Hard") {
      return "Consider providing additional practice material and more detailed explanations on this topic.";
    } else if (difficultyLevel === "Easy") {
      return "Students seem to grasp this concept well. Consider introducing more challenging applications.";
    }
    return "Provide a structured framework for answering this type of question with clear examples and real-world applications.";
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    toast.info("Email sharing functionality would go here");
    // In a real app, this would open an email form or send an email directly
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleGoToGrading = () => {
    navigate(`/auto-grade/evaluation/${testId}/${studentId}`);
  };

  // Filter students based on search query - with safety checks
  const filteredStudents = (() => {
    // First check if search query exists
    if (!studentSearchQuery) return studentsDetails;
    
    // Check if studentsDetails is valid array
    if (!studentsDetails || !Array.isArray(studentsDetails)) return [];
    
    // Apply filtering with extra safeguards
    return studentsDetails.filter(s => {
      if (!s) return false;
      
      const nameMatch = s.name && typeof s.name === 'string' && 
        s.name.toLowerCase().includes(studentSearchQuery.toLowerCase());
      
      const rollMatch = s.rollNumber && typeof s.rollNumber === 'string' && 
        s.rollNumber.toLowerCase().includes(studentSearchQuery.toLowerCase());
      
      return nameMatch || rollMatch;
    });
  })();

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Unable to load assessment data. Please try again or contact support if the issue persists.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setError(null);
                setDataFetched(false);
                setLoading(true);
                fetchAssessmentData();
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assessmentData || !test || !student) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No assessment data found for this student.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safely get the current student name
  const currentStudentName = (() => {
    if (student && student.name) {
      return student.name;
    }
    
    if (studentsDetails && Array.isArray(studentsDetails) && studentId) {
      const foundStudent = studentsDetails.find(s => s && s.id === studentId);
      return foundStudent?.name || "Select Student";
    }
    
    return "Select Student";
  })();

  return (
    <div className="container mx-auto py-8 space-y-6 print:py-2">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button variant="outline" onClick={handleGoToGrading}>
            <FileText className="mr-2 h-4 w-4" /> Go to Grading
          </Button>
        </div>
        
        {/* Student navigation and selection */}
        <div className="flex gap-2 items-center">
          <Button 
            variant="outline" 
            onClick={() => navigateToStudent('prev')}
            disabled={!allStudentIds || !Array.isArray(allStudentIds) || allStudentIds.length <= 1}
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Improved Student Selector */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                role="combobox" 
                aria-expanded={searchOpen}
                className="w-[200px] justify-between"
                aria-label="Select student"
              >
                <span className="truncate">{currentStudentName}</span>
                <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="end">
              <Command>
                <CommandInput 
                  placeholder="Search student..." 
                  value={studentSearchQuery}
                  onValueChange={setStudentSearchQuery}
                />
                <CommandEmpty>No student found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-auto">
                  {filteredStudents && Array.isArray(filteredStudents) && filteredStudents.length > 0 ? 
                    filteredStudents.map((student) => (
                      student && student.id ? (
                        <CommandItem
                          key={student.id}
                          value={student.id}
                          onSelect={() => navigateToSpecificStudent(student.id)}
                          className="cursor-pointer flex justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{student.name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">Roll: {student.rollNumber || "N/A"}</span>
                          </div>
                          <span className="text-xs">
                            {student.score !== undefined ? `Score: ${student.score}` : 'No score'}
                          </span>
                        </CommandItem>
                      ) : null
                    )) : (
                    <CommandItem disabled>No students with results available</CommandItem>
                  )}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline" 
            onClick={() => navigateToStudent('next')}
            disabled={!allStudentIds || !Array.isArray(allStudentIds) || allStudentIds.length <= 1}
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assessment Summary</h1>
        <p className="text-muted-foreground">{test?.subject?.name} - {test?.title}</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4 print:hidden">
          <TabsList>
            <TabsTrigger value="student">Student View</TabsTrigger>
            <TabsTrigger value="class">Class Overview</TabsTrigger>
            <TabsTrigger value="questions">Question Analysis</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" /> Share (mail)
            </Button>
          </div>
        </div>
        
        <TabsContent value="student" className="mt-0">
          <StudentView 
            student={student}
            assessmentData={assessmentData}
            classData={classData}
          />
        </TabsContent>
        
        <TabsContent value="class" className="mt-0">
          <ClassOverview 
            testData={test}
            classData={classData}
            currentStudentId={studentId || ""}
          />
        </TabsContent>
        
        <TabsContent value="questions" className="mt-0">
          <QuestionAnalysisSummary 
            questionsData={classData?.questions || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

