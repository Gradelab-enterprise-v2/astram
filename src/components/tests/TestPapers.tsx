import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileIcon, Loader2, FileCheck, ExternalLink, PlusCircle, Download, Trash2, FileText } from "lucide-react";
import { TestPaper } from "@/types/test-papers";
import { PaperSelector } from "./PaperSelector";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { useTestPapers } from "@/hooks/use-test-papers";

interface TestPapersProps {
  testId: string;
  papers: TestPaper[];
  subjectId: string;
  isLoading: boolean;
  onViewExtractedText: (paper: TestPaper) => void;
  onPapersChange: () => void;
}

export function TestPapers({ 
  testId, 
  papers, 
  subjectId,
  isLoading, 
  onViewExtractedText,
  onPapersChange
}: TestPapersProps) {
  const [isAddingPaper, setIsAddingPaper] = useState(false);
  const [unlinkingPaperId, setUnlinkingPaperId] = useState<string | null>(null);
  const [startingExtraction, setStartingExtraction] = useState<string | null>(null);
  
  const { 
    extractText, 
    unlinkPaper, 
    linkPaperToTest,
    isExtracting, 
    isUnlinking 
  } = useTestPapers();

  const questionPapers = papers.filter(p => p.paper_type === "question");
  const answerPapers = papers.filter(p => p.paper_type === "answer");

  const handlePaperSelected = async (paperId: string) => {
    try {
      linkPaperToTest({ paperId, testId }, {
        onSuccess: () => {
          setIsAddingPaper(false);
          // Notify parent for data refresh
          onPapersChange();
          toast.success("Paper linked successfully");
        },
        onError: (error) => {
          console.error("Error linking paper:", error);
          toast.error("Failed to link paper");
        }
      });
    } catch (error) {
      console.error("Error linking paper:", error);
      toast.error("Failed to link paper");
    }
  };

  const handleUnlinkPaper = async (paperId: string) => {
    try {
      setUnlinkingPaperId(paperId);
      unlinkPaper({
        paperId,
        testId
      }, {
        onSuccess: () => {
          // Notify parent for data refresh
          onPapersChange();
          setUnlinkingPaperId(null);
          toast.success("Paper unlinked successfully");
        },
        onError: (error) => {
          console.error("Error unlinking paper:", error);
          toast.error("Failed to unlink paper");
          setUnlinkingPaperId(null);
        }
      });
    } catch (error) {
      console.error("Error unlinking paper:", error);
      toast.error("Failed to unlink paper");
      setUnlinkingPaperId(null);
    }
  };

  const handleExtractText = async (paperId: string) => {
    try {
      setStartingExtraction(paperId);
      extractText(paperId, {
        onSuccess: () => {
          // Notify parent for data refresh
          onPapersChange();
          setStartingExtraction(null);
          toast.success("Text extracted successfully");
        },
        onError: (error) => {
          console.error("Error extracting text:", error);
          toast.error("Failed to extract text");
          setStartingExtraction(null);
        }
      });
    } catch (error) {
      console.error("Error extracting text:", error);
      toast.error("Failed to extract text");
      setStartingExtraction(null);
    }
  };

  const renderPaperList = (papers: TestPaper[], title: string) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{title}</h3>
      </div>
      
      {papers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {papers.map((paper) => (
            <Card key={paper.id}>
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">{paper.title}</CardTitle>
                  <Badge variant={paper.paper_type === "question" ? "default" : "secondary"}>
                    {paper.paper_type === "question" ? "Question Paper" : "Answer Key"}
                  </Badge>
                </div>
                <FileIcon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex flex-col gap-3 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(paper.file_url, '_blank')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View PDF
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleUnlinkPaper(paper.id)}
                      disabled={isUnlinking && unlinkingPaperId === paper.id}
                    >
                      {isUnlinking && unlinkingPaperId === paper.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Unlink
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {paper.has_extracted_text ? (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="w-full"
                        onClick={() => onViewExtractedText(paper)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Extracted Text
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        className="w-full"
                        onClick={() => handleExtractText(paper.id)}
                        disabled={
                          (isExtracting && startingExtraction === paper.id) || 
                          (startingExtraction !== null && startingExtraction !== paper.id)
                        }
                      >
                        {isExtracting && startingExtraction === paper.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          <>
                            <FileCheck className="mr-2 h-4 w-4" />
                            Extract Text
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center py-10 text-center">
            <FileIcon className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="mb-2 font-medium">No {title.toLowerCase()} attached</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add {title.toLowerCase()} to this test for better organization.
            </p>
            <Dialog open={isAddingPaper} onOpenChange={setIsAddingPaper}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add {title}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Select Paper</DialogTitle>
                  <DialogDescription>
                    Add a paper to this test. You can select existing papers or upload a new one.
                  </DialogDescription>
                </DialogHeader>
                
                <PaperSelector 
                  isOpen={true}
                  onOpenChange={setIsAddingPaper}
                  testId={testId} 
                  subjectId={subjectId} 
                  paperTypeFilter={title === "Question Papers" ? "question" : "answer"}
                  onSelectPaper={handlePaperSelected} 
                />
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingPaper(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading test papers...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="question">
      <TabsList className="mb-4">
        <TabsTrigger value="question">Question Papers ({questionPapers.length})</TabsTrigger>
        <TabsTrigger value="answer">Answer Keys ({answerPapers.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="question">
        {renderPaperList(questionPapers, "Question Papers")}
      </TabsContent>
      
      <TabsContent value="answer">
        {renderPaperList(answerPapers, "Answer Keys")}
      </TabsContent>
    </Tabs>
  );
}
