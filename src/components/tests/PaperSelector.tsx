import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useTestPapers } from "@/hooks/use-test-papers";
import { TestPaper } from "@/types/test-papers";
import { Input } from "@/components/ui/input";
import { Loader2, Search, FileText, Check, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PaperSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  testId: string;
  onSelectPaper: (paperId: string) => void;
  paperTypeFilter?: "question" | "answer" | "all";
}

interface PaperGroup {
  questionPaper: TestPaper | null;
  answerKey: TestPaper | null;
  title: string;
}

export function PaperSelector({
  isOpen,
  onOpenChange,
  subjectId,
  testId,
  onSelectPaper,
  paperTypeFilter = "all"
}: PaperSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const { usePapersBySubject } = useTestPapers();
  const { data: allPapers = [], isLoading } = usePapersBySubject(subjectId);
  
  const [availablePapers, setAvailablePapers] = useState<TestPaper[]>([]);
  const [paperGroups, setPaperGroups] = useState<PaperGroup[]>([]);
  
  useEffect(() => {
    if (isOpen) {
      setSelectedPaperId(null);
      setSearchQuery("");
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (allPapers && allPapers.length > 0) {
      const filtered = allPapers.filter(paper => 
        !paper.test_id || paper.test_id !== testId
      );
      setAvailablePapers(filtered);
      
      const groups: Record<string, PaperGroup> = {};
      
      filtered.forEach(paper => {
        let baseTitle = paper.title;
        const questionMatch = baseTitle.match(/^(.*?)\s*-\s*Question Paper$/);
        const answerMatch = baseTitle.match(/^(.*?)\s*-\s*Answer Key$/);
        
        if (questionMatch) {
          baseTitle = questionMatch[1];
        } else if (answerMatch) {
          baseTitle = answerMatch[1];
        }
        
        if (!groups[baseTitle]) {
          groups[baseTitle] = {
            questionPaper: null,
            answerKey: null,
            title: baseTitle
          };
        }
        
        if (paper.paper_type === "question") {
          groups[baseTitle].questionPaper = paper;
        } else if (paper.paper_type === "answer") {
          groups[baseTitle].answerKey = paper;
        }
      });
      
      setPaperGroups(Object.values(groups));
    }
  }, [allPapers, testId]);
  
  const filteredGroups = paperGroups.filter(group => 
    group.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleSelect = (paperId: string) => {
    setSelectedPaperId(paperId);
  };
  
  const handleConfirmSelection = () => {
    if (selectedPaperId) {
      onSelectPaper(selectedPaperId);
    }
  };
  
  const handlePaperSelected = (paperId: string) => {
    setSelectedPaperId(null);
    onSelectPaper(paperId);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Paper</DialogTitle>
          <DialogDescription>
            Choose a paper from your uploaded resources.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search papers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <ScrollArea className="h-[50vh] border rounded-md p-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-center p-4">
              <p className="text-muted-foreground">
                {searchQuery ? "No matching papers found." : "No available papers for this subject."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <div 
                  key={group.title}
                  className="p-4 border rounded-md"
                >
                  <div className="font-medium text-lg mb-2">{group.title}</div>
                  
                  <div className="space-y-3">
                    {group.questionPaper && (
                      <div 
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          selectedPaperId === group.questionPaper.id 
                            ? 'border-primary bg-primary/10' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleSelect(group.questionPaper!.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 mr-2 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Question Paper</p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded: {new Date(group.questionPaper.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {selectedPaperId === group.questionPaper.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {group.answerKey && (
                      <div 
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          selectedPaperId === group.answerKey.id 
                            ? 'border-primary bg-primary/10' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleSelect(group.answerKey!.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 mr-2 text-amber-500" />
                            <div>
                              <p className="font-medium">Answer Key</p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded: {new Date(group.answerKey.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {selectedPaperId === group.answerKey.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {(!group.questionPaper || !group.answerKey) && (
                      <Alert className="mt-2 border-amber-500 text-amber-800 bg-amber-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="ml-2 text-xs">
                          {!group.questionPaper 
                            ? "No question paper available for this resource." 
                            : "No answer key available for this resource."}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSelection} 
            disabled={!selectedPaperId || isLoading}
          >
            Select Paper
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
