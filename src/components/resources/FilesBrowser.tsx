import { useState, useEffect } from "react";
import { useTestPapers } from "@/hooks/use-test-papers";
import { useSubjects } from "@/hooks/subjects/use-subjects";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Eye, Download, Search, Loader2, FileSpreadsheet, AlignLeft, Upload, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TestPaper } from "@/types/test-papers";
import { FileUploader } from "./FileUploader";
import { ExtractedTextViewer } from "./ExtractedTextViewer";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "list" | "grid";

export function FilesBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [paperViewOpen, setPaperViewOpen] = useState(false);
  const [selectedPaperUrl, setSelectedPaperUrl] = useState("");
  const [paperType, setPaperType] = useState<"question" | "answer">("question");
  const [extractedTextOpen, setExtractedTextOpen] = useState(false);
  const [selectedPaperForText, setSelectedPaperForText] = useState<TestPaper | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAnswerKeyUploadOpen, setIsAnswerKeyUploadOpen] = useState(false);
  const [selectedQuestionPaper, setSelectedQuestionPaper] = useState<TestPaper | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [paperSetToDelete, setPaperSetToDelete] = useState<string>("");
  const [deleteRelatedPapers, setDeleteRelatedPapers] = useState(true);
  const [extractingPaperId, setExtractingPaperId] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [extractionPhase, setExtractionPhase] = useState<string>("");
  const [aiAnswerKeyOpen, setAiAnswerKeyOpen] = useState(false);
  const [selectedPaperForAiAnswer, setSelectedPaperForAiAnswer] = useState<TestPaper | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatingForPaperId, setGeneratingForPaperId] = useState<string | null>(null);

  const { subjects, isLoading: subjectsLoading } = useSubjects();
  
  const { usePapersBySubject, extractText, deletePaper, isDeleting } = useTestPapers();
  const { data: papers = [], isLoading: papersLoading, refetch } = usePapersBySubject(selectedSubject);

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  const sortedPapers = [...papers].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const groupedPapers = sortedPapers.reduce((acc, paper) => {
    const baseTitle = paper.title.replace(/\s-\s(Question Paper|Answer Key|Handwritten Notes)$/, "");
    
    if (!acc[baseTitle]) {
      acc[baseTitle] = [];
    }
    
    acc[baseTitle].push(paper);
    return acc;
  }, {} as Record<string, TestPaper[]>);

  const filteredGroups = Object.entries(groupedPapers)
    .filter(([title]) => title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort(([titleA], [titleB]) => titleA.localeCompare(titleB));

  const handleViewPaper = (paper: TestPaper) => {
    setSelectedPaperUrl(paper.file_url);
    setPaperType(paper.paper_type);
    setPaperViewOpen(true);
  };

  const handleViewExtractedText = (paper: TestPaper) => {
    setSelectedPaperForText(paper);
    setExtractedTextOpen(true);
  };

  const handleDownloadPaper = (paper: TestPaper) => {
    window.open(paper.file_url, "_blank");
  };

  const handleExtractText = async (paper: TestPaper) => {
    if (paper.has_extracted_text) {
      toast.info("Text has already been extracted from this document");
      handleViewExtractedText(paper);
      return;
    }
    
    try {
      toast.info(`Starting text extraction for ${paper.title}...`);
      
      setExtractingPaperId(paper.id);
      setExtractionProgress(10);
      setExtractionPhase("Converting PDF to images");
      
      const conversionTimer = setInterval(() => {
        setExtractionProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 40) {
            clearInterval(conversionTimer);
            setExtractionPhase("Creating ZIP archive");
            return 40;
          }
          return newProgress;
        });
      }, 300);
      
      setTimeout(() => {
        setExtractionProgress(50);
        setExtractionPhase("Processing OCR...");
        
        const ocrTimer = setInterval(() => {
          setExtractionProgress(prev => {
            const newProgress = prev + 3;
            if (newProgress >= 90) {
              clearInterval(ocrTimer);
              return 90;
            }
            return newProgress;
          });
        }, 400);
        
        extractText(paper.id, {
          onSuccess: () => {
            setExtractionProgress(100);
            setExtractionPhase("Extraction complete");
            
            // Reset local state immediately after successful extraction
            setExtractingPaperId(null);
            setExtractionProgress(0);
            setExtractionPhase("");
            
            toast.success(`Successfully extracted text from ${paper.title}`);
            refetch();
          },
          onError: (error: Error) => {
            console.error("Text extraction error:", error);
            setExtractingPaperId(null);
            setExtractionProgress(0);
            setExtractionPhase("");
            toast.error(`Failed to extract text: ${error.message || "Unknown error"}`);
          }
        });
      }, 1500);
      
    } catch (error) {
      console.error("Text extraction error:", error);
      setExtractingPaperId(null);
      setExtractionProgress(0);
      setExtractionPhase("");
      toast.error(`Failed to extract text: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleAddAnswerKey = (questionPaper: TestPaper) => {
    setSelectedQuestionPaper(questionPaper);
    setIsAnswerKeyUploadOpen(true);
  };

  const handleConfirmDelete = (baseTitle: string) => {
    setPaperSetToDelete(baseTitle);
    setConfirmDeleteOpen(true);
  };

  const handleDeletePaperSet = async () => {
    if (!paperSetToDelete) return;
    
    try {
      const paperGroup = groupedPapers[paperSetToDelete];
      if (!paperGroup || paperGroup.length === 0) {
        toast.error("No papers found to delete");
        return;
      }
      
      await deletePaper({ 
        paperId: paperGroup[0].id, 
        deleteRelated: deleteRelatedPapers 
      });
      
      toast.success(`Successfully deleted paper ${deleteRelatedPapers ? 'set' : ''}`);
      refetch();
      setConfirmDeleteOpen(false);
      setPaperSetToDelete("");
    } catch (error) {
      console.error("Error deleting papers:", error);
      toast.error(`Failed to delete paper: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleGenerateAIAnswerKey = async (questionPaper: TestPaper) => {
    setIsGeneratingAI(true);
    setGeneratingForPaperId(questionPaper.id);
    try {
      // Get the current session JWT
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const url = 'https://mfnhgldghrnjrwlhtvor.supabase.co/functions/v1/generate-answer-key';
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ paperId: questionPaper.id })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to generate answer key");
      }
      toast.success("AI Answer Key generated!");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate answer key");
    } finally {
      setIsGeneratingAI(false);
      setGeneratingForPaperId(null);
    }
  };

  const renderListView = () => (
    <div className="border rounded-md">
      <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50 font-medium">
        <div className="col-span-5">Title</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Upload Date</div>
        <div className="col-span-3 text-right">Actions</div>
      </div>
      <div className="divide-y">
        {filteredGroups.map(([title, groupPapers]) => {
          const questionPaper = groupPapers.find(p => p.paper_type === "question");
          const answerKeyPaper = groupPapers.find(p => p.paper_type === "answer");
          const aiAnswerKey = (answerKeyPaper?.generated_answer_key || questionPaper?.generated_answer_key) || null;

          return (
            <div key={title} className="border rounded-md mb-6">
              {/* Question Paper Section */}
              <div className="p-4 border-b bg-muted/50 font-medium">Question Paper</div>
              {questionPaper && (
                <div className="grid grid-cols-12 gap-4 p-4 items-center">
                  <div className="col-span-5 truncate">{questionPaper.title}</div>
                  <div className="col-span-2">{questionPaper.paper_type}</div>
                  <div className="col-span-2">{new Date(questionPaper.created_at).toLocaleDateString()}</div>
                  <div className="col-span-3 flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleViewPaper(questionPaper)} title="View Document">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadPaper(questionPaper)} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                    {questionPaper.has_extracted_text ? (
                      <Button variant="ghost" size="icon" onClick={() => handleViewExtractedText(questionPaper)} title="View Extracted Text">
                        <AlignLeft className="h-4 w-4 text-green-500" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => handleExtractText(questionPaper)} disabled={extractingPaperId === questionPaper.id} title="Extract Text">
                        <FileSpreadsheet className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Answer Key Section (manual and AI grouped together) */}
              <div className="p-4 border-b bg-muted/50 font-medium">Answer Key</div>
              <div className="p-4 flex flex-col gap-4">
                {/* Manual Answer Key */}
                {answerKeyPaper && (
                  <div className="border rounded p-3 bg-muted/10">
                    <div className="font-semibold mb-2">Manual Answer Key</div>
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewPaper(answerKeyPaper)}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadPaper(answerKeyPaper)}>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </div>
                    {answerKeyPaper.has_extracted_text && (
                      <Button variant="outline" size="sm" onClick={() => handleViewExtractedText(answerKeyPaper)}>
                        <AlignLeft className="mr-2 h-4 w-4 text-green-500" /> View Extracted Text
                      </Button>
                    )}
                  </div>
                )}
                {/* AI Generated Answer Key (always under Answer Key section) */}
                {aiAnswerKey && (
                  <div className="border rounded p-3 bg-muted/10">
                    <div className="font-semibold mb-2">AI Generated Answer Key</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPaperForAiAnswer(answerKeyPaper || questionPaper);
                        setAiAnswerKeyOpen(true);
                      }}
                    >
                      View AI Generated Answer Key
                    </Button>
                  </div>
                )}
                {/* Action Buttons */}
                <div className="flex flex-row gap-4">
                  {questionPaper && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!answerKeyPaper}
                      onClick={() => handleAddAnswerKey(questionPaper)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Upload Answer Key
                    </Button>
                  )}
                  {questionPaper && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isGeneratingAI && generatingForPaperId === questionPaper.id || !!aiAnswerKey}
                      onClick={() => handleGenerateAIAnswerKey(questionPaper)}
                    >
                      {isGeneratingAI && generatingForPaperId === questionPaper.id
                        ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>)
                        : (<>Generate Answer Key using AI</>)}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {filteredGroups.map(([title, groupPapers]) => {
        const hasQuestionPaper = groupPapers.some(p => p.paper_type === "question");
        const hasAnswerKey = groupPapers.some(p => p.paper_type === "answer");
        const questionPaper = groupPapers.find(p => p.paper_type === "question");
        
        return (
          <Card key={title} className="overflow-hidden border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                  onClick={() => handleConfirmDelete(title)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {subjects.find(s => s.id === selectedSubject)?.name || ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col gap-6">
                {groupPapers.map((paper) => {
                  const paperType = paper.title.includes("Question Paper") 
                    ? "Question Paper" 
                    : paper.title.includes("Answer Key") 
                      ? "Answer Key" 
                      : "Handwritten Notes";
                  
                  return (
                    <div key={paper.id} className="space-y-4">
                      <div className="flex items-center">
                        <FileText className={`mr-2 h-5 w-5 flex-shrink-0 ${paper.paper_type === "answer" ? "text-amber-500" : ""}`} />
                        <span className="text-base font-medium">{paperType}</span>
                        {paper.has_extracted_text && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                            Text Extracted
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleViewPaper(paper)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => handleDownloadPaper(paper)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          {paper.generated_answer_key && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-2"
                              onClick={() => {
                                setSelectedPaperForAiAnswer(paper);
                                setAiAnswerKeyOpen(true);
                              }}
                            >
                              View AI Answer Key
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {renderExtractionButton(paper)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {hasQuestionPaper && !hasAnswerKey && questionPaper && (
                  <div className="mt-2 border-t border-dashed pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
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
  );

  const renderExtractionButton = (paper: TestPaper) => {
    const isCurrentlyExtracting = extractingPaperId === paper.id;
    
    if (paper.has_extracted_text) {
      return (
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 justify-start"
          onClick={() => handleViewExtractedText(paper)}
        >
          <AlignLeft className="mr-2 h-4 w-4 text-green-500" />
          View Extracted Text
        </Button>
      );
    }
    
    if (isCurrentlyExtracting) {
      return (
        <div className="space-y-2 w-full">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{extractionPhase}</span>
            <span>{extractionProgress}%</span>
          </div>
          <Progress value={extractionProgress} className="h-9" />
        </div>
      );
    }
    
    return (
      <Button 
        variant="outline" 
        size="sm"
        className="flex-1 justify-start"
        onClick={() => handleExtractText(paper)}
        disabled={!!extractingPaperId}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Extract Text
      </Button>
    );
  };

  const AnswerKeyUploader = ({
    isOpen,
    onOpenChange,
    questionPaper,
    subjectId,
    refetch
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    questionPaper: TestPaper | null;
    subjectId: string;
    refetch: () => void;
  }) => {
    const [file, setFile] = useState<File | null>(null);
    const { uploadPaper, isUploading, extractText } = useTestPapers();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedAnswerKey, setGeneratedAnswerKey] = useState<string | null>(null);
    const [showGeneratedDialog, setShowGeneratedDialog] = useState(false);
    const [questionPaperText, setQuestionPaperText] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    // Fetch extracted text if available
    useEffect(() => {
      if (questionPaper && questionPaper.has_extracted_text && questionPaper.extracted_text) {
        setQuestionPaperText(questionPaper.extracted_text);
      } else {
        setQuestionPaperText(null);
      }
    }, [questionPaper]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setFile(e.target.files[0]);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file || !questionPaper) {
        toast.error("Please select a file to upload");
        return;
      }
      try {
        const baseTitle = questionPaper.title.replace(" - Question Paper", "");
        await uploadPaper({
          title: `${baseTitle} - Answer Key`,
          file,
          paper_type: "answer",
          subject_id: subjectId
        });
        onOpenChange(false);
        toast.success("Answer key uploaded successfully");
        refetch();
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };

    // Generate answer key from extracted question paper text
    const handleGenerateAnswerKey = async () => {
      if (!questionPaper) return;
      setIsGenerating(true);
      setGeneratedAnswerKey(null);
      try {
        let text = questionPaperText;
        // If no extracted text, extract first
        if (!text) {
          setIsExtracting(true);
          // We need to wait for the extraction to complete and then fetch the updated paper
          extractText(questionPaper.id, {
            onSuccess: async () => {
              // Fetch the updated paper to get the extracted text
              const { data: updatedPaper } = await supabase
                .from('test_papers')
                .select('extracted_text')
                .eq('id', questionPaper.id)
                .single();
              
              if (updatedPaper?.extracted_text) {
                text = updatedPaper.extracted_text;
                setQuestionPaperText(text);
                refetch();
              }
              setIsExtracting(false);
            },
            onError: (error: Error) => {
              console.error("Error extracting text:", error);
              setIsExtracting(false);
            }
          });
          
          // Wait a bit for the extraction to start
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to get the extracted text
          const { data: updatedPaper } = await supabase
            .from('test_papers')
            .select('extracted_text')
            .eq('id', questionPaper.id)
            .single();
          
          if (updatedPaper?.extracted_text) {
            text = updatedPaper.extracted_text;
            setQuestionPaperText(text);
          }
        }
        if (!text) {
          toast.error("Failed to extract text from question paper.");
          setIsGenerating(false);
          return;
        }
        // Get the current session JWT
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const url = 'https://mfnhgldghrnjrwlhtvor.supabase.co/functions/v1/generate-answer-key';
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({ paperId: questionPaper.id })
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to generate answer key");
        }
        setGeneratedAnswerKey(data.answerKey);
        setShowGeneratedDialog(true);
        refetch();
      } catch (err: any) {
        toast.error(err.message || "Failed to generate answer key");
      } finally {
        setIsGenerating(false);
      }
    };

    // Show stored answer key if it exists
    useEffect(() => {
      if (questionPaper && questionPaper.generated_answer_key) {
        setGeneratedAnswerKey(questionPaper.generated_answer_key);
      }
    }, [questionPaper]);

    return (
      <>
        <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            if (!open) setFile(null);
            onOpenChange(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Answer Key</DialogTitle>
              <DialogDescription>
                Upload an answer key for "{questionPaper?.title}".
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="answerKeyFile">Select Answer Key File</Label>
                <Input
                  id="answerKeyFile"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  required
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected file: {file.name}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={isUploading || !file}
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
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isGenerating || isUploading || !questionPaper || (!questionPaper.has_extracted_text && !questionPaperText)}
                  onClick={handleGenerateAnswerKey}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Answer Key...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Generate Answer Key using AI
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        {/* Generated Answer Key Dialog */}
        <Dialog open={showGeneratedDialog} onOpenChange={setShowGeneratedDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generated Answer Key</DialogTitle>
            </DialogHeader>
            <div className="p-2 border rounded bg-muted/20 whitespace-pre-wrap text-sm font-mono max-h-[60vh] overflow-auto">
              {generatedAnswerKey || "No answer key generated."}
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (generatedAnswerKey) {
                    navigator.clipboard.writeText(generatedAnswerKey);
                    toast.success("Copied to clipboard");
                  }
                }}
              >
                Copy to Clipboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-1 items-center relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={selectedSubject}
            onValueChange={setSelectedSubject}
            disabled={subjectsLoading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
          >
            {viewMode === "list" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect width="6" height="6" x="3" y="3" rx="1" />
                <rect width="6" height="6" x="15" y="3" rx="1" />
                <rect width="6" height="6" x="3" y="15" rx="1" />
                <rect width="6" height="6" x="15" y="15" rx="1" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="21" x2="3" y1="6" y2="6" />
                <line x1="21" x2="3" y1="12" y2="12" />
                <line x1="21" x2="3" y1="18" y2="18" />
              </svg>
            )}
          </Button>
          
          <Button onClick={() => setIsUploadOpen(true)}>
            Upload
          </Button>
        </div>
      </div>
      
      {papersLoading ? (
        <div className="flex justify-center items-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card className="border border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No Files Found</CardTitle>
            <CardDescription>
              {selectedSubject ? (
                searchQuery ? "No matching files found. Try a different search term." : "No files have been uploaded for this subject yet."
              ) : "Please select a subject to view files."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Button onClick={() => setIsUploadOpen(true)}>
              Upload Files
            </Button>
          </CardContent>
        </Card>
      ) : (
        viewMode === "list" ? renderListView() : renderGridView()
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
        subjectId={selectedSubject}
        onSuccess={() => refetch()}
      />
      
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Paper Set</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this paper set?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                This action cannot be undone. The paper{deleteRelatedPapers ? ' set' : ''} will be permanently deleted.
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="deleteRelated"
                checked={deleteRelatedPapers}
                onCheckedChange={(checked) => setDeleteRelatedPapers(checked as boolean)}
              />
              <Label htmlFor="deleteRelated">
                Delete all papers in this set (question paper and answer key)
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePaperSet}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AnswerKeyUploader
        isOpen={isAnswerKeyUploadOpen}
        onOpenChange={setIsAnswerKeyUploadOpen}
        questionPaper={selectedQuestionPaper}
        subjectId={selectedSubject}
        refetch={refetch}
      />
      
      <Dialog open={aiAnswerKeyOpen} onOpenChange={setAiAnswerKeyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Generated Answer Key</DialogTitle>
          </DialogHeader>
          <div className="p-2 border rounded bg-muted/20 whitespace-pre-wrap text-sm font-mono max-h-[60vh] overflow-auto">
            {selectedPaperForAiAnswer?.generated_answer_key || "No answer key generated."}
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedPaperForAiAnswer?.generated_answer_key) {
                  navigator.clipboard.writeText(selectedPaperForAiAnswer.generated_answer_key);
                  toast.success("Copied to clipboard");
                }
              }}
            >
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}