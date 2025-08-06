import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileCheck, BarChart } from "lucide-react";
import { useCourseOutcomes } from "@/hooks/use-course-outcomes";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { analyzePaper } from "@/services/paper-analysis";
import { supabase } from "@/integrations/supabase/client";

interface PaperAnalysisButtonProps {
  paperId: string;
  paperTitle: string;
  subjectId: string;
  extractedText?: string;
  hasExtractedText: boolean;
}

export function PaperAnalysisButton({
  paperId,
  paperTitle,
  subjectId,
  extractedText,
  hasExtractedText
}: PaperAnalysisButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasReport, setHasReport] = useState(false);
  const { courseOutcomes, isLoading: isLoadingOutcomes } = useCourseOutcomes(subjectId);
  const navigate = useNavigate();

  // Check if analysis already exists
  useEffect(() => {
    const checkAnalysis = async () => {
      try {
        const { data } = await supabase
          .from("analysis_history")
          .select("id")
          .eq("paper_id", paperId)
          .eq("status", "completed")
          .maybeSingle();
        
        setHasReport(!!data);
      } catch (error) {
        console.error("Error checking analysis:", error);
      }
    };
    
    if (paperId) {
      checkAnalysis();
    }
  }, [paperId]);

  const handleAnalyze = async () => {
    if (!extractedText) {
      toast.error("No text content available for analysis.");
      return;
    }

    if (isLoadingOutcomes) {
      toast.warning("Loading course outcomes. Please wait a moment.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setProgress(10);

      // Start analysis
      setProgress(30);
      const { analysisId, analysis } = await analyzePaper(
        paperId,
        extractedText,
        courseOutcomes
      );

      setProgress(100);
      toast.success("Analysis completed successfully");
      setHasReport(true);
      
      // Add a slight delay so the user can see the completed progress
      setTimeout(() => {
        navigate(`/analytics/report/${analysisId}`);
      }, 1000);
    } catch (error) {
      console.error("Error analyzing paper:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze paper");
    } finally {
      if (progress < 100) {
        setIsAnalyzing(false);
        setProgress(0);
      }
    }
  };

  const handleViewReport = async () => {
    try {
      const { data: analysis } = await supabase
        .from("analysis_history")
        .select("id")
        .eq("paper_id", paperId)
        .eq("status", "completed")
        .single();

      if (analysis) {
        navigate(`/analytics/report/${analysis.id}`);
      } else {
        toast.error("Analysis report not found");
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
      toast.error("Failed to load analysis report");
    }
  };

  if (isAnalyzing) {
    return (
      <div className="w-full space-y-2">
        <Progress value={progress} className="h-2" />
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyzing Paper...
        </Button>
      </div>
    );
  }

  if (hasReport) {
    return (
      <Button className="w-full" onClick={handleViewReport}>
        <BarChart className="mr-2 h-4 w-4" />
        View Report
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleAnalyze} 
      className="w-full" 
      disabled={!extractedText || isLoadingOutcomes}
    >
      <FileCheck className="mr-2 h-4 w-4" />
      Analyze Paper
    </Button>
  );
}
