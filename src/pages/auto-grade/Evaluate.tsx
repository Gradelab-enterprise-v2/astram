
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  AlertCircle,
  ArrowLeft,
  Brain,
  Check, 
  Circle, 
  Eye,
  FileText, 
  FileUp,
  Loader2, 
  Upload, 
  XCircle
} from "lucide-react";
import { useAutoGrade } from "@/hooks/use-auto-grade";
import { useStudents } from "@/hooks/use-students";
import { useTests } from "@/hooks/use-tests";
import { useTestPapers } from "@/hooks/use-test-papers";
import { Student } from "@/types/academics";
import { toast } from "sonner";
import { useStudentSheets, StudentAnswerSheet } from "@/hooks/use-student-sheets";
import { AnswerSheetViewer } from "@/components/auto-grade/AnswerSheetViewer";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export default function Evaluate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const classId = searchParams.get("class") || "";
  const subjectId = searchParams.get("subject") || "";
  const testId = searchParams.get("test") || "";
  const queryClient = useQueryClient();
  
  // Student-specific upload states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<StudentAnswerSheet | null>(null);
  const [processingTextExtraction, setProcessingTextExtraction] = useState<{[key: string]: boolean}>({});
  const [extractionProgress, setExtractionProgress] = useState<{[key: string]: number}>({});
  
  const { getTestById } = useTests();
  const { fetchStudentsBySubject } = useStudents();
  const { usePapersByTest } = useTestPapers();
  const { 
    useUploadAnswerSheet, 
    useExtractText, 
    useStudentAnswerSheet 
  } = useStudentSheets();
  
  const {
    studentGradingStatus,
    isLoadingGradingData,
    setSelectedClassId,
    setSelectedSubjectId,
    setSelectedTestId,
    evaluateStudent,
    evaluateAll,
    canEvaluate,
    setStudentUploading,
    isStudentUploading
  } = useAutoGrade();
  
  const uploadAnswerSheetMutation = useUploadAnswerSheet();
  const extractTextMutation = useExtractText();
  
  const { data: testPapers = [], isLoading: isLoadingPapers } = usePapersByTest(testId);
  const [test, setTest] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingTest, setIsLoadingTest] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  useEffect(() => {
    if (classId) setSelectedClassId(classId);
    if (subjectId) setSelectedSubjectId(subjectId);
    if (testId) setSelectedTestId(testId);
  }, [classId, subjectId, testId, setSelectedClassId, setSelectedSubjectId, setSelectedTestId]);
  
  useEffect(() => {
    if (!testId || initialDataLoaded) return;
    
    const fetchTestDetails = async () => {
      setIsLoadingTest(true);
      try {
        const testData = await getTestById(testId);
        setTest(testData);
      } catch (error) {
        console.error("Error fetching test:", error);
        toast.error("Failed to load test details");
      } finally {
        setIsLoadingTest(false);
      }
    };
    
    fetchTestDetails();
  }, [testId, getTestById, initialDataLoaded]);
  
  useEffect(() => {
    if (!subjectId || initialDataLoaded) return;
    
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const studentsData = await fetchStudentsBySubject(subjectId);
        setStudents(studentsData);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Failed to load students");
      } finally {
        setIsLoadingStudents(false);
      }
    };
    
    fetchStudents();
  }, [subjectId, fetchStudentsBySubject, initialDataLoaded]);
  
  useEffect(() => {
    if (!isLoadingTest && !isLoadingStudents && testId && subjectId && !initialDataLoaded) {
      setInitialDataLoaded(true);
    }
  }, [isLoadingTest, isLoadingStudents, testId, subjectId, initialDataLoaded]);
  
  const hasQuestionPaper = testPapers.some(paper => paper.paper_type === "question");
  const hasAnswerKey = testPapers.some(paper => paper.paper_type === "answer");
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (!currentStudent || !selectedFile) return;
    
    // Set this specific student's upload status to loading
    setStudentUploading(currentStudent.id, true);
    
    try {
      const result = await uploadAnswerSheetMutation.mutateAsync({
        file: selectedFile,
        studentId: currentStudent.id,
        testId: testId
      });
      
      if (result) {
        setUploadDialogOpen(false);
        setSelectedFile(null);
        
        setProcessingTextExtraction(prev => ({
          ...prev,
          [currentStudent.id]: true
        }));
        
        simulateProgressUpdates(currentStudent.id);
        
        await extractTextMutation.mutateAsync(result);
        
        setExtractionProgress(prev => ({
          ...prev,
          [currentStudent.id]: 100
        }));
        
        setProcessingTextExtraction(prev => ({
          ...prev,
          [currentStudent.id]: false
        }));
        
        try {
          await supabase
            .from("auto_grade_status")
            .upsert({
              student_id: currentStudent.id,
              test_id: testId,
              answer_sheet_id: result.id,
              status: "pending",
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'student_id,test_id',
              ignoreDuplicates: false
            });
            
          queryClient.invalidateQueries({ queryKey: ["auto-grade", "status", testId] });
        } catch (error) {
          console.error("Error updating auto grade status:", error);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload or process answer sheet");
      
      setProcessingTextExtraction(prev => ({
        ...prev,
        [currentStudent.id]: false
      }));
    } finally {
      setStudentUploading(currentStudent.id, false);
    }
  };
  
  const simulateProgressUpdates = (studentId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress > 95) progress = 95;
      
      setExtractionProgress(prev => ({
        ...prev,
        [studentId]: Math.floor(progress)
      }));
      
      if (progress >= 95) {
        clearInterval(interval);
      }
    }, 800);
    
    return interval;
  };
  
  const handleEvaluate = async (studentId: string) => {
    try {
      await evaluateStudent(studentId);
    } catch (error) {
      console.error("Evaluation error:", error);
    }
  };
  
  const handleViewSheet = async (student: Student) => {
    try {
      const status = studentGradingStatus.find(s => s.student.id === student.id);
      
      if (status?.answerSheetId) {
        const { data: sheetData, error } = await supabase
          .from("student_answer_sheets")
          .select("*")
          .eq("id", status.answerSheetId)
          .maybeSingle();
          
        if (error) {
          throw error;
        }
        
        setSelectedSheet(sheetData);
        setViewSheetOpen(true);
      } else {
        toast.error("Answer sheet not found");
      }
    } catch (error) {
      console.error("Error fetching answer sheet:", error);
      toast.error("Failed to load answer sheet");
    }
  };
  
  const handleViewReport = (student: Student) => {
    navigate(`/auto-grade/evaluation/${testId}/${student.id}`);
  };
  
  const handleBackToSelection = () => {
    navigate("/auto-grade");
  };
  
  const showMissingComponentsWarning = !hasQuestionPaper || !hasAnswerKey;
  
  const isLoading = isLoadingTest || isLoadingStudents || isLoadingPapers || isLoadingGradingData;
  
  if (isLoading && !initialDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading evaluation data...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 animate-page-transition-in">
      <div className="flex flex-col space-y-4">
        <Button 
          variant="outline" 
          className="w-fit flex items-center gap-2"
          onClick={handleBackToSelection}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Selection
        </Button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{test?.title || "Test Evaluation"}</h1>
            <p className="text-muted-foreground">
              Class: {test?.class?.name || "N/A"} | 
              Subject: {test?.subject?.name || "N/A"} | 
              Date: {test?.date ? new Date(test.date).toLocaleDateString() : "N/A"}
            </p>
          </div>
          
          <Button 
            onClick={() => evaluateAll()}
            disabled={showMissingComponentsWarning || studentGradingStatus.length === 0 || !studentGradingStatus.some(s => s.answerSheetId)}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Evaluate All
          </Button>
        </div>
      </div>
      
      {showMissingComponentsWarning && (
        <Card className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-amber-800 dark:text-amber-300">
              <p className="font-medium">Missing required components for evaluation:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {!hasQuestionPaper && <li>Question paper is missing</li>}
                {!hasAnswerKey && <li>Answer key is missing</li>}
              </ul>
              <p className="mt-2">Please upload these documents in the test details page before proceeding with evaluation.</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Student Answer Sheets</CardTitle>
          <CardDescription>Upload and evaluate student answer sheets for automated grading</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Student Name</TableHead>
                  <TableHead className="w-[15%]">Roll Number</TableHead>
                  <TableHead className="w-[20%]">Answer Sheet</TableHead>
                  <TableHead className="w-[25%]">Status</TableHead>
                  <TableHead className="text-right w-[15%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No students enrolled in this class and subject
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => {
                    const status = studentGradingStatus.find(s => s.student.id === student.id);
                    const hasAnswerSheet = !!status?.answerSheetId;
                    const isProcessing = processingTextExtraction[student.id];
                    const extractionPercentage = extractionProgress[student.id] || 0;
                    const isUploading = isStudentUploading(student.id);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.roll_number || "N/A"}</TableCell>
                        <TableCell>
                          {isProcessing ? (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Extracting text...</div>
                              <Progress value={extractionPercentage} className="h-2 w-32" />
                            </div>
                          ) : hasAnswerSheet ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => handleViewSheet(student)}
                            >
                              <Eye className="h-4 w-4" />
                              View Paper
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex items-center gap-1"
                              onClick={() => {
                                setCurrentStudent(student);
                                setUploadDialogOpen(true);
                              }}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              {isUploading ? "Uploading..." : "Upload"}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {!status || status.status === 'pending' ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Circle className="h-4 w-4" />
                              {hasAnswerSheet ? "Ready for evaluation" : "Pending"}
                            </span>
                          ) : status.status === 'processing' ? (
                            <div className="space-y-1">
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing
                              </span>
                              <Progress value={45} className="h-1 w-32" />
                            </div>
                          ) : status.status === 'completed' ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <Check className="h-4 w-4" />
                              Completed ({status.score}/{test?.max_marks || 100})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                              <XCircle className="h-4 w-4" />
                              Failed
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {hasAnswerSheet ? (
                            status?.status === 'completed' ? (
                              <Button 
                                size="sm" 
                                variant="default"
                                className="flex items-center gap-1"
                                onClick={() => handleViewReport(student)}
                              >
                                <FileText className="h-4 w-4" />
                                View Report
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="default"
                                className="flex items-center gap-1"
                                disabled={status?.status === 'processing' || !canEvaluate || isProcessing}
                                onClick={() => handleEvaluate(student.id)}
                              >
                                {status?.status === 'processing' ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Brain className="h-4 w-4" />
                                    Evaluate
                                  </>
                                )}
                              </Button>
                            )
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex items-center gap-1"
                              onClick={() => {
                                setCurrentStudent(student);
                                setUploadDialogOpen(true);
                              }}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileUp className="h-4 w-4" />
                              )}
                              {isUploading ? "Uploading..." : "Add Sheet"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Answer Sheet</DialogTitle>
            <DialogDescription>
              Upload a scanned answer sheet for {currentStudent?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <label htmlFor="answer-sheet" className="text-sm font-medium leading-none">
                Answer Sheet (PDF)
              </label>
              <input
                id="answer-sheet"
                type="file"
                accept=".pdf"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onChange={handleFileChange}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={!selectedFile || isStudentUploading(currentStudent?.id || '')} 
              onClick={handleUpload}
              className="flex items-center gap-2"
            >
              {isStudentUploading(currentStudent?.id || '') ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <AnswerSheetViewer
        isOpen={viewSheetOpen}
        onOpenChange={setViewSheetOpen}
        sheet={selectedSheet}
        studentName={studentGradingStatus.find(s => 
          s.answerSheetId === selectedSheet?.id
        )?.student.name}
      />
    </div>
  );
}
