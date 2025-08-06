import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/resources/FileUploader";
import { FilesBrowser } from "@/components/resources/FilesBrowser";
import { Upload, FolderClosed } from "lucide-react";
import { ensureBucket } from "@/utils/initialize-storage";

export default function Resources() {
  const [activeTab, setActiveTab] = useState<string>("browse");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [bucketReady, setBucketReady] = useState(false);

  // Ensure the storage bucket exists when component mounts
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        const ready = await ensureBucket("papers");
        setBucketReady(ready);
        if (!ready) {
          console.warn("Storage bucket initialization failed. Upload functionality might be limited.");
        }
      } catch (error) {
        console.error("Failed to initialize storage:", error);
      }
    };
    
    initializeStorage();
  }, []);

  return (
    <div className="space-y-8 animate-page-transition-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <Button 
          className="bg-primary"
          onClick={() => setIsUploadDialogOpen(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>
      
      <FilesBrowser />
      
      <FileUploader 
        isOpen={isUploadDialogOpen} 
        onOpenChange={setIsUploadDialogOpen} 
        onSuccess={() => setIsUploadDialogOpen(false)}
      />
      
      {activeTab === "upload" && !isUploadDialogOpen && (
        <Card className="border border-dashed mt-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderClosed className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Store and organize all your educational resources such as question papers, answer keys, and handwritten sheets in one place.
            </p>
            <Button 
              className="mt-6 bg-primary"
              onClick={() => setIsUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
