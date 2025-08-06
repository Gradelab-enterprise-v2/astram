import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChapterMaterials, ChapterMaterial } from "@/hooks/use-chapter-materials";
import { FileText, X, RefreshCw, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExtractedTextViewer } from "@/components/resources/ExtractedTextViewer";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface MaterialSelectorProps {
  subjectId: string;
  onSelectMaterial: (material: ChapterMaterial | null) => void;
}

export function MaterialSelector({ subjectId, onSelectMaterial }: MaterialSelectorProps) {
  const [materials, setMaterials] = useState<ChapterMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<ChapterMaterial | null>(null);
  const [hasFetchedMaterials, setHasFetchedMaterials] = useState<Record<string, boolean>>({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const { getChapterMaterials, getChapterMaterial, uploadDocument, extractTextFromDocument } = useChapterMaterials();
  
  useEffect(() => {
    if (!subjectId) {
      setMaterials([]);
      setSelectedMaterialId("");
      setSelectedMaterial(null);
      onSelectMaterial(null);
      return;
    }
    
    if (!hasFetchedMaterials[subjectId]) {
      setLoading(true);
      const loadMaterials = async () => {
        try {
          const materials = await getChapterMaterials(subjectId);
          console.log("Loaded materials for subject", subjectId, ":", materials);
          setMaterials(materials || []);
          setHasFetchedMaterials(prev => ({
            ...prev,
            [subjectId]: true
          }));
        } catch (error) {
          console.error("Error loading chapter materials:", error);
          toast.error("Failed to load chapter materials");
          setMaterials([]);
        } finally {
          setLoading(false);
        }
      };
      
      loadMaterials();
    }
  }, [subjectId, getChapterMaterials, onSelectMaterial, hasFetchedMaterials]);
  
  const handleSelectMaterial = async (materialId: string) => {
    if (!materialId || materialId === "none") {
      setSelectedMaterialId("");
      setSelectedMaterial(null);
      onSelectMaterial(null);
      return;
    }
    
    setSelectedMaterialId(materialId);
    
    try {
      const material = await getChapterMaterial(materialId);
      if (material) {
        console.log("Material selected:", material.title, "Has text:", material.has_extracted_text);
        console.log("Material text content length:", material.text_content?.length || 0);
        setSelectedMaterial(material);
        onSelectMaterial(material);
        
        if (!material.has_extracted_text) {
          toast.warning("This material doesn't have extracted text. Questions may be less specific.");
        }
      } else {
        setSelectedMaterial(null);
        onSelectMaterial(null);
      }
    } catch (error) {
      console.error("Error fetching material details:", error);
      toast.error("Failed to load complete material data");
      
      const selected = materials.find(m => m.id === materialId);
      if (selected) {
        setSelectedMaterial(selected);
        onSelectMaterial(selected);
      } else {
        setSelectedMaterial(null);
        onSelectMaterial(null);
      }
    }
  };
  
  const handleRemoveMaterial = () => {
    setSelectedMaterialId("");
    setSelectedMaterial(null);
    onSelectMaterial(null);
  };
  
  const handleRefreshMaterials = async () => {
    if (!subjectId) return;
    
    setLoading(true);
    try {
      const materials = await getChapterMaterials(subjectId);
      console.log("Refreshed materials:", materials);
      setMaterials(materials || []);
    } catch (error) {
      console.error("Error refreshing chapter materials:", error);
      toast.error("Failed to refresh chapter materials");
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewDocument = () => {
    if (selectedMaterial) {
      setViewerOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!file || !fileName.trim()) {
      toast.error('Please enter a file name and select a file.');
      return;
    }
    setUploading(true);
    try {
      const document = await uploadDocument(file, fileName, subjectId);
      if (document) {
        setShowUploader(false);
        setUploading(false);
        setIsExtracting(true);
        setExtractionProgress(0);
        // Start extraction
        await startExtraction(document);
      }
    } catch (error) {
      setUploading(false);
      toast.error('Failed to upload document.');
    }
  };

  const startExtraction = async (document: ChapterMaterial) => {
    if (!document || !document.id) {
      toast.error('Invalid document. Please try uploading again.');
      return;
    }
    setIsExtracting(true);
    setExtractionProgress(0);
    try {
      const result = await extractTextFromDocument(document, {
        batchSize: 2,
        onProgress: (progress) => {
          setExtractionProgress(progress);
        }
      });
      if (result) {
        // Get the latest document data after extraction
        try {
          const updatedDocument = await getChapterMaterial(document.id);
          if (updatedDocument) {
            setSelectedMaterialId(updatedDocument.id);
            setSelectedMaterial(updatedDocument);
            onSelectMaterial(updatedDocument);
          }
        } catch (error) {
          console.error('Error fetching updated document:', error);
        }
      }
    } catch (error) {
      toast.error('Failed to extract text from document');
    } finally {
      setIsExtracting(false);
      setExtractionProgress(100);
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium block">Select or Upload Material</label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium block">Select or Upload Material</label>
        {subjectId && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefreshMaterials} 
            className="h-8 px-2"
            title="Refresh materials list"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
      {showUploader && (
        <Dialog open={showUploader} onOpenChange={setShowUploader}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Material</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Enter file name"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                disabled={uploading || isExtracting}
              />
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={e => setFile(e.target.files?.[0] || null)}
                disabled={uploading || isExtracting}
              />
              <Button
                onClick={handleUpload}
                disabled={uploading || isExtracting || !fileName.trim() || !file}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" className="w-full">Cancel</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {isExtracting && (
        <div className="space-y-2 mt-2">
          <Progress value={extractionProgress} className="h-2" />
          <div className="text-xs text-muted-foreground">Text is extracting from your uploaded file, please wait.</div>
        </div>
      )}
      {selectedMaterial ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 border rounded-md p-3 flex items-center gap-2 bg-muted/30">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium truncate">{selectedMaterial.title}</span>
            {!selectedMaterial.has_extracted_text && (
              <span className="text-xs text-amber-600 ml-1">(No text extracted)</span>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
            onClick={handleViewDocument}
            title="View Document"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={handleRemoveMaterial}
            title="Remove Material"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          {materials.length > 0 && (
            <Select value={selectedMaterialId} onValueChange={handleSelectMaterial}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an existing document or upload new" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1">
                  <Button variant="outline" className="w-full mb-2" onClick={() => setShowUploader(true)}>
                    + Upload New Material
                  </Button>
                </div>
                <SelectItem value="none">-- Select a document --</SelectItem>
                {materials.map(material => (
                  <SelectItem 
                    key={material.id} 
                    value={material.id}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{material.title}</span>
                      {material.has_extracted_text ? 
                        <span className="text-xs text-green-600">(Text extracted)</span> : 
                        <span className="text-xs text-amber-600">(No text yet)</span>
                      }
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {materials.length === 0 && (
            <Button variant="outline" className="w-full" onClick={() => setShowUploader(true)}>
              + Upload New Material
            </Button>
          )}
        </>
      )}
      {selectedMaterial && (
        <ExtractedTextViewer
          isOpen={viewerOpen}
          onOpenChange={setViewerOpen}
          paper={{
            id: selectedMaterial.id,
            title: selectedMaterial.title,
            file_url: selectedMaterial.file_url,
            paper_type: "question",
            has_extracted_text: selectedMaterial.has_extracted_text || false,
            extracted_text: selectedMaterial.text_content || "",
            user_id: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            subject_id: subjectId
          }}
        />
      )}
    </div>
  );
}
