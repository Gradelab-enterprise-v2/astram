
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaperAnalysisReport } from "@/components/analysis/PaperAnalysisReport";

export default function PaperReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<any>(null);
  const [title, setTitle] = useState("Paper Analysis");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!id) {
          throw new Error("No paper ID provided");
        }
        
        const { data, error } = await supabase
          .from("analysis_history")
          .select("title, bloomsdata, status")
          .eq("file_url", id)
          .eq("status", "completed")
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          throw new Error("Analysis not found or not completed");
        }
        
        setTitle(data.title);
        
        // Transform data if needed
        let analysisData = data.bloomsdata;
        
        // Legacy format compatibility check
        if (analysisData && !analysisData.totalQuestions && 
            (analysisData.knowledge !== undefined || 
             analysisData.comprehension !== undefined || 
             analysisData.application !== undefined)) {
          
          // Transform old format to new format
          analysisData = {
            totalQuestions: 10, // Placeholder
            difficultyBreakdown: {
              easy: 30,
              medium: 50,
              hard: 20
            },
            bloomsDistribution: {
              remember: analysisData.knowledge || 0,
              understand: analysisData.comprehension || 0,
              apply: analysisData.application || 0,
              analyze: analysisData.analysis || 0,
              evaluate: analysisData.evaluation || 0,
              create: analysisData.synthesis || 0
            },
            courseOutcomeDistribution: {
              "CO1": 40,
              "CO2": 30,
              "CO3": 30
            },
            questionAnalysis: [
              // Generate placeholder data
              ...Array(10).fill(0).map((_, i) => ({
                questionNumber: i + 1,
                questionText: `Question ${i + 1}`,
                difficulty: ["easy", "medium", "hard"][Math.floor(Math.random() * 3)],
                courseOutcome: `CO${Math.floor(Math.random() * 3) + 1}`,
                bloomsLevel: ["remember", "understand", "apply", "analyze", "evaluate", "create"][Math.floor(Math.random() * 6)]
              }))
            ],
            analysisDetails: {
              bloomsAnalysis: "This paper focuses primarily on knowledge and comprehension questions.",
              courseOutcomeCoverage: "The paper covers multiple course outcomes with a good balance.",
              difficultyDistribution: "The paper has a moderate difficulty level with a balanced distribution."
            },
            improvementSuggestions: [
              {
                title: "Improve Higher Order Thinking",
                description: "Add more questions from higher Bloom's levels like analysis, evaluation, and creation."
              },
              {
                title: "Balance Course Outcomes",
                description: "Ensure more even coverage of all course outcomes."
              }
            ]
          };
        }
        
        setAnalysis(analysisData);
      } catch (err) {
        console.error("Error fetching analysis:", err);
        setError(err.message || "An error occurred while fetching the analysis");
        toast.error("Failed to load analysis report");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [id]);

  return (
    <div className="space-y-6">
      <div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => navigate("/analytics/history")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Button>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h3 className="text-xl font-medium">Loading Analysis Report...</h3>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-900/20">
          <h3 className="text-xl font-medium text-red-800 dark:text-red-300 mb-2">Error Loading Report</h3>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button
            variant="default"
            className="mt-4"
            onClick={() => navigate("/analytics")}
          >
            Return to Analytics
          </Button>
        </div>
      ) : !analysis ? (
        <div className="rounded-lg border p-6 text-center">
          <h3 className="text-xl font-medium mb-2">No Analysis Data Available</h3>
          <p className="text-muted-foreground">This paper hasn't been analyzed yet or the analysis is still in progress.</p>
          <Button
            variant="default"
            className="mt-4"
            onClick={() => navigate("/analytics")}
          >
            Go to Analysis
          </Button>
        </div>
      ) : (
        <PaperAnalysisReport analysis={analysis} title={title} />
      )}
    </div>
  );
}
