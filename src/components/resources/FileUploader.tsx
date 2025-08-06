import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, Loader2 } from "lucide-react";
import { useTestPapers } from "@/hooks/use-test-papers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { TestPaper } from "@/types/test-papers";

interface FileUploaderProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  testId?: string;
  subjectId?: string;
  onSuccess?: (uploadedPaper: TestPaper) => void;
}

export function FileUploader({
  isOpen,
  onOpenChange,
  testId,
  subjectId,
  onSuccess
}: FileUploaderProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [paperType, setPaperType] = useState<"question" | "answer">("question");
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  
  const { uploadPaper, isUploading } = useTestPapers();
  
  const resetForm = () => {
    setTitle("");
    setFile(null);
    setPaperType("question");
    setIncludeAnswerKey(false);
    setAnswerKeyFile(null);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleAnswerKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAnswerKeyFile(e.target.files[0]);
    }
  };
  
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }
    
    if (!title.trim()) {
      toast.error("Please enter a title for the paper");
      return;
    }
    
    try {
      const questionTitle = paperType === "question" 
        ? `${title} - Question Paper` 
        : title;
      
      const paperData = {
        title: questionTitle,
        file,
        paper_type: paperType,
        test_id: testId,
        subject_id: subjectId
      };
      
      uploadPaper(paperData, {
        onSuccess: (paper: TestPaper) => {
          if (onSuccess) {
            onSuccess(paper);
          } 
          
          if (includeAnswerKey && answerKeyFile) {
            uploadPaper({
              title: `${title} - Answer Key`,
              file: answerKeyFile,
              paper_type: "answer",
              test_id: testId,
              subject_id: subjectId
            });
          }
          
          resetForm();
          onOpenChange(false);
          toast.success("Upload completed successfully");
        }
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Paper</DialogTitle>
          <DialogDescription>
            Upload a paper to your {testId ? "test" : "resources"}. Supported formats: PDF, DOC, DOCX, JPG, PNG.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter paper title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="paperType">Paper Type</Label>
            <Select
              value={paperType}
              onValueChange={(value: "question" | "answer") => setPaperType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select paper type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="question">Question Paper</SelectItem>
                <SelectItem value="answer">Answer Key</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="file">Upload File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              required
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected file: {file.name}
              </p>
            )}
          </div>
          
          {paperType === "question" && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeAnswerKey" 
                  checked={includeAnswerKey}
                  onCheckedChange={(checked) => setIncludeAnswerKey(checked as boolean)}
                />
                <Label 
                  htmlFor="includeAnswerKey" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Also upload an answer key for this paper
                </Label>
              </div>
              
              {includeAnswerKey && (
                <div className="space-y-2">
                  <Label htmlFor="answerKeyFile">Upload Answer Key</Label>
                  <Input
                    id="answerKeyFile"
                    type="file"
                    onChange={handleAnswerKeyFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    required={includeAnswerKey}
                  />
                  {answerKeyFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected answer key: {answerKeyFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !file || (includeAnswerKey && !answerKeyFile)}
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
