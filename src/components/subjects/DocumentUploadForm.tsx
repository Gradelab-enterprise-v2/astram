
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChapterMaterial, useChapterMaterials } from "@/hooks/use-chapter-materials";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploadFormProps {
  subjectId: string;
  onUploadSuccess: () => void;
}

export function DocumentUploadForm({ subjectId, onUploadSuccess }: DocumentUploadFormProps) {
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadDocument, isUploading } = useChapterMaterials();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.split('.')[0]);
      }
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }
    
    if (!title.trim()) {
      toast.error("Please enter a title for the document");
      return;
    }
    
    try {
      const document = await uploadDocument(selectedFile, title, subjectId);
      
      if (document) {
        setSelectedFile(null);
        setTitle("");
        onUploadSuccess();
        toast.success("Document uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload New Document</CardTitle>
        <CardDescription>Add course materials, notes, or reference documents</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="doc-title" className="text-sm font-medium mb-2 block">Document Title</label>
            <Input 
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Document File (PDF)</label>
            <div className="flex items-center gap-4">
              <div 
                className="flex-1 border rounded-md px-4 py-2 text-sm bg-background cursor-pointer flex items-center gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedFile.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Click to select a file</span>
                )}
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf"
                className="hidden"
              />
              <Button 
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !title.trim()}
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
        </div>
      </CardContent>
    </Card>
  );
}
