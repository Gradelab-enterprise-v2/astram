
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useChapterMaterials, ChapterMaterial } from "@/hooks/use-chapter-materials";
import { DocumentUploadForm } from "./DocumentUploadForm";
import { DocumentList } from "./DocumentList";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { DocumentViewer } from "@/components/resources/DocumentViewer";

interface SubjectDocumentsProps {
  subjectId: string;
}

export function SubjectDocuments({ subjectId }: SubjectDocumentsProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<ChapterMaterial | null>(null);
  const [documents, setDocuments] = useState<ChapterMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ChapterMaterial | null>(null);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedBatches, setExtractedBatches] = useState<string[]>([]);
  
  const { getChapterMaterials, getChapterMaterial, deleteDocument, extractTextFromDocument } = useChapterMaterials();
  
  const loadDocuments = async () => {
    if (subjectId) {
      setIsLoading(true);
      try {
        const docs = await getChapterMaterials(subjectId);
        setDocuments(docs);
      } catch (error) {
        console.error("Error loading documents:", error);
        toast.error("Failed to load subject documents");
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [subjectId]);
  
  const handleViewDocument = async (document: ChapterMaterial) => {
    try {
      const updatedDocument = await getChapterMaterial(document.id);
      if (updatedDocument) {
        setCurrentDocument(updatedDocument);
        setViewerOpen(true);
        setExtractionProgress(0);
        setExtractedBatches([]);
        setIsExtracting(false);
      } else {
        toast.error("Failed to retrieve document details");
      }
    } catch (error) {
      console.error("Error retrieving document:", error);
      toast.error("Failed to open document");
    }
  };

  const openDeleteDialog = (document: ChapterMaterial) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteDocument(documentToDelete.id);
      
      if (result) {
        // Immediately remove the document from the local state
        setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentToDelete.id));
        
        setDeleteDialogOpen(false);
        setDocumentToDelete(null);
        
        if (currentDocument && currentDocument.id === documentToDelete.id) {
          setViewerOpen(false);
          setCurrentDocument(null);
        }
        
        toast.success("Document deleted successfully");
        
        // Reload documents to ensure we have the latest state
        await loadDocuments();
      } else {
        toast.error("Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExtractText = async () => {
    if (!currentDocument) return;
    
    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractedBatches([]);
    
    try {
      const result = await extractTextFromDocument(currentDocument, {
        batchSize: 1, // Process one page at a time
        onProgress: (progress, batch, batchNumber, totalBatches) => {
          console.log(`Extraction progress: ${progress}%, batch ${batchNumber}/${totalBatches}`);
          setExtractionProgress(progress);
          if (batch) {
            setExtractedBatches(prev => {
              const newBatches = [...prev];
              newBatches[batchNumber - 1] = batch;
              return newBatches;
            });
          }
        }
      });
      
      if (result) {
        const updatedDocument = await getChapterMaterial(currentDocument.id);
        if (updatedDocument) {
          setCurrentDocument(updatedDocument);
          
          setDocuments(prevDocs => 
            prevDocs.map(doc => doc.id === updatedDocument.id ? updatedDocument : doc)
          );
        }
        toast.success("Text extraction completed successfully");
      }
    } catch (error) {
      console.error("Error extracting text:", error);
      toast.error("Failed to extract text from document");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleViewerOpenChange = (open: boolean) => {
    setViewerOpen(open);
    if (!open) {
      loadDocuments(); // Refresh the document list when viewer is closed
    }
  };

  return (
    <div className="space-y-6">
      <DocumentUploadForm 
        subjectId={subjectId} 
        onUploadSuccess={loadDocuments} 
      />
      
      <DocumentList 
        documents={documents}
        isLoading={isLoading}
        onViewDocument={handleViewDocument}
        onDeleteDocument={openDeleteDialog}
      />
      
      {currentDocument && (
        <DocumentViewer
          isOpen={viewerOpen}
          onOpenChange={handleViewerOpenChange}
          fileUrl={currentDocument.file_url}
          extractedText={currentDocument.text_content}
          title={currentDocument.title}
          isLoading={isExtracting || currentDocument.extraction_status === "processing"}
          documentId={currentDocument.id}
          showExtractButton={!currentDocument.has_extracted_text && !isExtracting && currentDocument.extraction_status !== "processing"}
          onExtractText={handleExtractText}
          showDeleteButton={true}
          onDeleteDocument={() => openDeleteDialog(currentDocument)}
          extractionProgress={extractionProgress}
          extractedBatches={extractedBatches}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        documentToDelete={documentToDelete}
        isDeleting={isDeleting}
        onConfirmDelete={handleDeleteDocument}
      />
    </div>
  );
}
