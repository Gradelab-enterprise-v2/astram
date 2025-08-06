import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTests } from "@/hooks/use-tests";
import { useTestResults } from "@/hooks/use-test-results";
import { useTestPapers } from "@/hooks/use-test-papers";
import { useStudentsBySubject } from "@/hooks/students/use-student-queries";
import { NewTestForm } from "@/components/tests/NewTestForm";
import { TestOverview } from "@/components/tests/TestOverview";
import { TestPapers } from "@/components/tests/TestPapers";
import { TestResults } from "@/components/tests/TestResults";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TestPaper } from "@/types/test-papers";
import { toast } from "sonner";
import { ExtractedTextViewer } from "@/components/resources/ExtractedTextViewer";

export default function TestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getTestById, updateTest } = useTests();
  const isNewTest = !id || id === "new";
  const [viewingPaper, setViewingPaper] = useState<TestPaper | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [isDataFetched, setIsDataFetched] = useState(false);
  
  const { usePapersByTest } = useTestPapers();
  const { data: papers = [], isLoading: isLoadingPapers } = usePapersByTest(isNewTest ? "" : id || "");
  
  const { useResultsByTest } = useTestResults();
  const { data: testResults = [], isLoading: isLoadingResults } = useResultsByTest(isNewTest ? "" : id || "");
  
  const { data: subjectStudents = [], isLoading: isLoadingStudents } = useStudentsBySubject(
    test?.subject_id || ""
  );

  useEffect(() => {
    if (isNewTest || isDataFetched) {
      setLoading(false);
      return;
    }

    const fetchTest = async () => {
      try {
        setLoading(true);
        setError(null);
        const testData = await getTestById(id as string);
        setTest(testData);
        setIsDataFetched(true);
      } catch (err: any) {
        console.error("Error fetching test:", err);
        setError(err.message || "Failed to load test details");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id, getTestById, isNewTest, isDataFetched]);

  const handleTestCreated = (testId: string) => {
    navigate(`/tests/${testId}`);
  };
  
  const handleViewExtractedText = (paper: TestPaper) => {
    setViewingPaper(paper);
    setShowExtractedText(true);
  };
  
  const handlePapersChange = () => {
    // We don't need to reload the entire test, just invalidate the papers query
    // This will be handled automatically by the useTestPapers hook
  };
  
  const handleUpdateTest = async (updatedData: any) => {
    if (!id || isNewTest) return;
    
    try {
      await updateTest({
        id,
        ...updatedData
      }, {
        onSuccess: () => {
          toast.success("Test updated successfully");
          setTest(prev => ({
            ...prev,
            ...updatedData
          }));
        }
      });
    } catch (error: any) {
      toast.error(`Failed to update test: ${error.message}`);
    }
  };

  const handleRetry = () => {
    setIsDataFetched(false);
    setError(null);
    setLoading(true);
    
    const fetchTest = async () => {
      try {
        const testData = await getTestById(id as string);
        setTest(testData);
        setError(null);
        setIsDataFetched(true);
      } catch (err: any) {
        setError(err.message || "Failed to load test details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTest();
  };

  return (
    <div className="space-y-6 animate-page-transition-in">
      <div>
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => navigate("/tests")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tests
        </Button>

        <h1 className="text-3xl font-bold tracking-tight">
          {isNewTest ? "Create New Test" : test?.title || "Test Details"}
        </h1>
      </div>

      {isNewTest ? (
        <NewTestForm onTestCreated={handleTestCreated} />
      ) : loading ? (
        <Card>
          <CardContent className="p-6 flex justify-center">
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading test details...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p className="mb-4">Error: {error}</p>
              <Button
                variant="outline"
                onClick={handleRetry}
                className="mr-2"
              >
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/tests")}
              >
                Return to Tests
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="papers">Test Papers</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <TestOverview test={test} onUpdate={handleUpdateTest} />
          </TabsContent>
          <TabsContent value="papers" className="mt-6">
            <TestPapers 
              testId={test.id} 
              papers={papers}
              isLoading={isLoadingPapers}
              subjectId={test.subject_id}
              onViewExtractedText={handleViewExtractedText}
              onPapersChange={handlePapersChange}
            />
          </TabsContent>
          <TabsContent value="results" className="mt-6">
            <TestResults 
              testId={test.id}
              test={test}
              testResults={testResults}
              subjectStudents={subjectStudents}
              isLoadingResults={isLoadingResults}
              isLoadingStudents={isLoadingStudents}
            />
          </TabsContent>
        </Tabs>
      )}
      
      <ExtractedTextViewer 
        isOpen={showExtractedText} 
        onOpenChange={setShowExtractedText} 
        paper={viewingPaper} 
      />
    </div>
  );
}
