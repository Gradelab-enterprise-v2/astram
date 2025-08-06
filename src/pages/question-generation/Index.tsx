import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubjectSelect } from "@/components/ui/SubjectSelect";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { History, AlertCircle, CheckCircle2, ChevronUp, ChevronDown, Minus, Plus, Loader2, X } from "lucide-react";
import { useQuestionBank } from "@/hooks/use-question-bank";
import { Link } from "react-router-dom";
import { ChapterMaterialUploader } from "@/components/question-generation/ChapterMaterialUploader";
import { MaterialSelector } from "@/components/question-generation/MaterialSelector";
import { ChapterMaterial } from "@/hooks/use-chapter-materials";
import { useCourseOutcomes } from "@/hooks/use-course-outcomes";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GeneratedQuestion } from "@/types/academics";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export default function QuestionGeneration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createQuestions } = useQuestionBank();
  
  // Form state
  const [subject, setSubject] = useState("");
  const [subjectData, setSubjectData] = useState<any>(null);
  const [topic, setTopic] = useState("");
  const [questionType, setQuestionType] = useState("mcq");
  const [mcqCount, setMcqCount] = useState(10);
  const [difficultyLevel, setDifficultyLevel] = useState(50);
  const [currentDocument, setCurrentDocument] = useState<ChapterMaterial | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  
  // Theory questions state
  const [mark1Questions, setMark1Questions] = useState(5);
  const [mark2Questions, setMark2Questions] = useState(3);
  const [mark4Questions, setMark4Questions] = useState(2);
  const [mark8Questions, setMark8Questions] = useState(1);
  
  // Course outcome mapping state
  const [courseOutcomeDistribution, setCourseOutcomeDistribution] = useState<Record<string, any>>({});
  
  // Calculate total marks
  const totalMarks = mark1Questions * 1 + mark2Questions * 2 + mark4Questions * 4 + mark8Questions * 8;
  
  // Bloom's taxonomy selection
  const BLOOMS_LEVELS = [
    "Remember",
    "Understand",
    "Apply",
    "Analyze",
    "Evaluate",
    "Create"
  ];
  const [selectedBloomLevel, setSelectedBloomLevel] = useState<string>(BLOOMS_LEVELS[0]);
  const [bloomWeights, setBloomWeights] = useState<Record<string, number>>({
    Remember: 20,
    Understand: 20,
    Apply: 15,
    Analyze: 15,
    Evaluate: 15,
    Create: 15
  });
  
  // Get course outcomes for the selected subject
  const { courseOutcomes, isLoading: isLoadingOutcomes } = useCourseOutcomes(subject);
  const hasCourseOutcomes = courseOutcomes && courseOutcomes.length > 0;

  // Fetch subject data when subject ID changes
  useEffect(() => {
    const fetchSubjectData = async () => {
      if (!subject) {
        setSubjectData(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .eq("id", subject)
          .single();

        if (error) throw error;
        setSubjectData(data);
      } catch (error) {
        console.error("Error fetching subject:", error);
      }
    };

    fetchSubjectData();
  }, [subject]);
  
  // Initialize course outcome distribution when outcomes change
  useEffect(() => {
    if (hasCourseOutcomes) {
      const initialDistribution: Record<string, any> = {};
      courseOutcomes.forEach(outcome => {
        initialDistribution[outcome.id] = {
          mark1: 1,
          mark2: 1,
          mark4: 0,
          mark8: 0,
          isOpen: outcome.id === courseOutcomes[0].id
        };
      });
      setCourseOutcomeDistribution(initialDistribution);
    }
  }, [courseOutcomes, hasCourseOutcomes]);
  
  // Handle course outcome question count change
  const handleCourseOutcomeQuestionChange = (outcomeId: string, markType: string, value: number) => {
    setCourseOutcomeDistribution(prev => ({
      ...prev,
      [outcomeId]: {
        ...prev[outcomeId],
        [markType]: Math.max(0, value)
      }
    }));
  };
  
  // Toggle course outcome section open/closed
  const toggleCourseOutcome = (outcomeId: string) => {
    setCourseOutcomeDistribution(prev => ({
      ...prev,
      [outcomeId]: {
        ...prev[outcomeId],
        isOpen: !prev[outcomeId].isOpen
      }
    }));
  };
  
  // Calculate total questions for a course outcome
  const calculateTotalQuestionsForOutcome = (outcomeId: string) => {
    const distribution = courseOutcomeDistribution[outcomeId];
    if (!distribution) return 0;
    return (
      distribution.mark1 + 
      distribution.mark2 + 
      distribution.mark4 + 
      distribution.mark8
    );
  };
  
  const handleDocumentUploaded = (document: ChapterMaterial | null) => {
    setCurrentDocument(document);
  };
  
  const [enableCourseOutcomeMapping, setEnableCourseOutcomeMapping] = useState(false);

  const handleGenerateQuestions = async () => {
    if (!subject || !topic.trim()) {
      toast.error("Please select a subject and enter a topic");
      return;
    }

    if (questionType === 'mcq' && (!mcqCount || mcqCount < 1)) {
      toast.error("Please specify the number of MCQ questions to generate");
      return;
    }

    if (questionType === 'theory' && totalMarks === 0) {
      toast.error("Please specify the mark distribution for theory questions");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      console.log("Starting question generation...");
      setGenerationProgress(10);

      // Prepare request data
      const requestData: any = {
        subject,
        topic: topic.trim(),
        difficultyLevel,
        courseOutcomes
      };

      // Check if user wants both MCQ and Theory questions
      const hasMcqQuestions = questionType === 'mcq' || questionType === 'mixed';
      const hasTheoryQuestions = questionType === 'theory' || questionType === 'mixed';
      
      if (hasMcqQuestions) {
        requestData.mcqCount = mcqCount;
      }
      
      if (hasTheoryQuestions) {
        requestData.theoryDistribution = {
          mark1Questions,
          mark2Questions,
          mark4Questions,
          mark8Questions,
          totalMarks
        };
      }
      
      // Set question type based on what's being generated
      if (hasMcqQuestions && hasTheoryQuestions) {
        requestData.questionType = 'mixed';
      } else if (hasMcqQuestions) {
        requestData.questionType = 'mcq';
      } else if (hasTheoryQuestions) {
        requestData.questionType = 'theory';
      }

      // Add course outcome distribution if available
      if (hasCourseOutcomes && Object.keys(courseOutcomeDistribution).length > 0) {
        requestData.courseOutcomeDistribution = courseOutcomeDistribution;
      }

      // Add Bloom's taxonomy distribution if available
      if (Object.values(bloomWeights).some(weight => weight > 0)) {
        requestData.bloomsTaxonomy = bloomWeights;
      }

      // Add chapter content if available
      if (currentDocument?.text_content) {
        requestData.chapterContent = currentDocument.text_content;
      }

      setGenerationProgress(20);

      console.log("Calling question generation API...");
      
      // Call the new test question generation API via Supabase edge function
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const response = await fetch('https://mfnhgldghrnjrwlhtvor.supabase.co/functions/v1/test-question-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate questions');
      }

      setGenerationProgress(50);

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      setGenerationProgress(70);

      const questions = data.questions || [];
      
      if (questions.length === 0) {
        throw new Error('No questions were generated. Please try again.');
      }

      console.log(`Generated ${questions.length} questions successfully`);

      // Format the questions for database storage
      const formattedQuestions = questions.map(question => ({
        question_text: question.question_text,
        answer_text: question.answer_text,
        question_type: question.question_type,
        topic,
        bloom_level: question.bloom_level,
        difficulty: question.difficulty,
        marks: question.marks || (question.question_type === "MCQ" ? 1 : undefined),
        options: question.options,
        subject_id: subject,
        course_outcome_id: question.course_outcome ? 
          courseOutcomes?.find(co => `CO${co.display_number}` === question.course_outcome)?.id : 
          undefined
      }));
      
      setGenerationProgress(80);
      
      // Save questions to database
      console.log("Saving questions to database...");
      await createQuestions(formattedQuestions);
      
      setGenerationProgress(90);
      
      // Increment the user's usage count
      await supabase.rpc('increment_test_generation_usage', { uid: user.id, count: 1 });
      
      setGenerationProgress(100);
      
      // Store generated questions in state
      setGeneratedQuestions(formattedQuestions as GeneratedQuestion[]);
      
      // Navigate to the generated questions page first
      navigate("/question-generation/generated", { 
        state: { 
          questions: formattedQuestions,
          courseOutcomes,
          topic,
          subject: subjectData
        } 
      });
      
      toast.success(`Successfully generated ${formattedQuestions.length} questions`);
    } catch (error) {
      console.error("Error generating questions:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to generate questions";
      if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try generating fewer questions or try again.";
      } else if (error.message.includes("structured")) {
        errorMessage = "Failed to generate structured questions. Please try again.";
      } else if (error.message.includes("API")) {
        errorMessage = "API error occurred. Please check your connection and try again.";
      } else {
        errorMessage = error.message || "An unknown error occurred";
      }
      
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const [showAddCO, setShowAddCO] = useState(false);
  const [newCODescriptions, setNewCODescriptions] = useState(['']);
  const [addingCO, setAddingCO] = useState(false);

  async function handleAddCourseOutcome() {
    if (!subject) return;
    const toAdd = newCODescriptions.map(d => d.trim()).filter(Boolean);
    if (toAdd.length === 0) return;
    setAddingCO(true);
    try {
      const inserts = toAdd.map(description => ({ subject_id: subject, description }));
      const { error } = await supabase.from('course_outcomes').insert(inserts);
      if (error) throw error;
      setShowAddCO(false);
      setNewCODescriptions(['']);
      // Refresh course outcomes
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err) {
      toast.error('Failed to add course outcome');
    } finally {
      setAddingCO(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex justify-center items-start bg-background">
      <div className="w-full max-w-6xl rounded-2xl shadow-xl p-4 md:p-8 space-y-8 animate-page-transition-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Generate Questions</h1>
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/question-generation/history">
              <History className="h-4 w-4" />
              View History
            </Link>
          </Button>
        </div>

        {/* Subject & Topic */}
        <Card className="p-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Subject & Topic</CardTitle>
            <CardDescription>Choose a subject and enter a topic or chapter name.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
              <div className="flex-1 min-w-0">
                <label htmlFor="subject" className="text-sm font-medium mb-1 block">Subject</label>
                <SubjectSelect value={subject} onChange={setSubject} />
              </div>
              <div className="flex-1 min-w-0">
                <label htmlFor="topic" className="text-sm font-medium mb-1 block">Topic or Chapter Name</label>
                <Input
                  id="topic"
                  placeholder="Enter topic or chapter name"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chapter Material */}
        <Card className="p-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Chapter Material</CardTitle>
            <CardDescription>Upload or select material to generate questions from.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {subject ? (
                <MaterialSelector 
                  subjectId={subject} 
                  onSelectMaterial={handleDocumentUploaded} 
                />
              ) : (
                <div className="p-4 bg-muted/40 rounded-md text-center">
                  Please select a subject first to view or upload chapter materials
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Type & Parameters */}
        <Card className="p-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Question Type & Parameters</CardTitle>
            <CardDescription>Choose question type and configure parameters.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Question Type</label>
                <ToggleGroup type="single" value={questionType} onValueChange={(value) => value && setQuestionType(value)} className="w-full grid grid-cols-3 gap-2">
                  <ToggleGroupItem value="mcq" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground w-full">Multiple Choice</ToggleGroupItem>
                  <ToggleGroupItem value="theory" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground w-full">Theory Questions</ToggleGroupItem>
                  <ToggleGroupItem value="mixed" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground w-full">Both Types</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                <Slider 
                  value={[difficultyLevel]} 
                  min={0} 
                  max={100} 
                  step={1}
                  onValueChange={(values) => setDifficultyLevel(values[0])} 
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Easy</span>
                  <span>Moderate</span>
                  <span>Hard</span>
                </div>
                {/* Additional Settings Button and Bloom's Taxonomy Popover */}
                <div className="mt-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full">Additional Settings</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium mb-2">Bloom's Taxonomy Mapping</h3>
                        {BLOOMS_LEVELS.map(level => (
                          <div key={level} className="mb-2">
                            <label className="text-sm font-medium mb-1 block">{level}: {bloomWeights[level]}%</label>
                            <Slider 
                              value={[bloomWeights[level]]}
                              min={0} 
                              max={100} 
                              step={1}
                              onValueChange={([val]) => setBloomWeights(w => ({ ...w, [level]: val }))}
                            />
                          </div>
                        ))}
                        <div className="space-y-1 mt-2">
                          <div className="text-xs text-muted-foreground font-medium">All Bloom's Weights:</div>
                          <ul className="text-xs grid grid-cols-2 gap-x-4">
                            {BLOOMS_LEVELS.map(level => (
                              <li key={level}>{level}: {bloomWeights[level]}%</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* MCQ Section */}
            {(questionType === "mcq" || questionType === "mixed") && (
              <div className="space-y-2">
                <label className="text-sm font-medium mb-1 block">Number of Multiple Choice Questions</label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setMcqCount(Math.max(1, mcqCount - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4">{mcqCount}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setMcqCount(Math.min(50, mcqCount + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Each MCQ will have 4 options with one correct answer.</p>
              </div>
            )}

            {/* Summary for Mixed Questions */}
            {questionType === "mixed" && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Question Summary</h3>
                <div className="text-sm text-blue-700">
                  <p>• Multiple Choice Questions: {mcqCount}</p>
                  <p>• Theory Questions: {totalMarks} marks total</p>
                  <p>• Total Questions: {mcqCount + totalMarks}</p>
                </div>
              </div>
            )}

            {/* Theory Section */}
            {(questionType === "theory" || questionType === "mixed") && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox id="enable-co-mapping" checked={enableCourseOutcomeMapping} onCheckedChange={checked => setEnableCourseOutcomeMapping(!!checked)} />
                  <label htmlFor="enable-co-mapping" className="text-sm font-medium select-none cursor-pointer">
                    Enable Course Outcome Mapping
                  </label>
                </div>
                {enableCourseOutcomeMapping ? (
                  <div className="space-y-2">
                    <h3 className="text-base font-medium flex items-center gap-2">
                      Course Outcome Mapping
                      <span className="text-amber-600 bg-amber-50 text-xs font-normal px-2 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Required for theory questions
                      </span>
                      <Button size="sm" variant="outline" className="ml-4" onClick={() => setShowAddCO(true)}>
                        Add Course Outcomes
                      </Button>
                    </h3>
                    <Dialog open={showAddCO} onOpenChange={setShowAddCO}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Course Outcomes</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {newCODescriptions.map((desc, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input
                                placeholder={`Course outcome description #${idx + 1}`}
                                value={desc}
                                onChange={e => setNewCODescriptions(arr => arr.map((d, i) => i === idx ? e.target.value : d))}
                                disabled={addingCO}
                              />
                              {newCODescriptions.length > 1 && (
                                <Button size="icon" variant="ghost" onClick={() => setNewCODescriptions(arr => arr.filter((_, i) => i !== idx))} disabled={addingCO}>
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button variant="outline" onClick={() => setNewCODescriptions(arr => [...arr, ''])} disabled={addingCO}>
                            + Add another
                          </Button>
                          <Button onClick={handleAddCourseOutcome} disabled={addingCO || newCODescriptions.every(d => !d.trim())} className="w-full">
                            {addingCO ? 'Adding...' : 'Add'}
                          </Button>
                          <DialogClose asChild>
                            <Button variant="ghost" className="w-full">Cancel</Button>
                          </DialogClose>
                        </div>
                      </DialogContent>
                    </Dialog>
                    {!isLoadingOutcomes && !hasCourseOutcomes && (
                      <Alert variant="default" className="bg-amber-50 border-amber-200 text-amber-800 flex items-center">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No course outcomes mapped for this subject. You can specify the number of questions for each mark category directly.
                        </AlertDescription>
                      </Alert>
                    )}
                    {hasCourseOutcomes && (
                      <div className="space-y-4">
                        {courseOutcomes.map((outcome) => (
                          <div key={outcome.id} className="border rounded-md">
                            <div 
                              className="flex items-center gap-2 p-4 cursor-pointer"
                              onClick={() => toggleCourseOutcome(outcome.id)}
                            >
                              <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                              <div className="flex-grow">
                                <span>CO{outcome.display_number}: {outcome.description}</span>
                              </div>
                              {courseOutcomeDistribution[outcome.id]?.isOpen ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                            {courseOutcomeDistribution[outcome.id]?.isOpen && (
                              <div className="px-4 pb-4 pt-2 space-y-4 border-t">
                                <div className="font-medium">Question Distribution for CO{outcome.display_number}</div>
                                <div className="flex items-center justify-between">
                                  <span>1 mark Questions</span>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleCourseOutcomeQuestionChange(outcome.id, 'mark1', courseOutcomeDistribution[outcome.id].mark1 - 1)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center">{courseOutcomeDistribution[outcome.id]?.mark1 || 0}</span>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleCourseOutcomeQuestionChange(outcome.id, 'mark1', courseOutcomeDistribution[outcome.id].mark1 + 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>2 marks Questions</span>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleCourseOutcomeQuestionChange(outcome.id, 'mark2', courseOutcomeDistribution[outcome.id].mark2 - 1)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center">{courseOutcomeDistribution[outcome.id]?.mark2 || 0}</span>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleCourseOutcomeQuestionChange(outcome.id, 'mark2', courseOutcomeDistribution[outcome.id].mark2 + 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>4 marks Questions</span>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleCourseOutcomeQuestionChange(outcome.id, 'mark4', courseOutcomeDistribution[outcome.id].mark4 - 1)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center">{courseOutcomeDistribution[outcome.id]?.mark4 || 0}</span>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleCourseOutcomeQuestionChange(outcome.id, 'mark4', courseOutcomeDistribution[outcome.id].mark4 + 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>8 marks Questions</span>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleCourseOutcomeQuestionChange(outcome.id, 'mark8', courseOutcomeDistribution[outcome.id].mark8 - 1)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center">{courseOutcomeDistribution[outcome.id]?.mark8 || 0}</span>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => handleCourseOutcomeQuestionChange(outcome.id, 'mark8', courseOutcomeDistribution[outcome.id].mark8 + 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t">
                                  <span className="font-medium">Total Questions:</span>
                                  <span className="font-medium">{calculateTotalQuestionsForOutcome(outcome.id)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
                {(!enableCourseOutcomeMapping || (!isLoadingOutcomes && !hasCourseOutcomes)) && (
                  <div className="space-y-6 mt-4">
                    <h3 className="text-base font-medium">Specify Question Distribution</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>1 mark Questions</span>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMark1Questions(Math.max(0, mark1Questions - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{mark1Questions}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMark1Questions(mark1Questions + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>2 marks Questions</span>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMark2Questions(Math.max(0, mark2Questions - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{mark2Questions}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMark2Questions(mark2Questions + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>4 marks Questions</span>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMark4Questions(Math.max(0, mark4Questions - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{mark4Questions}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMark4Questions(mark4Questions + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>8 marks Questions</span>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMark8Questions(Math.max(0, mark8Questions - 1))}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{mark8Questions}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setMark8Questions(mark8Questions + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Total Marks:</span>
                        <span className="font-medium">{totalMarks}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          className="w-full bg-blue-500 hover:bg-blue-600 py-6 text-lg"
          onClick={handleGenerateQuestions}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {generationProgress < 100 ? `Generating Questions (${generationProgress}%)` : "Processing..."}
            </div>
          ) : (
            "Generate Questions"
          )}
        </Button>
        
        {isGenerating && (
          <Progress value={generationProgress} className="h-2" />
        )}
      </div>
    </div>
  );
}
