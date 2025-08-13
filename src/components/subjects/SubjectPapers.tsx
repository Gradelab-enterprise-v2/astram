
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTestPapers } from "@/hooks/use-test-papers";
import type { TestPaper } from "@/types/test-papers";
import { FileText, Eye, Download, Upload, Loader2, FileSearch, AlignLeft, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { FileUploader } from "@/components/resources/FileUploader";
import { Progress } from "@/components/ui/progress";
import { ExtractedTextViewer } from "@/components/resources/ExtractedTextViewer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SubjectPapersProps {
  subjectId: string;
}

export const SubjectPapers: React.FC<SubjectPapersProps> = ({ subjectId }) => {
  const { usePapersBySubject, extractText, uploadPaper, isUploading } = useTestPapers();
  const { data: papers = [], isLoading, refetch } = usePapersBySubject(subjectId);

  const [paperViewOpen, setPaperViewOpen] = useState(false);
  const [selectedPaperUrl, setSelectedPaperUrl] = useState("");
  const [paperType, setPaperType] = useState<"question" | "answer">("question");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [processingPaperId, setProcessingPaperId] = useState<string | null>(null);
  const [extractProgressPercent, setExtractProgressPercent] = useState(0);
  const [extractedTextOpen, setExtractedTextOpen] = useState(false);
  const [selectedPaperForText, setSelectedPaperForText] = useState<TestPaper | null>(null);
  const [isAnswerKeyUploadOpen, setIsAnswerKeyUploadOpen] = useState(false);
  const [selectedQuestionPaper, setSelectedQuestionPaper] = useState<TestPaper | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);

  const groupedPapers = React.useMemo(() => {
    const groups: Record<string, TestPaper[]> = {};
    
    papers.forEach(paper => {
      const baseTitle = paper.title.replace(/\s-\s(Question Paper|Answer Key|Handwritten Notes)$/, "");
      
      if (!groups[baseTitle]) {
        groups[baseTitle] = [];
      }
      
      groups[baseTitle].push(paper);
    });
    
    return Object.entries(groups).map(([title, papers]) => ({
      title,
      papers: papers.sort((a, b) => a.paper_type === "question" ? -1 : 1)
    }));
  }, [papers]);

  const handleViewPaper = (paper: TestPaper) => {
    setSelectedPaperUrl(paper.file_url);
    setPaperType(paper.paper_type);
    setPaperViewOpen(true);
  };

  const handleViewExtractedText = (paper: TestPaper) => {
    setSelectedPaperForText(paper);
    setExtractedTextOpen(true);
  };

  const handleExtractText = async (paper: TestPaper) => {
    if (paper.has_extracted_text) {
      const confirmExtract = window.confirm("This paper already has extracted text. Do you want to extract it again?");
      if (!confirmExtract) return;
    }
    
    setProcessingPaperId(paper.id);
    setExtractProgressPercent(10); // Start progress
    
    const progressInterval = setInterval(() => {
      setExtractProgressPercent(prev => {
        if (prev < 90) {
          return prev + Math.random() * 5;
        }
        return prev;
      });
    }, 1500);
    
    try {
      extractText(paper.id, {
        onSuccess: () => {
          clearInterval(progressInterval);
          setExtractProgressPercent(100);
          toast.success("Text extracted successfully");
          
          // Reset local state immediately after successful extraction
          setProcessingPaperId(null);
          setExtractProgressPercent(0);
          
          refetch();
        },
        onError: (error: Error) => {
          clearInterval(progressInterval);
          console.error("Error extracting text:", error);
          toast.error(`Failed to extract text: ${error.message || 'Unknown error'}`);
          setProcessingPaperId(null);
          setExtractProgressPercent(0);
        }
      });
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error extracting text:", error);
      toast.error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProcessingPaperId(null);
      setExtractProgressPercent(0);
    }
  };
  
  const handleAddAnswerKey = (questionPaper: TestPaper) => {
    setSelectedQuestionPaper(questionPaper);
    setIsAnswerKeyUploadOpen(true);
  };
  
  const handleAnswerKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAnswerKeyFile(e.target.files[0]);
    }
  };
  
  const handleUploadAnswerKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!answerKeyFile || !selectedQuestionPaper) {
      toast.error("Please select a file to upload");
      return;
    }
    
    try {
      // Get the base title from the question paper
      const baseTitle = selectedQuestionPaper.title.replace(" - Question Paper", "");
      
      await uploadPaper({
        title: `${baseTitle} - Answer Key`,
        file: answerKeyFile,
        paper_type: "answer",
        subject_id: subjectId
      });
      
      setIsAnswerKeyUploadOpen(false);
      setAnswerKeyFile(null);
      setSelectedQuestionPaper(null);
      
      toast.success("Answer key uploaded successfully");
      refetch();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Papers
        </Button>
      </div>

      {papers.length === 0 ? (
        <Card className="border border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No Papers Available</CardTitle>
            <CardDescription>
              No papers have been uploaded for this subject yet
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Papers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groupedPapers.map((group) => {
            const hasQuestionPaper = group.papers.some(p => p.paper_type === "question");
            const hasAnswerKey = group.papers.some(p => p.paper_type === "answer");
            const questionPaper = group.papers.find(p => p.paper_type === "question");
            
            return (
              <Card key={group.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{group.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {group.papers.map((paper) => {
                      const paperType = paper.title.includes("Question Paper") 
                        ? "Question Paper" 
                        : paper.title.includes("Answer Key") 
                          ? "Answer Key" 
                          : "Handwritten Notes";
                      
                      const isProcessing = processingPaperId === paper.id;

                      return (
                        <div key={paper.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm">
                              <FileText className={`mr-2 h-4 w-4 ${paper.paper_type === "answer" ? "text-amber-500" : ""}`} />
                              {paperType}
                              {paper.has_extracted_text && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                  Text Extracted
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleViewPaper(paper)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(paper.file_url, "_blank")}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                              {paper.has_extracted_text ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewExtractedText(paper)}
                                >
                                  <AlignLeft className="mr-2 h-4 w-4" />
                                  View Text
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleExtractText(paper)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileSearch className="mr-2 h-4 w-4" />
                                  )}
                                  Extract Text
                                </Button>
                              )}
                            </div>
                          </div>
                          {isProcessing && (
                            <div className="w-full">
                              <Progress value={extractProgressPercent} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                Processing: {Math.round(extractProgressPercent)}%
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Add answer key option if missing */}
                    {hasQuestionPaper && !hasAnswerKey && questionPaper && (
                      <div className="pt-2 border-t border-dashed">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => handleAddAnswerKey(questionPaper)}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Answer Key
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={paperViewOpen} onOpenChange={setPaperViewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <ScrollArea className="h-full">
            <DialogHeader>
              <DialogTitle>
                {paperType === "question" ? "Question Paper" : "Answer Key"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-4">
              {selectedPaperUrl && (
                <iframe 
                  src={selectedPaperUrl} 
                  className="w-full h-[60vh] border rounded"
                  title={paperType === "question" ? "Question Paper" : "Answer Key"}
                />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ExtractedTextViewer
        isOpen={extractedTextOpen}
        onOpenChange={setExtractedTextOpen}
        paper={selectedPaperForText}
      />

      <FileUploader 
        isOpen={isUploadOpen} 
        onOpenChange={setIsUploadOpen}
        subjectId={subjectId}
        onSuccess={() => refetch()}
      />
      
      {/* Dialog for uploading an answer key for an existing question paper */}
      <Dialog 
        open={isAnswerKeyUploadOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setAnswerKeyFile(null);
            setSelectedQuestionPaper(null);
          }
          setIsAnswerKeyUploadOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Answer Key</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadAnswerKey} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="answerKeyFile">Select Answer Key File</Label>
              <Input
                id="answerKeyFile"
                type="file"
                onChange={handleAnswerKeyFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                required
              />
              {answerKeyFile && (
                <p className="text-sm text-muted-foreground">
                  Selected file: {answerKeyFile.name}
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAnswerKeyUploadOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !answerKeyFile}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Answer Key
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
