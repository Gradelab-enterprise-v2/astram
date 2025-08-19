import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertTriangle, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import { EnhancedTextViewer } from "@/components/ui/EnhancedTextViewer";

interface DocumentViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  extractedText: string | null;
  title: string;
  isLoading?: boolean;
  documentId: string;
  showExtractButton?: boolean;
  onExtractText?: () => Promise<void>;
  showDeleteButton?: boolean;
  onDeleteDocument?: () => void;
  extractionProgress?: number;
  extractedBatches?: string[];
}

export function DocumentViewer({
  isOpen,
  onOpenChange,
  fileUrl,
  extractedText,
  title,
  isLoading = false,
  documentId,
  showExtractButton = false,
  onExtractText,
  showDeleteButton = false,
  onDeleteDocument,
  extractionProgress = 0,
  extractedBatches = [],
}: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState("document");
  const [pdfLoading, setPdfLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('all');
  
  useEffect(() => {
    if (isOpen) {
      setPdfLoading(true);
    }
  }, [isOpen]);

  // Process the extracted text to split by pages
  const getPageContent = (text: string | null): Map<string, string> => {
    const pageMap = new Map<string, string>();
    if (!text) {
      pageMap.set('all', '');
      return pageMap;
    }
    
    // Store the full text first
    pageMap.set('all', text);
    
    // Split by page markers
    const pageRegex = /===\s*PAGE\s*(\d+)\s*===/gi;
    let match;
    let lastIndex = 0;
    
    // First, collect all page numbers and their starting positions
    const pageMarkers: { pageNum: number, startIndex: number }[] = [];
    const textCopy = text;
    
    while ((match = pageRegex.exec(textCopy)) !== null) {
      const pageNumber = parseInt(match[1]);
      const startIndex = match.index;
      pageMarkers.push({ pageNum: pageNumber, startIndex });
    }
    
    // Sort markers by start index to ensure we process in order
    pageMarkers.sort((a, b) => a.startIndex - b.startIndex);
    
    // Process each page section
    for (let i = 0; i < pageMarkers.length; i++) {
      const currentMarker = pageMarkers[i];
      const nextMarker = pageMarkers[i + 1];
      
      const endIndex = nextMarker ? nextMarker.startIndex : textCopy.length;
      const pageContent = textCopy.substring(currentMarker.startIndex, endIndex).trim();
      
      pageMap.set(`page-${currentMarker.pageNum}`, pageContent);
    }
    
    return pageMap;
  };
  
  const pageContent = getPageContent(extractedText);
  const pageKeys = Array.from(pageContent.keys())
    .filter(key => key !== 'all')
    .sort((a, b) => {
      const aNum = parseInt(a.replace('page-', ''));
      const bNum = parseInt(b.replace('page-', ''));
      return aNum - bNum;
    });

  const handleCopyText = () => {
    const textToCopy = pageContent.get(currentPage) || '';
    navigator.clipboard.writeText(textToCopy);
    toast.success("Text copied to clipboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="document"
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="extractedText">Extracted Text</TabsTrigger>
          </TabsList>

          <TabsContent 
            value="document" 
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="h-[70vh] border rounded overflow-auto">
              {pdfLoading && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <iframe
                src={fileUrl}
                className="w-full h-full"
                onLoad={() => setPdfLoading(false)}
                style={{ display: pdfLoading ? 'none' : 'block' }}
              />
            </div>
          </TabsContent>

          <TabsContent
            value="extractedText"
            className="flex-1 overflow-hidden flex flex-col"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Extracting text from document...
                </p>
                <div className="w-full max-w-md">
                  <Progress value={extractionProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {extractionProgress}% complete
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-4 h-[70vh]">
                {showExtractButton && onExtractText && (
                  <Button
                    onClick={onExtractText}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Extract Text from Document
                  </Button>
                )}
                {extractedText ? (
                  <>
                    <div className="flex items-center justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(extractedText);
                          toast.success("Text copied to clipboard");
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Text
                      </Button>
                    </div>
                    <div className="flex-1 border rounded p-4 overflow-auto bg-muted/30">
                      <EnhancedTextViewer 
                        text={extractedText} 
                        className="font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full flex-col">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mb-4" />
                    <p className="text-muted-foreground">No extracted text available</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {showDeleteButton && onDeleteDocument && (
          <div className="mt-4">
            <Button 
              variant="destructive" 
              onClick={onDeleteDocument}
              className="w-full"
            >
              Delete Document
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
