import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TestPaper } from "@/types/test-papers";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTestPapers } from "@/hooks/use-test-papers";

interface ExtractedTextViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paper: TestPaper | null;
}

export function ExtractedTextViewer({ isOpen, onOpenChange, paper }: ExtractedTextViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>("GPT-4o");
  
  const { extractText } = useTestPapers();
  
  useEffect(() => {
    if (isOpen && paper) {
      setIsLoading(true);
      setError(null);
      
      const fetchLatestText = async () => {
        try {
          const { data, error } = await supabase
            .from("test_papers")
            .select("extracted_text, has_extracted_text, metadata")
            .eq("id", paper.id)
            .maybeSingle();
            
          if (error) {
            throw error;
          }
          
          if (data && data.extracted_text) {
            setExtractedText(data.extracted_text);
            
            // If metadata contains model information, display it
            if (data.metadata?.model) {
              setModelUsed(data.metadata.model);
            } else {
              setModelUsed("GPT-4o"); // Default to GPT-4o as per the new implementation
            }
          } else {
            setExtractedText(paper.extracted_text || "No extracted text available.");
          }
        } catch (err) {
          console.error("Error fetching latest text:", err);
          setError("Failed to load the latest extracted text.");
          setExtractedText(paper.extracted_text || "");
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchLatestText();
    }
  }, [isOpen, paper]);
  
  if (!paper) return null;

  const handleDownloadText = () => {
    if (!extractedText) return;
    
    try {
      setIsDownloading(true);
      const blob = new Blob([extractedText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${paper.title.replace(/\s+/g, '_')}_extracted_text.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Text downloaded successfully");
    } catch (error) {
      console.error('Failed to download text:', error);
      toast.error("Failed to download text");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = () => {
    if (!extractedText) return;
    
    navigator.clipboard.writeText(extractedText)
      .then(() => {
        setCopied(true);
        toast.success("Text copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        toast.error("Failed to copy text to clipboard");
      });
  };
  
  const handleRefreshText = async () => {
    if (!paper || !paper.id) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("test_papers")
        .select("extracted_text, has_extracted_text, metadata")
        .eq("id", paper.id)
        .maybeSingle();
        
      if (error) {
        throw error;
      }
      
      if (data && data.extracted_text) {
        setExtractedText(data.extracted_text);
        
        // If metadata contains model information, display it
        if (data.metadata?.model) {
          setModelUsed(data.metadata.model);
        }
        
        toast.success("Text refreshed successfully");
      } else {
        toast.info("No new text available");
      }
    } catch (err) {
      console.error("Error refreshing text:", err);
      setError("Failed to refresh the extracted text.");
      toast.error("Failed to refresh text");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleRetryExtraction = async () => {
    if (isRetrying || !paper || !paper.id) return;
    
    setIsRetrying(true);
    toast.info("Reprocessing document...");
    
    try {
      const result = await extractText(paper.id);
      if (result && result.id) {
        toast.success("Successfully re-extracted text");
      }
    } catch (error) {
      console.error("Error retrying extraction:", error);
      toast.error("Failed to re-extract text");
    } finally {
      setIsRetrying(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading extracted text...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    
    if (!extractedText) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No extracted text available for this document.
        </div>
      );
    }
    
    if (extractedText.includes("The OCR service was unable to extract text") || 
        extractedText.includes("Error processing batch") || 
        extractedText.includes("OpenAI API error") ||
        extractedText.includes("Failed to send a request to the Edge Function")) {
      return (
        <>
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The text extraction service encountered an error while processing this document. 
              You can try extracting the text again with the "Retry Extraction" button below.
            </AlertDescription>
          </Alert>
          <div className="flex justify-center my-4">
            <Button 
              onClick={handleRetryExtraction}
              disabled={isRetrying}
              variant="outline"
            >
              {isRetrying ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retrying...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Retry Extraction</>
              )}
            </Button>
          </div>
          <div className="border p-4 bg-muted/20 rounded-md text-sm font-mono whitespace-pre-wrap mt-4">
            {extractedText}
          </div>
        </>
      );
    }
    
    return (
      <div className="border p-4 bg-muted/20 rounded-md text-sm font-mono whitespace-pre-wrap">
        {extractedText}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <ScrollArea className="h-full">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>Extracted Text: {paper.title}</DialogTitle>
              {modelUsed && (
                <p className="text-xs text-muted-foreground mt-1">
                  {/* Extracted using {modelUsed} Gradelab */}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={handleRefreshText}
                disabled={isRefreshing || isLoading}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={handleCopyText}
                disabled={!extractedText || isLoading || extractedText.includes("Error processing batch")}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy Text"}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={handleDownloadText}
                disabled={!extractedText || isDownloading || isLoading || extractedText.includes("Error processing batch")}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isDownloading ? "Downloading..." : "Download Text"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={handleRetryExtraction}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retrying...</>
                ) : (
                  <><RefreshCw className="mr-2 h-4 w-4" /> Retry Extraction</>
                )}
              </Button>
            </div>
          </DialogHeader>
          <div className="p-4 whitespace-pre-wrap">
            {renderContent()}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}