import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentAnswerSheet } from "@/hooks/use-student-sheets";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudentSheets } from "@/hooks/use-student-sheets";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface AnswerSheetViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: StudentAnswerSheet | null;
  studentName?: string;
}

export function AnswerSheetViewer({
  isOpen,
  onOpenChange,
  sheet,
  studentName,
}: AnswerSheetViewerProps) {
  const [activeTab, setActiveTab] = useState<string>("paper");
  const [pdfLoading, setPdfLoading] = useState(true);
  const [isRetracting, setIsRetracting] = useState(false);
  const { useExtractText } = useStudentSheets();
  const extractTextMutation = useExtractText();

  const handleRetryExtraction = async () => {
    if (!sheet) return;
    
    try {
      setIsRetracting(true);
      toast.info("Reprocessing answer sheet...");
      
      await extractTextMutation.mutateAsync(sheet);
      
      toast.success("Text extraction completed");
      setActiveTab("text");
    } catch (error) {
      console.error("Error retrying extraction:", error);
      toast.error("Failed to extract text. Please try again.");
    } finally {
      setIsRetracting(false);
    }
  };

  const renderExtractionError = () => {
    if (!sheet) return null;
    
    // Check if this is a failed extraction - only check status, not text content
    const isFailed = sheet.status === 'failed';
    
    if (isFailed) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Text extraction failed. You can try extracting the text again.
          </AlertDescription>
          <div className="mt-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={handleRetryExtraction}
              disabled={isRetracting}
            >
              {isRetracting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Retrying...</>
              ) : (
                <><RefreshCw className="h-4 w-4" /> Retry Extraction</>
              )}
            </Button>
          </div>
        </Alert>
      );
    }
    
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Answer Sheet - {studentName || "Student"}</DialogTitle>
          <DialogDescription>
            View the uploaded answer sheet and extracted text.
          </DialogDescription>
        </DialogHeader>
        
        {!sheet ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs 
            defaultValue="paper" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="mb-2">
              <TabsTrigger value="paper">Paper</TabsTrigger>
              <TabsTrigger value="text">
                Extracted Text
                {sheet.status === 'failed' && <AlertTriangle className="ml-1 h-3 w-3 text-destructive" />}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="paper" className="flex-1 overflow-hidden">
              <div className="h-[65vh] border rounded overflow-auto">
                {pdfLoading && (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <iframe 
                  src={sheet.file_url} 
                  className="w-full h-full"
                  onLoad={() => setPdfLoading(false)}
                  style={{ display: pdfLoading ? "none" : "block" }}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="text" className="flex-1 overflow-hidden">
              {renderExtractionError()}
              <div className="h-[65vh] border rounded p-4 overflow-auto bg-muted/30">
                {sheet.status === 'processing' ? (
                  <div className="flex items-center justify-center h-full flex-col">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p>Extracting text from document...</p>
                    <p className="text-sm text-muted-foreground mt-1">This may take a few moments</p>
                    {sheet.extracted_text && (
                      <div className="mt-4 w-full max-w-md">
                        <Progress value={calculateExtractionProgress(sheet.extracted_text)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          {getCurrentPageInfo(sheet.extracted_text)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : sheet.has_extracted_text ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold">Extracted Text</h2>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRetryExtraction}
                        disabled={isRetracting}
                        className="flex items-center gap-2"
                      >
                        {isRetracting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                        ) : (
                          <><RefreshCw className="h-4 w-4" /> Extract Text Again</>
                        )}
                      </Button>
                    </div>
                    {sheet.extracted_text.split('--- Page').map((pageText, index) => {
                      if (!pageText.trim()) return null;
                      return (
                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                          <h3 className="font-semibold mb-2">Page {index}</h3>
                          <pre className="whitespace-pre-wrap font-mono text-sm">
                            {pageText.trim()}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full flex-col">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mb-4" />
                    <p className="text-muted-foreground">No extracted text available</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mt-4"
                      onClick={handleRetryExtraction}
                      disabled={isRetracting}
                    >
                      {isRetracting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                      ) : (
                        <><RefreshCw className="mr-2 h-4 w-4" /> Extract Text</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function calculateExtractionProgress(extractedText: string): number {
  const pages = extractedText.split('--- Page').length - 1;
  const totalPages = extractedText.match(/Processing page (\d+) of (\d+)/);
  if (totalPages && totalPages[2]) {
    return (pages / parseInt(totalPages[2])) * 100;
  }
  return 0;
}

function getCurrentPageInfo(extractedText: string): string {
  const match = extractedText.match(/Processing page (\d+) of (\d+)/);
  if (match) {
    return `Processing page ${match[1]} of ${match[2]}`;
  }
  return "Processing pages...";
}
