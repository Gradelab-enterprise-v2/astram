
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { EnhancedTextViewer } from "@/components/ui/EnhancedTextViewer";

interface GradingPanelProps {
  currentQuestion: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userFeedback: string;
  setUserFeedback: (feedback: string) => void;
  savedFeedback: {[key: number]: string};
  currentQuestionIndex: number;
}

export function GradingPanel({
  currentQuestion,
  activeTab,
  setActiveTab,
  userFeedback,
  setUserFeedback,
  savedFeedback,
  currentQuestionIndex
}: GradingPanelProps) {
  const { user } = useAuth();
  
  // Check if the score is actually zero
  const isZeroScore = currentQuestion?.score && 
                      Array.isArray(currentQuestion.score) && 
                      currentQuestion.score.length >= 2 && 
                      currentQuestion.score[0] === 0;
  
  // Only consider it a mismatch if it's explicitly marked as not matching AND has a zero score
  const doesAnswerMatch = currentQuestion?.answer_matches !== false || !isZeroScore;

  const getConceptTags = () => {
    if (currentQuestion?.concepts && Array.isArray(currentQuestion.concepts)) {
      const colorClasses = [
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", 
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      ];
      
      return currentQuestion.concepts.map((concept: string, index: number) => ({
        name: concept,
        color: colorClasses[index % colorClasses.length]
      }));
    }
    
    return [
      { name: "No concepts detected", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" }
    ];
  };
  
  const getMissingElements = () => {
    if (currentQuestion?.missing_elements && Array.isArray(currentQuestion.missing_elements)) {
      const colorClass = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      return currentQuestion.missing_elements.map((element: string) => ({
        name: element,
        color: colorClass
      }));
    }
    
    return [];
  };

  // Generate personalized and actionable AI feedback based on the question assessment
  const getEnhancedFeedback = () => {
    if (!currentQuestion) return "No feedback available for this question.";
    
    // Use personalized feedback if available from the new AI structure
    if (currentQuestion.personalized_feedback) {
      return currentQuestion.personalized_feedback;
    }
    
    if (!doesAnswerMatch) {
      const missingElements = currentQuestion.missing_elements || [];
      let specificFeedback = "Your answer doesn't align with the expected content. ";
      
      if (missingElements.length > 0) {
        specificFeedback += "Key concepts missing: ";
        specificFeedback += missingElements.map((element: string) => `${element}`).join(", ") + ". ";
      }
      
      // Add focused, concise guidance
      specificFeedback += `Focus on reviewing ${currentQuestion.concepts?.join(", ") || "this topic"} in your course materials. `;
      specificFeedback += "Ensure your answers address the specific question being asked and include key terminology.";
      
      return specificFeedback;
    }
    
    if (currentQuestion.remarks) {
      return currentQuestion.remarks;
    }
    
    // Default feedback if no specific remarks are available
    return `To improve your answer on this question, focus on key concepts related to ${currentQuestion.concepts?.join(", ") || "this topic"} and provide specific examples where possible.`;
  };

  return (
    <Card>
      <CardContent className="p-4 pt-6 space-y-6">
        <Tabs defaultValue="ai-analysis" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="text-recognition">Text Recognition</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai-analysis" className="space-y-6 pt-4">
            {!doesAnswerMatch && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Answer Mismatch</AlertTitle>
                <AlertDescription>
                  The student's answer doesn't match the expected content. The AI has assigned 0 marks.
                </AlertDescription>
              </Alert>
            )}
            
            <div>
              <h3 className="font-medium mb-2">AI Detected Concepts</h3>
              <div className="flex flex-wrap gap-2">
                {getConceptTags().map((tag, index) => (
                  <span key={index} className={`px-2 py-1 rounded-full text-xs font-medium ${tag.color}`}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
            
            {getMissingElements().length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Missing Elements</h3>
                <div className="flex flex-wrap gap-2">
                  {getMissingElements().map((tag, index) => (
                    <span key={index} className={`px-2 py-1 rounded-full text-xs font-medium ${tag.color}`}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h3 className="font-medium mb-2">AI Feedback</h3>
              <EnhancedTextViewer 
                text={getEnhancedFeedback()}
                className="text-sm"
              />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Your Previous Feedback</h3>
              <p className="text-sm">
                {savedFeedback[currentQuestionIndex] 
                  ? savedFeedback[currentQuestionIndex]
                  : `No feedback given by ${user?.email || 'teacher'}`}
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="text-recognition" className="space-y-4 pt-4">
            <div>
              <h3 className="font-medium mb-2">Raw Extracted Text</h3>
              <ScrollArea className="h-[150px] bg-slate-100 dark:bg-slate-800 rounded-md p-4">
                <EnhancedTextViewer 
                  text={currentQuestion?.raw_extracted_text || currentQuestion?.answer || "No text was extracted from this answer."}
                  className="text-sm"
                />
              </ScrollArea>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Processed Answer Text</h3>
              <ScrollArea className="h-[150px] bg-slate-100 dark:bg-slate-800 rounded-md p-4">
                <EnhancedTextViewer 
                  text={currentQuestion?.answer || "No processed answer text available."}
                  className="text-sm"
                />
              </ScrollArea>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Expected Answer</h3>
              <ScrollArea className="h-[100px] bg-slate-100 dark:bg-slate-800 rounded-md p-4">
                <EnhancedTextViewer 
                  text={currentQuestion?.expected_answer || "No expected answer available."}
                  className="text-sm"
                />
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
        
        <div>
          <h3 className="font-medium mb-2">Your Feedback</h3>
          <Textarea
            placeholder="Add your feedback here..."
            value={userFeedback}
            onChange={(e) => setUserFeedback(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
