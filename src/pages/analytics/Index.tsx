import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Upload, History, Link, FileText, Plus, ExternalLink, Eye, Download, AlignLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { SubjectSelect } from "@/components/ui/SubjectSelect";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { PaperSelector } from "@/components/resources/PaperSelector";
import { useTestPapers, TestPaper } from "@/hooks/use-test-papers";
import { FileUploader } from "@/components/resources/FileUploader";
import { DocumentViewer } from "@/components/resources/DocumentViewer";
import { Badge } from "@/components/ui/badge";

export default function Analytics() {
  const navigate = useNavigate();
  const { user, isSupabaseReady } = useAuth();
  const [activeTab, setActiveTab] = useState<"select" | "text">("select");
  const [topicName, setTopicName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaperSelectorOpen, setIsPaperSelectorOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<TestPaper | null>(null);
  const [isFileUploaderOpen, setIsFileUploaderOpen] = useState(false);
  const [uploadedPaper, setUploadedPaper] = useState<TestPaper | null>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  
  const { 
    usePapersBySubject, 
    uploadPaper, 
    isUploading, 
    extractText 
  } = useTestPapers();
  
  const { data: subjectPapers = [] } = usePapersBySubject(selectedSubject);
  
  useEffect(() => {
    setFile(null);
    setSelectedPaper(null);
    setUploadedPaper(null);
  }, [activeTab]);
  
  useEffect(() => {
    setSelectedPaper(null);
  }, [selectedSubject]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      if (
        fileType === "application/pdf" ||
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        setFile(selectedFile);
      } else {
        toast.error("Please upload a PDF or DOCX file");
        e.target.value = "";
      }
    }
  };
  
  const handleSelectPaper = (paperId: string) => {
    const paper = subjectPapers.find(p => p.id === paperId);
    if (paper) {
      setSelectedPaper(paper);
      setIsPaperSelectorOpen(false);
    }
  };

  const handleUploadSuccess = (paper: TestPaper) => {
    setUploadedPaper(paper);
    setIsFileUploaderOpen(false);
    toast.success("Paper uploaded to resources");
  };

  const handleDirectUpload = async () => {
    if (!file || !selectedSubject) {
      toast.error("Please select a file and subject first");
      return;
    }

    try {
      const paperData = {
        title: `${topicName} - Question Paper`,
        file: file,
        paper_type: "question" as const,
        subject_id: selectedSubject
      };

      uploadPaper(paperData, {
        onSuccess: (result: TestPaper) => {
          setUploadedPaper(result);
          toast.success("Question paper uploaded to resources");
        },
        onError: (error: Error) => {
          console.error("Error uploading paper:", error);
          toast.error(`Error uploading paper: ${error.message}`);
        }
      });
    } catch (error) {
      console.error("Error during direct upload:", error);
      toast.error(`Error during upload: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleViewDocument = () => {
    if (selectedPaper || uploadedPaper) {
      setIsDocumentViewerOpen(true);
    }
  };
  
  const handleExtractText = async () => {
    const paper = selectedPaper || uploadedPaper;
    if (!paper) return;
    
    try {
      setIsExtracting(true);
      setExtractionProgress(10);
      
      // Simulate progress
      const simulateProgress = () => {
        setExtractionProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 10);
          return newProgress > 90 ? 90 : newProgress;
        });
      };
      
      const progressInterval = setInterval(simulateProgress, 500);
      
      await extractText(paper.id);
      
      clearInterval(progressInterval);
      setExtractionProgress(100);
      
      // Refetch the paper to get updated extracted text
      const refreshedPaper = subjectPapers.find(p => p.id === paper.id);
      if (refreshedPaper) {
        if (selectedPaper) {
          setSelectedPaper(refreshedPaper);
        } else {
          setUploadedPaper(refreshedPaper);
        }
      }
      
      toast.success("Text extracted successfully");
    } catch (error) {
      console.error("Text extraction error:", error);
      toast.error(`Failed to extract text: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadPaper = (paper: TestPaper) => {
    window.open(paper.file_url, "_blank");
  };

  const handleAnalyze = async () => {
    if (!user) {
      toast.error("You need to be logged in to analyze papers");
      return;
    }

    if (!topicName) {
      toast.error("Please enter a topic name");
      return;
    }

    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }

    if (activeTab === "select" && !selectedPaper && !uploadedPaper) {
      toast.error("Please select or upload a paper");
      return;
    }
    
    if (activeTab === "text" && !textContent) {
      toast.error("Please enter text content");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      let fileUrl = null;
      let textToAnalyze = null;
      
      if (activeTab === "select") {
        if (selectedPaper) {
          fileUrl = selectedPaper.file_url;
          textToAnalyze = selectedPaper.extracted_text;
        } else if (uploadedPaper) {
          fileUrl = uploadedPaper.file_url;
          textToAnalyze = uploadedPaper.extracted_text;
        }
      } else {
        textToAnalyze = textContent;
      }
      
      if (!textToAnalyze) {
        throw new Error("No extracted text provided");
      }
      
      const { data: analysisData, error: insertError } = await supabase
        .from('analysis_history')
        .insert({
          title: topicName,
          subject_id: selectedSubject,
          file_url: fileUrl,
          text_content: textToAnalyze,
          user_id: user.id,
          status: 'processing',
          has_extracted_text: true
        })
        .select()
        .single();
      
      if (insertError) {
        throw new Error(`Error inserting analysis record: ${insertError.message}`);
      }
      
      // Call the analyze-paper function
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke(
        'analyze-paper',
        {
          body: {
            analysisId: analysisData.id,
            paperText: textToAnalyze,
            courseOutcomes: [], // You'll need to pass the actual course outcomes here
            title: topicName
          }
        }
      );

      if (analysisError) {
        throw new Error(`Analysis failed: ${analysisError.message}`);
      }

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || "Unknown error during analysis");
      }

      // Update the analysis record with the results
      await supabase
        .from('analysis_history')
        .update({
          status: 'completed',
          bloomsdata: analysisResult.analysis
        })
        .eq('id', analysisData.id);
      
      setIsAnalyzing(false);
      toast.success("Analysis completed successfully");
      navigate(`/analytics/report/${analysisData.id}`);
    } catch (error) {
      console.error("Error during analysis:", error);
      toast.error(`Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsAnalyzing(false);
    }
  };

  const getActiveDocument = () => {
    return selectedPaper || uploadedPaper;
  };

  const renderPaperCard = (paper: TestPaper) => {
    return (
      <Card className="bg-black text-white border-gray-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold">{paper.title.split(' - ')[0]}</h3>
              <p className="text-gray-400">{subjectPapers.find(p => p.id === paper.id)?.subject_id}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-950"
              onClick={() => {
                if (selectedPaper) setSelectedPaper(null);
                else setUploadedPaper(null);
              }}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span className="font-medium">{paper.title.includes("Question") ? "Question Paper" : "Answer Key"}</span>
            {paper.has_extracted_text && (
              <Badge className="bg-green-600 hover:bg-green-700 ml-auto">
                Text Extracted
              </Badge>
            )}
          </div>

          <div className="grid gap-2">
            <Button 
              variant="outline" 
              className="w-full justify-start border-gray-700 hover:bg-gray-800"
              onClick={() => window.open(paper.file_url, "_blank")}
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start border-gray-700 hover:bg-gray-800"
              onClick={() => handleDownloadPaper(paper)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            
            {paper.has_extracted_text ? (
              <Button 
                variant="outline" 
                className="w-full justify-start border-gray-700 hover:bg-gray-800"
                onClick={handleViewDocument}
              >
                <AlignLeft className="mr-2 h-4 w-4 text-green-500" />
                View Extracted Text
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="w-full justify-start border-gray-700 hover:bg-gray-800"
                onClick={handleExtractText}
                disabled={isExtracting}
              >
                <AlignLeft className="mr-2 h-4 w-4" />
                Extract Text
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 animate-page-transition-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Question Paper Analysis</h1>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => navigate("/analytics/history")}
        >
          <History className="h-4 w-4" />
          View History
        </Button>
      </div>
      
      {!isSupabaseReady && (
        <Card className="border border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 text-amber-500">⚠️</span>
              Supabase Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>To enable full functionality, you need to configure your Supabase environment variables.</p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Analysis Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="topic-name">Topic Name</Label>
            <Input 
              id="topic-name"
              placeholder="Enter topic name"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <SubjectSelect
              value={selectedSubject}
              onChange={(value) => setSelectedSubject(value)}
              includeNone={false}
            />
          </div>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "select" | "text")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">Select Paper</TabsTrigger>
              <TabsTrigger value="text">Enter Text</TabsTrigger>
            </TabsList>
            
            <TabsContent value="select" className="mt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-start gap-2">
                    <Link className="h-5 w-5 mt-0.5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold">Select Question Paper</h3>
                      <p className="text-sm text-muted-foreground">Choose a paper from your resources</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" 
                      onClick={() => {
                        if (!selectedSubject) {
                          toast.error("Please select a subject first");
                          return;
                        }
                        setIsPaperSelectorOpen(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Select Paper
                    </Button>
                    <Button
                      variant="default" 
                      onClick={() => {
                        if (!selectedSubject) {
                          toast.error("Please select a subject first");
                          return;
                        }
                        setIsFileUploaderOpen(true);
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Paper
                    </Button>
                  </div>
                </div>
                
                {selectedPaper || uploadedPaper ? (
                  renderPaperCard(selectedPaper || uploadedPaper)
                ) : (
                  <div className="text-center p-8 border border-dashed rounded-lg">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <h3 className="text-lg font-medium mb-1">No Paper Selected</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please select an existing paper or upload a new one
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="text" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="text-content">Question Paper Text</Label>
                <Textarea
                  id="text-content"
                  placeholder="Paste your question paper text here..."
                  className="min-h-[200px]"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <Button 
            className="w-full bg-blue-500 hover:bg-blue-600" 
            size="lg"
            onClick={handleAnalyze}
            disabled={isAnalyzing || isUploading}
          >
            {isAnalyzing || isUploading ? "Processing..." : "Analyze Paper"}
          </Button>
        </CardContent>
      </Card>
      
      <PaperSelector 
        isOpen={isPaperSelectorOpen}
        onOpenChange={setIsPaperSelectorOpen}
        subjectId={selectedSubject}
        testId=""
        onSelectPaper={handleSelectPaper}
        paperTypeFilter="question"
      />
      
      <FileUploader
        isOpen={isFileUploaderOpen}
        onOpenChange={setIsFileUploaderOpen}
        subjectId={selectedSubject}
        onSuccess={handleUploadSuccess}
      />

      {getActiveDocument() && (
        <DocumentViewer
          isOpen={isDocumentViewerOpen}
          onOpenChange={setIsDocumentViewerOpen}
          fileUrl={getActiveDocument()?.file_url || ""}
          title={getActiveDocument()?.title || topicName}
          extractedText={getActiveDocument()?.extracted_text || ""}
          documentId={getActiveDocument()?.id || ""}
          isLoading={isExtracting}
          showExtractButton={!getActiveDocument()?.has_extracted_text}
          onExtractText={handleExtractText}
          extractionProgress={extractionProgress}
        />
      )}
    </div>
  );
}
