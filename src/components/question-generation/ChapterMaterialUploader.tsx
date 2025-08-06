
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useChapterMaterials, ChapterMaterial } from "@/hooks/use-chapter-materials";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, FileText, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentViewer } from "@/components/resources/DocumentViewer";
import { Progress } from "@/components/ui/progress";

interface ChapterMaterialUploaderProps {
  subjectId: string;
  onDocumentUploaded?: (document: ChapterMaterial | null) => void;
  autoExtractText?: boolean;
}

export function ChapterMaterialUploader({
  subjectId,
  onDocumentUploaded,
  autoExtractText = false
}: ChapterMaterialUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<ChapterMaterial | null>(null);
  const [isCheckingExtractionStatus, setIsCheckingExtractionStatus] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedBatches, setExtractedBatches] = useState<string[]>([]);
  const [showFileUploader, setShowFileUploader] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadDocument, isUploading, getChapterMaterial, extractTextFromDocument } = useChapterMaterials();

  // Reset when subject changes
  useEffect(() => {
    if (!subjectId) {
      return;
    }
    
    // Don't reset current document or file uploader when subject changes if we already have a document
    // This prevents losing the current document when changing subjects
    if (!currentDocument) {
      setSelectedFile(null);
      setExtractionProgress(0);
      setExtractedBatches([]);
      setShowFileUploader(true);
      if (onDocumentUploaded) {
        onDocumentUploaded(null);
      }
    }
  }, [subjectId, onDocumentUploaded, currentDocument]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    const title = selectedFile.name.split('.')[0];
    try {
      const document = await uploadDocument(selectedFile, title, subjectId);
      
      if (document) {
        setCurrentDocument(document);
        setShowFileUploader(false);
        if (onDocumentUploaded) {
          onDocumentUploaded(document);
        }
        
        // Only start checking extraction status if autoExtractText is true
        if (autoExtractText) {
          startExtraction(document);
        }
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document. Please try again.");
    }
  };
  
  const startExtraction = async (document: ChapterMaterial) => {
    if (!document || !document.id) {
      toast.error("Invalid document. Please try uploading again.");
      return;
    }
    
    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractedBatches([]);
    
    try {
      const result = await extractTextFromDocument(document, {
        batchSize: 2,
        onProgress: (progress, batchText, batchNumber, totalBatches) => {
          setExtractionProgress(progress);
          if (batchText) {
            setExtractedBatches(prevBatches => {
              // Create a new array with the specific index updated
              const newBatches = [...prevBatches];
              newBatches[batchNumber - 1] = batchText;
              return newBatches;
            });
          }
        }
      });
      
      if (result) {
        // Get the latest document data after extraction
        try {
          const updatedDocument = await getChapterMaterial(document.id);
          if (updatedDocument) {
            setCurrentDocument(updatedDocument);
            if (onDocumentUploaded) {
              onDocumentUploaded(updatedDocument);
            }
          }
        } catch (error) {
          console.error("Error fetching updated document:", error);
        }
      }
    } catch (error) {
      console.error("Error extracting text:", error);
      toast.error("Failed to extract text from document");
    } finally {
      setIsExtracting(false);
      setExtractionProgress(100);
    }
  };

  const handleViewDocument = async () => {
    if (currentDocument && currentDocument.id) {
      try {
        // Refresh document data to get latest extraction status
        const updatedDocument = await getChapterMaterial(currentDocument.id);
        if (updatedDocument) {
          setCurrentDocument(updatedDocument);
        }
        setViewerOpen(true);
      } catch (error) {
        console.error("Error fetching document:", error);
        toast.error("Failed to load document details");
      }
    }
  };

  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleExtractText = async () => {
    if (!currentDocument) return;
    await startExtraction(currentDocument);
  };

  // Function to remove material
  const handleRemoveMaterial = () => {
    setCurrentDocument(null);
    setSelectedFile(null);
    setShowFileUploader(true);
    if (onDocumentUploaded) {
      onDocumentUploaded(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      {showFileUploader && (
        <div className="space-y-2">
          <label className="text-sm font-medium block">Upload New Material</label>
          <div className="flex items-center gap-4">
            <div 
              className="flex-1 border rounded-md px-4 py-2 text-sm bg-background cursor-pointer flex items-center gap-2"
              onClick={handleFileInputClick}
            >
              {selectedFile ? (
                <>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{selectedFile.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Click to select a file</span>
              )}
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
            />
            <Button 
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {currentDocument && (
        <div className="space-y-3">
          {(isExtracting || isCheckingExtractionStatus) && extractionProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Extracting text...</span>
                <span>{extractionProgress}%</span>
              </div>
              <Progress value={extractionProgress} className="h-2" />
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleViewDocument}
              variant="outline"
              className="flex-1 flex items-center gap-2"
              disabled={isExtracting && extractionProgress < 100}
            >
              {currentDocument.extraction_status === "processing" || isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Document...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  View Document: {currentDocument.title}
                </>
              )}
            </Button>
            
            <Button
              onClick={handleRemoveMaterial}
              variant="outline"
              className="flex items-center gap-2 text-red-500 hover:bg-red-50"
              title="Remove Material"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      )}

      {currentDocument && (
        <DocumentViewer
          isOpen={viewerOpen}
          onOpenChange={setViewerOpen}
          fileUrl={currentDocument.file_url}
          extractedText={currentDocument.text_content}
          title={currentDocument.title}
          isLoading={isExtracting || currentDocument.extraction_status === "processing"}
          onExtractText={handleExtractText}
          documentId={currentDocument.id}
          showExtractButton={!currentDocument.has_extracted_text && !isExtracting && currentDocument.extraction_status !== "processing"}
          extractionProgress={extractionProgress}
          extractedBatches={extractedBatches}
        />
      )}
    </div>
  );
}
