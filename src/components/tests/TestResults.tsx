import React, { useState } from "react";
import { Check, X, BarChart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Student } from "@/types/academics";
import { TestResult } from "@/hooks/use-test-results";
import { Test } from "@/hooks/use-tests";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestResultsProps {
  testId: string;
  test: Test;
  testResults: TestResult[];
  subjectStudents: Student[];
  isLoadingResults: boolean;
  isLoadingStudents: boolean;
}

export function TestResults({ testId, test, testResults, subjectStudents, isLoadingResults, isLoadingStudents }: TestResultsProps) {
  const navigate = useNavigate();
  const [preparingSummary, setPreparingSummary] = useState<string | null>(null);

  // Handle viewing the assessment summary for a student
  const handleViewSummary = async (studentId: string) => {
    if (preparingSummary === studentId) return; // Prevent multiple clicks
    
    try {
      setPreparingSummary(studentId);
      // Show loading state
      toast.loading("Preparing summary view...");
      
      // Check if auto_grade_status exists for this student/test combination
      const { data: autoGradeStatus, error: statusError } = await supabase
        .from("auto_grade_status")
        .select("id, status, score")
        .eq("test_id", testId)
        .eq("student_id", studentId)
        .maybeSingle();
      
      if (statusError) {
        toast.dismiss();
        throw new Error(statusError.message);
      }
      
      // If no auto-grade data exists or it's not completed, sync the test result to auto_grade_status
      if (!autoGradeStatus || autoGradeStatus.status !== 'completed') {
        // Find the test result for this student
        const result = testResults.find(r => r.student_id === studentId);
        
        if (result) {
          // Get student information
          const student = subjectStudents.find(s => s.id === studentId);
          
          // Create a basic evaluation result structure
          const evaluationResult = {
            student_name: student?.name || "Unknown Student",
            roll_no: student?.roll_number || "N/A",
            class: test?.class?.name || "N/A",
            subject: test?.subject?.name || "N/A",
            answers: []
          };
          
          // Sync with auto_grade_status table
          const { error: syncError } = await supabase
            .from("auto_grade_status")
            .upsert({
              student_id: studentId,
              test_id: testId,
              status: "completed",
              score: result.marks_obtained,
              evaluation_result: evaluationResult,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'student_id,test_id',
              ignoreDuplicates: false
            });
          
          if (syncError) {
            toast.dismiss();
            throw new Error(syncError.message);
          }
        } else {
          toast.dismiss();
          throw new Error("No test result found for this student");
        }
      }
      
      // Dismiss loading toast and show success
      toast.dismiss();
      toast.success("Summary view ready");
      
      // Navigate to the assessment summary page
      navigate(`/auto-grade/assessment-summary/${testId}/${studentId}`);
    } catch (error) {
      console.error("Error preparing summary view:", error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Failed to prepare summary view");
    } finally {
      setPreparingSummary(null);
    }
  };

  // Get the result for a student or return null
  const getStudentResult = (studentId: string) => {
    return testResults.find(result => result.student_id === studentId);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Student Results</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingResults || isLoadingStudents ? (
          <div className="flex justify-center items-center h-32">Loading results...</div>
        ) : subjectStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Marks Obtained</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjectStudents.map((student) => {
                  const result = getStudentResult(student.id);
                  const percentage = result 
                    ? (result.marks_obtained / test.max_marks) * 100 
                    : 0;
                  const passed = percentage >= 40; // Assuming 40% is pass mark
                  
                  return (
                    <TableRow key={student.id}>
                      <TableCell>{student.roll_number || "N/A"}</TableCell>
                      <TableCell>{student.name || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        {result ? `${result.marks_obtained} / ${test.max_marks}` : "No result"}
                      </TableCell>
                      <TableCell className="text-right">
                        {result ? `${percentage.toFixed(2)}%` : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        {result ? (
                          passed ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="w-3 h-3 mr-1" /> Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <X className="w-3 h-3 mr-1" /> Fail
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">No result</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewSummary(student.id)}
                          disabled={!result || preparingSummary === student.id}
                        >
                          <BarChart className="h-4 w-4 mr-2" /> 
                          {preparingSummary === student.id ? "Preparing..." : "View Summary"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No students enrolled in this subject. Enroll students first.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
