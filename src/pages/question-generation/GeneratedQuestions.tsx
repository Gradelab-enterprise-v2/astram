import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Filter, Download, History, FileText, Key } from "lucide-react";
import { useQuestionBank } from "@/hooks/use-question-bank";
import { GeneratedQuestion, CourseOutcome } from "@/types/academics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function GeneratedQuestions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { questions: allQuestions } = useQuestionBank();
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [filteredQuestions, setFilteredQuestions] = useState<GeneratedQuestion[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState<string | null>(null);
  const [filterBloom, setFilterBloom] = useState<string | null>(null);
  const [filterCourseOutcome, setFilterCourseOutcome] = useState<string | null>(null);
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Get questions passed as state from the question generator
  useEffect(() => {
    if (location.state?.questions) {
      setQuestions(location.state.questions);
      setCourseOutcomes(location.state.courseOutcomes || []);
    } else {
      // If navigating directly to this page, show from question bank
      setQuestions(allQuestions);
    }
  }, [location.state, allQuestions]);
  
  // Apply filters to questions
  useEffect(() => {
    let filtered = questions;
    
    if (activeTab === "mcq") {
      filtered = filtered.filter(q => q.question_type === "MCQ");
    } else if (activeTab === "theory") {
      filtered = filtered.filter(q => q.question_type === "Theory");
    }
    
    if (filterDifficulty) {
      const difficultyLevel = parseInt(filterDifficulty);
      filtered = filtered.filter(q => {
        if (!q.difficulty) return false;
        // Create ranges for difficulty filtering
        if (difficultyLevel === 1) return q.difficulty <= 30;
        if (difficultyLevel === 2) return q.difficulty > 30 && q.difficulty <= 70;
        if (difficultyLevel === 3) return q.difficulty > 70;
        return true;
      });
    }
    
    if (filterBloom) {
      filtered = filtered.filter(q => q.bloom_level === filterBloom);
    }
    
    if (filterCourseOutcome) {
      filtered = filtered.filter(q => q.course_outcome_id === filterCourseOutcome);
    }
    
    setFilteredQuestions(filtered);
  }, [questions, activeTab, filterDifficulty, filterBloom, filterCourseOutcome]);
  
  const generateQuestionPaperPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Create a temporary div for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.className = 'pdf-content';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '150mm';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '15mm';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '10px';
      tempDiv.style.lineHeight = '1.3';
      
      // Generate the content
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
          <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Question Paper</h1>
          <p style="color: #666; margin-bottom: 3px; font-size: 10px;">
            ${location.state?.topic ? `Topic: ${location.state.topic}` : 'Generated Questions'}
            ${location.state?.subject?.name ? ` • Subject: ${location.state.subject.name}` : ''}
          </p>
          <p style="font-size: 9px; color: #888; margin-top: 8px;">
            Total Questions: ${filteredQuestions.length} • 
            MCQ: ${filteredQuestions.filter(q => q.question_type === 'MCQ').length} • 
            Theory: ${filteredQuestions.filter(q => q.question_type === 'Theory').length}
          </p>
        </div>
        
        <div style="margin-top: 20px;">
          ${filteredQuestions.map((question, index) => `
            <div style="margin-bottom: 18px; page-break-inside: avoid;">
              <div style="margin-bottom: 8px;">
                <span style="font-weight: bold;">${index + 1}.</span>
                <span style="background: #f3f4f6; padding: 1px 6px; border-radius: 3px; font-size: 9px; margin-left: 6px;">
                  ${question.question_type} • ${question.marks || 1} mark${question.marks > 1 ? 's' : ''}
                </span>
              </div>
              <div style="margin-left: 15px; margin-bottom: 12px;">
                <p style="font-size: 11px; line-height: 1.4;">${question.question_text}</p>
              </div>
              
              ${question.question_type === "MCQ" && question.options ? `
                <div style="margin-left: 15px;">
                  ${question.options.map((option, optIndex) => `
                    <div style="margin-bottom: 6px;">
                      <span style="font-weight: bold;">(${String.fromCharCode(65 + optIndex)})</span>
                      <span style="margin-left: 6px; font-size: 10px;">${option.text}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              ${question.question_type === "Theory" ? `
                <div style="margin-left: 15px;">
                  <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                    <p style="font-size: 9px; color: #666;">Answer space:</p>
                    <div style="border-bottom: 2px solid #d1d5db; height: 20px; margin-top: 3px;"></div>
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
      
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: tempDiv.scrollHeight
      });
      
      document.body.removeChild(tempDiv);
      
      const imgData = canvas.toDataURL('image/png', 0.7); // Compress PNG to 70% quality
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      // Compress the PDF
      const pdfOutput = pdf.output('blob');
      const compressedPdf = new Blob([pdfOutput], { type: 'application/pdf' });
      
      // Create download link for compressed PDF
      const url = URL.createObjectURL(compressedPdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'question-paper.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateAnswerKeyPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Create a temporary div for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.className = 'pdf-content';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '150mm';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '15mm';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '10px';
      tempDiv.style.lineHeight = '1.3';
      
      // Generate the content
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
          <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Answer Key</h1>
          <p style="color: #666; margin-bottom: 3px; font-size: 10px;">
            ${location.state?.topic ? `Topic: ${location.state.topic}` : 'Generated Questions'}
            ${location.state?.subject?.name ? ` • Subject: ${location.state.subject.name}` : ''}
          </p>
          <p style="font-size: 9px; color: #888; margin-top: 8px;">
            Total Questions: ${filteredQuestions.length} • 
            MCQ: ${filteredQuestions.filter(q => q.question_type === 'MCQ').length} • 
            Theory: ${filteredQuestions.filter(q => q.question_type === 'Theory').length}
          </p>
        </div>
        
        <div style="margin-top: 20px;">
          ${filteredQuestions.map((question, index) => `
            <div style="margin-bottom: 18px; page-break-inside: avoid;">
              <div style="margin-bottom: 8px;">
                <span style="font-weight: bold;">${index + 1}.</span>
                <span style="background: #f3f4f6; padding: 1px 6px; border-radius: 3px; font-size: 9px; margin-left: 6px;">
                  ${question.question_type} • ${question.marks || 1} mark${question.marks > 1 ? 's' : ''}
                </span>
              </div>
              <div style="margin-left: 15px; margin-bottom: 12px;">
                <p style="font-size: 11px; line-height: 1.4;">${question.question_text}</p>
              </div>
              
              ${question.question_type === "MCQ" && question.options ? `
                <div style="margin-left: 15px;">
                  <p style="font-weight: bold; color: #059669; margin-bottom: 6px; font-size: 10px;">Correct Answer:</p>
                  ${question.options.filter(option => option.is_correct).map((option, optIndex) => `
                    <div style="margin-bottom: 6px; font-weight: bold; color: #059669;">
                      <span style="font-weight: bold;">(${String.fromCharCode(65 + question.options.findIndex(o => o.text === option.text))})</span>
                      <span style="margin-left: 6px; font-size: 10px;">${option.text}</span>
                      <span style="color: #059669; margin-left: 5px;">✓</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              ${question.question_type === "Theory" && question.answer_text ? `
                <div style="margin-left: 15px;">
                  <p style="font-weight: bold; color: #059669; margin-bottom: 6px; font-size: 10px;">Sample Answer:</p>
                  <div style="background: #f0fdf4; padding: 8px; border-radius: 4px; border: 1px solid #bbf7d0;">
                    <p style="font-size: 9px; line-height: 1.4; color: #065f46; white-space: pre-line;">${question.answer_text}</p>
                  </div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
      
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width in pixels at 96 DPI
        height: tempDiv.scrollHeight
      });
      
      document.body.removeChild(tempDiv);
      
      const imgData = canvas.toDataURL('image/png', 0.7); // Compress PNG to 70% quality
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      // Compress the PDF
      const pdfOutput = pdf.output('blob');
      const compressedPdf = new Blob([pdfOutput], { type: 'application/pdf' });
      
      // Create download link for compressed PDF
      const url = URL.createObjectURL(compressedPdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'answer-key.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExport = () => {
    // Convert the filtered questions to CSV or another format
    const questionData = filteredQuestions.map(q => ({
      type: q.question_type,
      question: q.question_text,
      answer: q.answer_text || "",
      bloom_level: q.bloom_level || "Not specified",
      difficulty: q.difficulty || 0,
      marks: q.marks || (q.question_type === "MCQ" ? 1 : "Not specified"),
      options: q.question_type === "MCQ" ? (q.options?.map(o => `${o.text} ${o.is_correct ? "(Correct)" : ""}`).join(" | ") || "") : "N/A"
    }));
    
    // Create CSV content
    let csvContent = "Type,Question,Answer,Bloom Level,Difficulty,Marks,Options\n";
    questionData.forEach(row => {
      // Escape commas in fields
      const processField = (field) => `"${String(field).replace(/"/g, '""')}"`;
      csvContent += [
        processField(row.type),
        processField(row.question),
        processField(row.answer),
        processField(row.bloom_level),
        processField(row.difficulty),
        processField(row.marks),
        processField(row.options)
      ].join(",") + "\n";
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'generated_questions.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getDifficultyLabel = (difficulty?: number) => {
    if (!difficulty) return "Unknown";
    if (difficulty <= 30) return "Easy";
    if (difficulty <= 70) return "Medium";
    return "Hard";
  };
  
  const getDifficultyColor = (difficulty?: number) => {
    if (!difficulty) return "bg-gray-100 text-gray-800";
    if (difficulty <= 30) return "bg-green-100 text-green-800";
    if (difficulty <= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };
  
  const getBloomColor = (level?: string) => {
    switch(level) {
      case "Remember": return "bg-blue-100 text-blue-800";
      case "Understand": return "bg-indigo-100 text-indigo-800";
      case "Apply": return "bg-purple-100 text-purple-800";
      case "Analyze": return "bg-pink-100 text-pink-800";
      case "Evaluate": return "bg-orange-100 text-orange-800";
      case "Create": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Extract unique bloom levels from questions
  const bloomLevels = Array.from(new Set(questions.filter(q => q.bloom_level).map(q => q.bloom_level)));
  
  // Get unique course outcome IDs and match with course outcomes
  const courseOutcomeIds = Array.from(new Set(questions.filter(q => q.course_outcome_id).map(q => q.course_outcome_id)));
  
  const findCourseOutcomeLabel = (coId?: string) => {
    if (!coId) return "No Course Outcome";
    const outcome = courseOutcomes.find(co => co.id === coId);
    return outcome ? `CO${outcome.display_number}: ${outcome.description.substring(0, 30)}${outcome.description.length > 30 ? '...' : ''}` : "Unknown CO";
  };

  return (
    <div className="space-y-8 animate-page-transition-in">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/question-generation">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Generated Questions</h1>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Question List</CardTitle>
            <CardDescription>
              {location.state?.topic ? (
                <>
                  Topic: {location.state.topic} • 
                  Subject: {location.state.subject?.name || "Unknown"} • 
                  {filteredQuestions.length} questions generated
                </>
              ) : (
                `${filteredQuestions.length} questions generated`
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex gap-1" asChild>
              <Link to="/question-generation/history">
                <History className="h-4 w-4" />
                View History
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="flex gap-1" 
              onClick={generateQuestionPaperPDF}
              disabled={isGeneratingPDF}
            >
              <FileText className="h-4 w-4" />
              {isGeneratingPDF ? "Generating..." : "Question Paper"}
            </Button>
            <Button 
              variant="outline" 
              className="flex gap-1" 
              onClick={generateAnswerKeyPDF}
              disabled={isGeneratingPDF}
            >
              <Key className="h-4 w-4" />
              {isGeneratingPDF ? "Generating..." : "Answer Key"}
            </Button>
            <Button variant="outline" className="flex gap-1" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Questions</TabsTrigger>
                <TabsTrigger value="mcq">MCQ</TabsTrigger>
                <TabsTrigger value="theory">Theory</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Difficulty:</span>
                <Select value={filterDifficulty || ""} onValueChange={(value) => setFilterDifficulty(value || null)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="1">Easy</SelectItem>
                    <SelectItem value="2">Medium</SelectItem>
                    <SelectItem value="3">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {bloomLevels.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Bloom's Level:</span>
                  <Select value={filterBloom || ""} onValueChange={(value) => setFilterBloom(value || null)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      {bloomLevels.filter(level => level).map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {courseOutcomeIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Course Outcome:</span>
                  <Select value={filterCourseOutcome || ""} onValueChange={(value) => setFilterCourseOutcome(value || null)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      {courseOutcomeIds.filter(coId => coId).map(coId => (
                        <SelectItem key={coId} value={coId}>{findCourseOutcomeLabel(coId)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {filteredQuestions.length === 0 ? (
              <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                <AlertDescription>
                  No questions found with the current filters. Try changing your filter criteria.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                {filteredQuestions.map((question, index) => (
                  <Card key={question.id || index} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4 border-b bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{question.question_type}</Badge>
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
                          {question.marks && question.question_type === "Theory" && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                              {question.marks} mark{question.marks > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {question.course_outcome_id ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
                              {findCourseOutcomeLabel(question.course_outcome_id)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                              No Course Outcome
                            </Badge>
                          )}
                        </div>
                        <div className="font-medium">
                          {index + 1}. {question.question_text}
                        </div>
                      </div>
                      
                      {question.question_type === "MCQ" && question.options && (
                        <div className="p-4 space-y-2">
                          {question.options.map((option, optIndex) => (
                            <div 
                              key={optIndex} 
                              className={`flex gap-2 p-2 rounded-md ${
                                option.is_correct 
                                  ? 'bg-green-500/20 dark:bg-green-950 border border-green-500/30' 
                                  : ''
                              }`}
                            >
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                option.is_correct 
                                  ? 'bg-green-500 text-white dark:bg-green-400 dark:text-green-950' 
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                {String.fromCharCode(65 + optIndex)}
                              </div>
                              <div className={option.is_correct ? 'text-green-700 dark:text-green-400' : ''}>{option.text}</div>
                              {option.is_correct && <span className="text-green-600 dark:text-green-400 ml-1">(Correct)</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {question.question_type === "Theory" && question.answer_text && (
                        <div className="p-4">
                          <div className="font-medium mb-2">Sample Answer:</div>
                          <div className="text-gray-700 whitespace-pre-line">{question.answer_text}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      

    </div>
  );
}
