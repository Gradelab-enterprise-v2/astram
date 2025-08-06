import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaperAnalysis } from "@/services/paper-analysis";
import { generatePDFReport } from "@/services/paper-analysis";
import { toast } from "sonner";

interface PaperAnalysisReportProps {
  analysis: PaperAnalysis;
  title: string;
}

export function PaperAnalysisReport({ analysis, title }: PaperAnalysisReportProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [difficultyFilter, setDifficultyFilter] = React.useState("all");

  const filteredQuestions = React.useMemo(() => {
    return analysis.questions.filter(q => {
      const matchesSearch = q.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = difficultyFilter === "all" || q.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
      return matchesSearch && matchesDifficulty;
    });
  }, [analysis.questions, searchQuery, difficultyFilter]);

  const handleDownloadReport = async () => {
    try {
      await generatePDFReport(analysis.analysisId);
      toast.success("Report downloaded successfully");
    } catch (error) {
      toast.error("Failed to download report");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Button onClick={handleDownloadReport}>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.totalQuestions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.difficultyDistribution.easy} Easy, {analysis.difficultyDistribution.medium} Medium, {analysis.difficultyDistribution.hard} Hard
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bloom's Taxonomy Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.bloomsLevelsCovered}/{analysis.totalBloomsLevels}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Levels covered out of {analysis.totalBloomsLevels} Bloom's levels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Course Outcomes Mapped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.courseOutcomesCovered}/{analysis.totalCourseOutcomes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              COs covered out of {analysis.totalCourseOutcomes} Course Outcomes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Difficulty Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-xs">
              <span>Easy: {Math.round(analysis.difficultyDistribution.easy / analysis.totalQuestions * 100)}%</span>
              <span>Medium: {Math.round(analysis.difficultyDistribution.medium / analysis.totalQuestions * 100)}%</span>
              <span>Hard: {Math.round(analysis.difficultyDistribution.hard / analysis.totalQuestions * 100)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bloom's Taxonomy Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(analysis.bloomsDistribution).map(([level, percentage]) => (
                <div key={level} className="flex justify-between items-center">
                  <span className="capitalize">{level}</span>
                  <div className="w-2/3 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span>{Math.round(percentage)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(analysis.courseOutcomeDistribution).map(([co, percentage]) => (
                <div key={co} className="flex justify-between items-center">
                  <span>{co}</span>
                  <div className="w-2/3 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span>{Math.round(percentage)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Analysis</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-secondary">
                <tr>
                  <th className="px-4 py-2">Q.No</th>
                  <th className="px-4 py-2">Question</th>
                  <th className="px-4 py-2">Difficulty</th>
                  <th className="px-4 py-2">Course Outcome</th>
                  <th className="px-4 py-2">Bloom's Taxonomy</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((question) => (
                  <tr key={question.number} className="border-b">
                    <td className="px-4 py-3">{question.number}</td>
                    <td className="px-4 py-3">{question.text}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        question.difficulty === "Easy" ? "bg-green-100 text-green-800" :
                        question.difficulty === "Medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {question.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">{question.courseOutcome}</td>
                    <td className="px-4 py-3">{question.bloomsLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList>
          <TabsTrigger value="analysis">Analysis Details</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paper Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Bloom's Taxonomy Analysis</h3>
                <p className="text-sm text-muted-foreground">{analysis.summary.bloomsAnalysis}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Course Outcome Coverage</h3>
                <p className="text-sm text-muted-foreground">{analysis.summary.courseOutcomeCoverage}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Difficulty Distribution</h3>
                <p className="text-sm text-muted-foreground">{analysis.summary.difficultyDistribution}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Improvement Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {analysis.suggestions.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    <p className="text-sm text-muted-foreground">{improvement}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {analysis.suggestions.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    <p className="text-sm text-muted-foreground">{recommendation}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
