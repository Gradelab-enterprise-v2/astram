
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, BarChart, PieChart, FileSearch, LightbulbIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuestionAnalysis {
  questionNumber: number;
  questionText: string;
  difficulty: string;
  courseOutcome: string;
  bloomsLevel: string;
}

interface ImprovementSuggestion {
  title: string;
  description: string;
}

interface PaperAnalysis {
  totalQuestions: number;
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
  bloomsDistribution: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
    create: number;
  };
  courseOutcomeDistribution: Record<string, number>;
  questionAnalysis: QuestionAnalysis[];
  analysisDetails: {
    bloomsAnalysis: string;
    courseOutcomeCoverage: string;
    difficultyDistribution: string;
  };
  improvementSuggestions: ImprovementSuggestion[];
}

interface PaperAnalysisReportProps {
  analysis: PaperAnalysis;
  title: string;
}

export function PaperAnalysisReport({ analysis, title }: PaperAnalysisReportProps) {
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Get total Bloom's levels covered out of 6
  const totalBloomsLevels = Object.values(analysis.bloomsDistribution).filter(v => v > 0).length;
  
  // Get total course outcomes covered
  const totalCourseOutcomes = Object.keys(analysis.courseOutcomeDistribution).length;

  // Filter questions based on difficulty and search query
  const filteredQuestions = analysis.questionAnalysis.filter(q => {
    const matchesDifficulty = filterDifficulty === "all" || 
      q.difficulty.toLowerCase() === filterDifficulty.toLowerCase();
    
    const matchesSearch = searchQuery === "" || 
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesDifficulty && matchesSearch;
  });

  // Helper function to get appropriate badge color for difficulty
  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Helper function to get appropriate badge color for Bloom's level
  const getBloomsBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "remember": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "understand": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "apply": return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400";
      case "analyze": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "evaluate": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "create": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Paper Analysis Report</h1>
        <p className="text-muted-foreground">
          Comprehensive analysis of exam paper with Bloom's Taxonomy and Course Outcome mapping
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-4" />
            <h2 className="text-4xl font-bold">{analysis.totalQuestions}</h2>
            <p className="text-muted-foreground">Total Questions</p>
            <p className="text-sm mt-2">
              {analysis.difficultyBreakdown.easy} Easy, {analysis.difficultyBreakdown.medium} Medium, {analysis.difficultyBreakdown.hard} Hard
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <BarChart className="h-8 w-8 text-muted-foreground mb-4" />
            <h2 className="text-4xl font-bold">{totalBloomsLevels}/6</h2>
            <p className="text-muted-foreground">Bloom's Taxonomy Coverage</p>
            <p className="text-sm mt-2">
              Levels covered out of 6 Bloom's levels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <PieChart className="h-8 w-8 text-muted-foreground mb-4" />
            <h2 className="text-4xl font-bold">{totalCourseOutcomes}/{totalCourseOutcomes}</h2>
            <p className="text-muted-foreground">Course Outcomes Mapped</p>
            <p className="text-sm mt-2">
              COs covered out of {totalCourseOutcomes} Course Outcomes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Bloom's Taxonomy Distribution</h3>
            <p className="text-sm text-muted-foreground mb-6">Distribution of questions across Bloom's cognitive levels</p>
            
            <div className="relative">
              {/* This would be a chart component in a real implementation */}
              <div className="flex flex-col space-y-4">
                {Object.entries(analysis.bloomsDistribution).map(([level, percentage]) => (
                  <div key={level} className="flex items-center">
                    <div className="w-32 font-medium capitalize">{level}:</div>
                    <div className="w-full bg-muted rounded-full h-4 mr-2">
                      <div 
                        className={`h-4 rounded-full ${getBloomsBadgeColor(level).replace('bg-', 'bg-').replace('text-', '')}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-right">{percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Course Outcome Distribution</h3>
            <p className="text-sm text-muted-foreground mb-6">Distribution of questions mapped to course outcomes</p>
            
            <div className="relative">
              {/* This would be a chart component in a real implementation */}
              <div className="flex flex-col space-y-4">
                {Object.entries(analysis.courseOutcomeDistribution).map(([co, percentage]) => (
                  <div key={co} className="flex items-center">
                    <div className="w-32 font-medium">{co}:</div>
                    <div className="w-full bg-muted rounded-full h-4 mr-2">
                      <div 
                        className={`h-4 rounded-full bg-blue-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-right">{percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Question Analysis</h3>
        <p className="text-muted-foreground mb-4">Detailed analysis of all questions with their attributes</p>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-56">
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3.5 text-left text-sm font-semibold text-muted-foreground">Q.No</th>
                  <th className="px-4 py-3.5 text-left text-sm font-semibold text-muted-foreground">Question</th>
                  <th className="px-4 py-3.5 text-left text-sm font-semibold text-muted-foreground">Difficulty</th>
                  <th className="px-4 py-3.5 text-left text-sm font-semibold text-muted-foreground">Course Outcome</th>
                  <th className="px-4 py-3.5 text-left text-sm font-semibold text-muted-foreground">Bloom's Taxonomy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {filteredQuestions.map((question) => (
                  <tr key={question.questionNumber} className="hover:bg-muted/50">
                    <td className="px-4 py-4 text-sm">{question.questionNumber}</td>
                    <td className="px-4 py-4 text-sm max-w-md">{question.questionText}</td>
                    <td className="px-4 py-4 text-sm">
                      <Badge 
                        variant="outline"
                        className={getDifficultyBadgeColor(question.difficulty)}
                      >
                        {question.difficulty}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm">{question.courseOutcome}</td>
                    <td className="px-4 py-4 text-sm">
                      <Badge 
                        variant="outline"
                        className={getBloomsBadgeColor(question.bloomsLevel)}
                      >
                        {question.bloomsLevel}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Analysis Details</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-6 mt-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Paper Analysis Summary</h3>
            <p className="text-muted-foreground mb-6">Detailed analysis of the examination paper</p>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <BarChart className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <h4 className="font-semibold mb-2">Bloom's Taxonomy Analysis</h4>
                  <p className="text-muted-foreground">{analysis.analysisDetails.bloomsAnalysis}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <PieChart className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <h4 className="font-semibold mb-2">Course Outcome Coverage</h4>
                  <p className="text-muted-foreground">{analysis.analysisDetails.courseOutcomeCoverage}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <FileSearch className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <h4 className="font-semibold mb-2">Difficulty Distribution</h4>
                  <p className="text-muted-foreground">{analysis.analysisDetails.difficultyDistribution}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="suggestions" className="space-y-6 mt-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Improvement Suggestions</h3>
            <p className="text-muted-foreground mb-6">Recommendations to enhance the quality of the examination paper</p>
            
            <div className="space-y-4">
              {analysis.improvementSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                  <LightbulbIcon className="h-5 w-5 mt-0.5 text-amber-500" />
                  <div>
                    <h4 className="font-semibold mb-2">{suggestion.title}</h4>
                    <p className="text-muted-foreground">{suggestion.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
