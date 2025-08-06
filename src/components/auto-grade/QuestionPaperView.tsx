
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useStudentSheets } from "@/hooks/use-student-sheets";
import { useTestPapers } from "@/hooks/use-test-papers";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface QuestionPaperViewProps {
  studentId: string;
  testId: string;
  answerSheetId?: string;
}

export function QuestionPaperView({
  studentId,
  testId,
  answerSheetId,
}: QuestionPaperViewProps) {
  const [activeTab, setActiveTab] = useState<string>("student");
  const [studentPdfLoading, setStudentPdfLoading] = useState(true);
  const [answerKeyPdfLoading, setAnswerKeyPdfLoading] = useState(true);
  const [studentSheet, setStudentSheet] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const { useStudentAnswerSheet, getAnswerSheetById } = useStudentSheets();
  const { data: fetchedStudentSheet } = useStudentAnswerSheet(studentId, testId);
  
  const { usePapersByTest } = useTestPapers();
  const { data: testPapers = [] } = usePapersByTest(testId);
  
  const answerKeyPaper = testPapers.find(p => p.paper_type === "answer");

  // Use effect to set the student sheet when it's loaded or when answerSheetId changes
  useEffect(() => {
    const loadStudentSheet = async () => {
      if (answerSheetId) {
        try {
          const data = await getAnswerSheetById(answerSheetId);
          if (data) {
            setStudentSheet(data);
          }
        } catch (error) {
          console.error("Error in loadStudentSheet:", error);
        }
      } else if (fetchedStudentSheet) {
        setStudentSheet(fetchedStudentSheet);
      }
    };

    loadStudentSheet();
  }, [answerSheetId, fetchedStudentSheet, getAnswerSheetById]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs 
        defaultValue="student" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full h-full flex flex-col"
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="student">Student Answer</TabsTrigger>
            <TabsTrigger value="answerkey">Answer Key</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleZoomOut}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              size="sm"
              variant="ghost"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{Math.round(zoomLevel * 100)}%</span>
            <Button 
              onClick={handleZoomIn}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              size="sm"
              variant="ghost"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <div className="w-24">
              <Slider 
                value={[zoomLevel * 100]} 
                min={50} 
                max={200} 
                step={10} 
                onValueChange={(value) => setZoomLevel(value[0] / 100)}
              />
            </div>
          </div>
        </div>
        
        <TabsContent value="student" className="flex-1 relative overflow-auto h-full">
          <div className="h-full border rounded-md overflow-auto">
            {!studentSheet?.file_url ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No answer sheet available</p>
              </div>
            ) : studentPdfLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : null}
            {studentSheet?.file_url && (
              <iframe 
                src={studentSheet.file_url} 
                className="w-full h-full"
                onLoad={() => setStudentPdfLoading(false)}
                style={{ 
                  display: studentPdfLoading ? "none" : "block",
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                  height: `${100 / zoomLevel}%`,
                  width: `${100 / zoomLevel}%`
                }}
              />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="answerkey" className="flex-1 relative overflow-auto h-full">
          <div className="h-full border rounded-md overflow-auto">
            {!answerKeyPaper?.file_url ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No answer key available</p>
              </div>
            ) : answerKeyPdfLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : null}
            {answerKeyPaper?.file_url && (
              <iframe 
                src={answerKeyPaper.file_url} 
                className="w-full h-full"
                onLoad={() => setAnswerKeyPdfLoading(false)}
                style={{ 
                  display: answerKeyPdfLoading ? "none" : "block",
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                  height: `${100 / zoomLevel}%`,
                  width: `${100 / zoomLevel}%`
                }}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
