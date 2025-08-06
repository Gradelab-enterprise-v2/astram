import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertCircle, 
  ArrowRight,
  Check, 
  CheckCircle, 
  Circle, 
  FileText, 
  Info, 
  Loader2, 
  Upload, 
  XCircle 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClasses } from "@/hooks/use-classes";
import { useSubjects } from "@/hooks/use-subjects";
import { useTests } from "@/hooks/use-tests";
import { useAutoGrade } from "@/hooks/use-auto-grade";
import { toast } from "sonner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AutoGrade() {
  const navigate = useNavigate();
  
  const { classes, isLoading: isLoadingClasses } = useClasses();
  const { subjects, isLoading: isLoadingSubjects } = useSubjects();
  const { useAllTests } = useTests();
  const { data: tests = [], isLoading: isLoadingTests } = useAllTests();
  
  const {
    selectedClassId,
    setSelectedClassId,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTestId,
    setSelectedTestId,
    canEvaluate
  } = useAutoGrade();

  const [isHowToOpen, setIsHowToOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState<string | false>(false);

  // Filter subjects by class
  const classSubjects = subjects.filter(subject => {
    if (!selectedClassId) return false;
    const classObj = classes.find(c => c.id === selectedClassId);
    return classObj && subject.class === classObj.name;
  });

  // Filter tests by subject and class
  const filteredTests = tests.filter(test => 
    selectedSubjectId && test.subject_id === selectedSubjectId && 
    selectedClassId && test.class_id === selectedClassId
  );

  // Check if all selections are made
  const allSelectionsComplete = selectedClassId && selectedSubjectId && selectedTestId;

  // Handle navigation to the evaluation page
  const handleStartEvaluation = () => {
    if (!selectedClassId) {
      toast.error("Please select a class");
      return;
    }
    
    if (!selectedSubjectId) {
      toast.error("Please select a subject");
      return;
    }
    
    if (!selectedTestId) {
      toast.error("Please select a test");
      return;
    }
    
    // Navigate to the evaluate page with the correct query parameters
    navigate(`/auto-grade/evaluate?class=${selectedClassId}&subject=${selectedSubjectId}&test=${selectedTestId}`);
  };

  console.log({
    selectedClassId,
    classSubjects: classSubjects.length,
    subjects: subjects.length,
    selectedSubjectId,
    filteredTests: filteredTests.length,
    tests: tests.length
  });

  return (
    <div className="space-y-8 animate-page-transition-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Auto Check</h1>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => setIsHowToOpen(true)}
        >
          <Info className="h-4 w-4" />
          How to Use Auto Check
        </Button>
      </div>
      
      <Dialog open={isHowToOpen} onOpenChange={setIsHowToOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>How to Use Auto Check</DialogTitle>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => window.open("https://docs.gradelab.io/en/", "_blank")}
              >
                <Info className="h-4 w-4" />
                Gradelab Docs
              </Button>
            </div>
            <DialogDescription>Follow these steps to auto-grade student answer sheets:</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium text-lg">Step 1: Create Students</h3>
              <p>Add students to the system to enable auto-grading.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.open("/students", "_blank")}>Go to Students</Button>
                <Button variant="outline" onClick={() => setIsVideoOpen("students")}>Watch Demo Video</Button>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-lg">Step 2: Create Class & Add Subjects</h3>
              <p>Create a class and add subjects to it. Sync the class with students and subjects.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.open("/classes", "_blank")}>Go to Classes</Button>
                <Button variant="outline" onClick={() => setIsVideoOpen("classes")}>Watch Demo Video</Button>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-lg">Step 3: Create Test & Upload Papers</h3>
              <p>Go to the test page, create a test for the subject, and upload the question paper and answer key. Extract text from these documents.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.open("/tests", "_blank")}>Go to Tests</Button>
                <Button variant="outline" onClick={() => setIsVideoOpen("tests")}>Watch Demo Video</Button>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-lg">Step 4: Auto-Grade</h3>
              <p>Select the class, subject, and test on the auto-grade page. Upload handwritten papers of students and start the evaluation process.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsHowToOpen(false)}>Close</Button>
                <Button variant="outline" onClick={() => setIsVideoOpen("auto-grade")}>Watch Demo Video</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isVideoOpen !== false} onOpenChange={() => setIsVideoOpen(false)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {isVideoOpen === "students" && "Demo Video: Add Students"}
              {isVideoOpen === "classes" && "Demo Video: Create Class & Add Subjects"}
              {isVideoOpen === "tests" && "Demo Video: Create Test & Upload Papers"}
              {isVideoOpen === "auto-grade" && "Demo Video: Auto-Grade"}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video">
            <iframe
              src={
                isVideoOpen === "students" ? "https://www.youtube.com/embed/sVZ3TxUXWUU?si=yuBjFDJo0lkiwgCl" :
                isVideoOpen === "classes" ? "https://www.youtube.com/embed/iC2phpdYPbg?si=ApPjUylX8R6Zkdp1" :
                isVideoOpen === "tests" ? "https://www.youtube.com/embed/bsTd2AEm20g?si=EbVAFyF6g5w48fzO" :
                "https://www.youtube.com/embed/CjeI0mFBD2I?si=ub1cxLT-mLjLxw71"
              }
              title="Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
      
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-blue-700 dark:text-blue-300">
            Auto Check uses AI to evaluate student answer sheets. Select a class, subject, and test, then upload and evaluate student submissions.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            <CardTitle>Select Test Details</CardTitle>
          </div>
          <CardDescription>Select the class, subject, and test for auto-checking student answer sheets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* All selections in one view */}
          <div className="space-y-6">
            {/* Class Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                <h3 className="font-medium text-lg">Select Class</h3>
              </div>
              
              <div className="ml-8">
                <Select 
                  value={selectedClassId} 
                  onValueChange={(value) => {
                    setSelectedClassId(value);
                    setSelectedSubjectId("");
                    setSelectedTestId("");
                  }}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingClasses ? (
                      <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                    ) : classes.length === 0 ? (
                      <SelectItem value="none" disabled>No classes available</SelectItem>
                    ) : (
                      classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} (Year {c.year})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Subject Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                <h3 className="font-medium text-lg">Select Subject</h3>
              </div>
              
              <div className="ml-8">
                <Select 
                  value={selectedSubjectId} 
                  onValueChange={(value) => {
                    setSelectedSubjectId(value);
                    setSelectedTestId("");
                  }}
                  disabled={!selectedClassId}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {!selectedClassId ? (
                      <SelectItem value="select-class" disabled>Select a class first</SelectItem>
                    ) : isLoadingSubjects ? (
                      <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                    ) : classSubjects.length === 0 ? (
                      <SelectItem value="none" disabled>No subjects available for this class</SelectItem>
                    ) : (
                      classSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Test Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                <h3 className="font-medium text-lg">Select Test</h3>
              </div>
              
              <div className="ml-8">
                <Select 
                  value={selectedTestId} 
                  onValueChange={(value) => setSelectedTestId(value)}
                  disabled={!selectedSubjectId}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a test" />
                  </SelectTrigger>
                  <SelectContent>
                    {!selectedSubjectId ? (
                      <SelectItem value="select-subject" disabled>Select a subject first</SelectItem>
                    ) : isLoadingTests ? (
                      <SelectItem value="loading" disabled>Loading tests...</SelectItem>
                    ) : filteredTests.length === 0 ? (
                      <SelectItem value="none" disabled>No tests available for this subject and class</SelectItem>
                    ) : (
                      filteredTests.map((test) => (
                        <SelectItem key={test.id} value={test.id}>
                          {test.title} ({new Date(test.date).toLocaleDateString()})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Start Evaluation Button */}
          <div className="flex justify-end mt-8">
            <Button 
              onClick={handleStartEvaluation}
              className="flex items-center gap-2"
              disabled={!allSelectionsComplete}
            >
              Start Evaluation
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
