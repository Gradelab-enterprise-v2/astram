import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuestionBank } from "@/hooks/use-question-bank";
import { ArrowLeft, Eye, Download, Trash2, Search, XCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GeneratedQuestion } from "@/types/academics";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ANY_TOPIC = "any_topic";
const ANY_DIFFICULTY = "any_difficulty";
const ANY_BLOOM = "any_bloom";
const ANY_SUBJECT = "any_subject";

interface TopicGroup {
  id: string;
  topic: string;
  subject: string;
  subjectId: string;
  count: number;
  lastGenerated: Date;
  questions: GeneratedQuestion[];
}

export default function QuestionHistory() {
  const location = useLocation();
  const { 
    questions: allQuestionsFromHook, 
    isLoading: isLoadingFromHook,
    deleteQuestions,
    getQuestionSessions,
    refetch
  } = useQuestionBank();
  
  const questionsFromState = location.state?.questions || [];
  
  const [allQuestions, setAllQuestions] = useState<GeneratedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicGroups, setTopicGroups] = useState<TopicGroup[]>([]);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TopicGroup | null>(null);
  const [filteredQuestions, setFilteredQuestions] = useState<GeneratedQuestion[]>([]);
  
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [detailFilterSubject, setDetailFilterSubject] = useState<string | null>(null);
  const [detailFilterTopic, setDetailFilterTopic] = useState<string | null>(null);
  const [detailFilterDifficulty, setDetailFilterDifficulty] = useState<string | null>(null);
  const [detailFilterBloom, setDetailFilterBloom] = useState<string | null>(null);
  
  const [topics, setTopics] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [bloomLevels, setBloomLevels] = useState<string[]>([]);
  
  const [selectedQuestion, setSelectedQuestion] = useState<GeneratedQuestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Load questions and sessions
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      try {
        if (questionsFromState.length > 0) {
          // Use questions from navigation state if available
          setAllQuestions(questionsFromState);
          console.log(`Loaded ${questionsFromState.length} questions from navigation state`);
        } else {
          // Load from database using the improved hook
          const sessions = await getQuestionSessions();
          const allQuestionsFromSessions = sessions.flatMap(session => session.questions);
          setAllQuestions(allQuestionsFromSessions);
          setTopicGroups(sessions);
          console.log(`Loaded ${allQuestionsFromSessions.length} questions from ${sessions.length} sessions`);
        }
      } catch (error) {
        console.error("Error loading questions:", error);
        toast.error("Failed to load question history");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [questionsFromState, getQuestionSessions]);
  
  // Update topic groups when allQuestions changes
  useEffect(() => {
    if (allQuestions.length > 0) {
      const groupsMap = new Map<string, TopicGroup>();
      
      allQuestions.forEach(q => {
        const topic = q.topic || "Unnamed Topic";
        const subject = q.subject?.name || "Unassigned";
        const subjectId = q.subject?.id || "unknown";
        const key = `${topic}_${subjectId}`;
        
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            id: key,
            topic,
            subject,
            subjectId,
            count: 0,
            lastGenerated: new Date(q.created_at || Date.now()),
            questions: []
          });
        }
        
        const group = groupsMap.get(key)!;
        group.count++;
        group.questions.push(q);
        
        const questionDate = new Date(q.created_at || Date.now());
        if (questionDate > group.lastGenerated) {
          group.lastGenerated = questionDate;
        }
      });
      
      const groups = Array.from(groupsMap.values()).sort((a, b) => 
        b.lastGenerated.getTime() - a.lastGenerated.getTime()
      );
      
      setTopicGroups(groups);
      
      const uniqueTopics = Array.from(new Set(allQuestions.map(q => q.topic || "Unnamed Topic")));
      const uniqueSubjects = Array.from(new Set(allQuestions
        .filter(q => q.subject)
        .map(q => ({ id: q.subject?.id || "unknown", name: q.subject?.name || "Unknown" }))
      ));
      const uniqueBloomLevels = Array.from(
        new Set(allQuestions.filter(q => q.bloom_level).map(q => q.bloom_level))
      );
      
      setTopics(uniqueTopics);
      setSubjects(uniqueSubjects as {id: string, name: string}[]);
      setBloomLevels(uniqueBloomLevels.filter(level => level) as string[]);
    }
  }, [allQuestions]);
  
  const handleSelectGroup = (group: TopicGroup) => {
    setSelectedGroup(group);
    setDetailFilterTopic(group.topic);
    setDetailFilterSubject(group.subjectId);
    setDetailFilterDifficulty(null);
    setDetailFilterBloom(null);
    setDetailSearchQuery("");
    setIsDetailPanelOpen(true);
    
    const filtered = group.questions;
    setFilteredQuestions(filtered);
  };
  
  useEffect(() => {
    if (!selectedGroup) return;
    
    let filtered = [...selectedGroup.questions];
    
    if (detailFilterSubject && detailFilterSubject !== ANY_SUBJECT) {
      filtered = filtered.filter(q => q.subject?.id === detailFilterSubject);
    }
    
    if (detailFilterTopic && detailFilterTopic !== ANY_TOPIC) {
      filtered = filtered.filter(q => q.topic === detailFilterTopic);
    }
    
    if (detailFilterDifficulty && detailFilterDifficulty !== ANY_DIFFICULTY) {
      const difficultyLevel = parseInt(detailFilterDifficulty);
      filtered = filtered.filter(q => {
        if (!q.difficulty) return false;
        if (difficultyLevel === 1) return q.difficulty <= 30;
        if (difficultyLevel === 2) return q.difficulty > 30 && q.difficulty <= 70;
        if (difficultyLevel === 3) return q.difficulty > 70;
        return true;
      });
    }
    
    if (detailFilterBloom && detailFilterBloom !== ANY_BLOOM) {
      filtered = filtered.filter(q => q.bloom_level === detailFilterBloom);
    }
    
    if (detailSearchQuery) {
      const query = detailSearchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.question_text.toLowerCase().includes(query) ||
        (q.answer_text && q.answer_text.toLowerCase().includes(query))
      );
    }
    
    setFilteredQuestions(filtered);
  }, [
    selectedGroup,
    detailFilterTopic,
    detailFilterSubject, 
    detailFilterDifficulty, 
    detailFilterBloom,
    detailSearchQuery
  ]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Question history refreshed");
    } catch (error) {
      console.error("Error refreshing questions:", error);
      toast.error("Failed to refresh question history");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleExport = () => {
    const questionData = filteredQuestions.map(q => ({
      type: q.question_type,
      question: q.question_text,
      answer: q.answer_text || "",
      topic: q.topic,
      bloom_level: q.bloom_level || "Not specified",
      difficulty: q.difficulty || 0,
      marks: q.marks || (q.question_type === "MCQ" ? 1 : "Not specified"),
      options: q.question_type === "MCQ" ? (q.options?.map(o => `${o.text} ${o.is_correct ? "(Correct)" : ""}`).join(" | ") || "") : "N/A"
    }));
    
    let csvContent = "Type,Question,Answer,Topic,Bloom Level,Difficulty,Marks,Options\n";
    questionData.forEach(row => {
      const processField = (field: any) => `"${String(field).replace(/"/g, '""')}"`;
      csvContent += [
        processField(row.type),
        processField(row.question),
        processField(row.answer),
        processField(row.topic),
        processField(row.bloom_level),
        processField(row.difficulty),
        processField(row.marks),
        processField(row.options)
      ].join(",") + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `questions_${selectedGroup?.topic.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return "bg-green-100 text-green-800 border-green-200";
    if (difficulty <= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 30) return "Easy";
    if (difficulty <= 70) return "Medium";
    return "Hard";
  };

  const getBloomColor = (bloomLevel: string) => {
    const colors = {
      Remember: "bg-blue-100 text-blue-800 border-blue-200",
      Understand: "bg-green-100 text-green-800 border-green-200",
      Apply: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Analyze: "bg-orange-100 text-orange-800 border-orange-200",
      Evaluate: "bg-purple-100 text-purple-800 border-purple-200",
      Create: "bg-pink-100 text-pink-800 border-pink-200"
    };
    return colors[bloomLevel as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const getCourseOutcomeNumber = (courseOutcomeId?: string): string => {
    if (!courseOutcomeId) return "";
    const match = courseOutcomeId.match(/(\d+)/);
    return match ? match[1] : "";
  };
  
  return (
    <div className="space-y-8 animate-page-transition-in">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/question-generation">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Question History</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Generated Topics</CardTitle>
          <CardDescription>
            Browse topics you've generated questions for
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : topicGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No question history found.</p>
              <p className="text-sm mt-2">
                Generate some questions to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {topicGroups.map((group) => (
                <Card 
                  key={group.id} 
                  className="hover:border-primary/50 cursor-pointer transition-all"
                  onClick={() => handleSelectGroup(group)}
                >
                  <CardContent className="p-4 flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="font-medium text-lg truncate">{group.topic}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{group.subject}</span>
                        <span className="inline-block w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>Generated: {formatDate(group.lastGenerated)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{group.count} questions</Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="flex items-center gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectGroup(group);
                        }}
                      >
                        <span>View</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Panel */}
      <Sheet open={isDetailPanelOpen} onOpenChange={setIsDetailPanelOpen}>
        <SheetContent side="right" className="w-[800px] sm:w-[900px]">
          <SheetHeader>
            <SheetTitle>
              {selectedGroup?.topic} - {selectedGroup?.subject}
            </SheetTitle>
            <SheetDescription>
              {filteredQuestions.length} questions • Generated {selectedGroup ? formatDate(selectedGroup.lastGenerated) : ''}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 mt-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={detailSearchQuery}
                  onChange={(e) => setDetailSearchQuery(e.target.value)}
                  className="w-48"
                />
              </div>
              
              <Select value={detailFilterSubject || ANY_SUBJECT} onValueChange={setDetailFilterSubject}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_SUBJECT}>All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={detailFilterTopic || ANY_TOPIC} onValueChange={setDetailFilterTopic}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_TOPIC}>All Topics</SelectItem>
                  {topics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={detailFilterDifficulty || ANY_DIFFICULTY} onValueChange={setDetailFilterDifficulty}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_DIFFICULTY}>All Levels</SelectItem>
                  <SelectItem value="1">Easy</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">Hard</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={detailFilterBloom || ANY_BLOOM} onValueChange={setDetailFilterBloom}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Bloom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_BLOOM}>All Levels</SelectItem>
                  {bloomLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-4 pr-4">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No questions match your filter criteria.</p>
                  </div>
                ) : (
                  filteredQuestions.map((question, index) => (
                    <Card key={question.id || `temp-${index}`} className="p-4 hover:border-primary/60 transition-colors">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <div className="space-y-2">
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant={question.question_type === "MCQ" ? "secondary" : "default"}>
                                {question.question_type}
                              </Badge>
                              {question.difficulty !== undefined && (
                                <Badge className={getDifficultyColor(question.difficulty)}>
                                  {getDifficultyLabel(question.difficulty)}
                                </Badge>
                              )}
                              {question.bloom_level && (
                                <Badge className={getBloomColor(question.bloom_level)}>
                                  {question.bloom_level}
                                </Badge>
                              )}
                              {question.marks !== undefined && question.question_type === "Theory" && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                                  {question.marks} mark{Number(question.marks) > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {question.course_outcome_id && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200">
                                  CO{getCourseOutcomeNumber(question.course_outcome_id)}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium text-lg">Q{index + 1}. {question.question_text}</h3>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (question.id) {
                                deleteQuestions([question.id]);
                                setFilteredQuestions(prev => prev.filter(q => q.id !== question.id));
                                setAllQuestions(prev => prev.filter(q => q.id !== question.id));
                                toast.success("Question deleted");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {question.answer_text && question.question_type === "Theory" && (
                          <div className="pl-6">
                            <div className="font-medium mb-2">Answer:</div>
                            <div className="text-gray-700 whitespace-pre-line">{question.answer_text}</div>
                          </div>
                        )}
                        
                        {question.options && question.question_type === "MCQ" && (
                          <div className="pl-6">
                            <div className="font-medium mb-2">Options:</div>
                            <div className="space-y-1">
                              {question.options.map((option, optIndex) => (
                                <div 
                                  key={optIndex} 
                                  className={`text-sm ${option.is_correct ? 'text-green-700 font-medium' : 'text-gray-600'}`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option.text}
                                  {option.is_correct && <span className="ml-2 text-green-600">✓</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
