import { supabase } from "@/integrations/supabase/client";

interface AnalysisQuestion {
  number: number;
  text: string;
  difficulty: "Easy" | "Medium" | "Hard";
  courseOutcome: string;
  bloomsLevel: string;
}

interface BloomsDistribution {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

interface CourseOutcomeDistribution {
  [key: string]: number;
}

interface DifficultyDistribution {
  easy: number;
  medium: number;
  hard: number;
}

export interface PaperAnalysis {
  totalQuestions: number;
  questions: AnalysisQuestion[];
  bloomsDistribution: BloomsDistribution;
  courseOutcomeDistribution: CourseOutcomeDistribution;
  difficultyDistribution: DifficultyDistribution;
  bloomsLevelsCovered: number;
  totalBloomsLevels: number;
  courseOutcomesCovered: number;
  totalCourseOutcomes: number;
  summary: {
    bloomsAnalysis: string;
    courseOutcomeCoverage: string;
    difficultyDistribution: string;
  };
  suggestions: {
    improvements: string[];
    recommendations: string[];
  };
}

export async function analyzePaper(
  paperId: string, 
  paperText: string, 
  courseOutcomes: { id: string; description: string }[]
) {
  try {
    // Create initial analysis record
    const { data: paper } = await supabase
      .from("test_papers")
      .select("title")
      .eq("id", paperId)
      .single();

    if (!paper) throw new Error("Paper not found");

    const { data: analysisRecord, error: recordError } = await supabase
      .from("analysis_history")
      .insert({
        title: `Analysis of ${paper.title}`,
        paper_id: paperId,
        status: "processing"
      })
      .select()
      .single();

    if (recordError) {
      throw new Error(`Failed to create analysis record: ${recordError.message}`);
    }

    // Call OpenAI for analysis through edge function
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
      "analyze-paper",
      {
        body: {
          analysisId: analysisRecord.id,
          paperText,
          courseOutcomes,
          title: paper.title
        }
      }
    );

    if (analysisError) {
      throw new Error(`Analysis failed: ${analysisError.message}`);
    }

    if (!analysisData.success) {
      throw new Error(analysisData.error || "Unknown error during analysis");
    }

    // Update analysis record with results
    const { error: updateError } = await supabase
      .from("analysis_history")
      .update({
        status: "completed",
        analysis_data: analysisData.analysis,
        completed_at: new Date().toISOString()
      })
      .eq("id", analysisRecord.id);

    if (updateError) {
      throw new Error(`Failed to update analysis: ${updateError.message}`);
    }

    return {
      analysisId: analysisRecord.id,
      analysis: analysisData.analysis as PaperAnalysis
    };
  } catch (error) {
    console.error("Error analyzing paper:", error);
    throw error;
  }
}

export async function generatePDFReport(analysisId: string) {
  try {
    // Get analysis data
    const { data: analysis, error: fetchError } = await supabase
      .from("analysis_history")
      .select("*, test_papers(*)")
      .eq("id", analysisId)
      .single();

    if (fetchError || !analysis) {
      throw new Error(fetchError?.message || "Analysis not found");
    }

    // Generate PDF through edge function
    const { data: reportData, error } = await supabase.functions.invoke(
      "generate-analysis-report",
      {
        body: { 
          analysisId,
          analysis: analysis.analysis_data,
          paperTitle: analysis.test_papers?.title || "Unknown Paper"
        }
      }
    );

    if (error) {
      throw new Error(`Failed to generate PDF report: ${error.message}`);
    }

    if (!reportData.success) {
      throw new Error(reportData.error || "Failed to generate report");
    }

    // Convert base64 PDF to blob and trigger download
    const pdfBlob = await fetch(`data:application/pdf;base64,${reportData.pdf}`).then(r => r.blob());
    const url = URL.createObjectURL(pdfBlob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis_report_${analysisId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Error generating PDF report:", error);
    throw error;
  }
}

export async function getAnalysisHistory(paperId: string) {
  const { data, error } = await supabase
    .from("analysis_history")
    .select("*")
    .eq("paper_id", paperId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch analysis history: ${error.message}`);
  }

  return data;
} 