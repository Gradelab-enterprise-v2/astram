
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Clock, BarChart, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";

interface AnalysisHistoryItem {
  id: string;
  title: string;
  created_at: string;
  status: string;
  file_url: string;
  bloomsdata: {
    knowledge?: number;
    comprehension?: number;
    application?: number;
    analysis?: number;
    synthesis?: number;
    evaluation?: number;
    totalQuestions?: number;
    // New Bloom's taxonomy fields
    remember?: number;
    understand?: number;
    apply?: number;
    analyze?: number;
    evaluate?: number;
    create?: number;
  } | null;
}

export default function AnalyticsHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysisHistory = async () => {
      setLoading(true);
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("analysis_history")
          .select("id, title, created_at, bloomsdata, status, file_url")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const formattedData: AnalysisHistoryItem[] = data.map(item => ({
          id: item.id,
          title: item.title,
          created_at: new Date(item.created_at).toLocaleString(),
          status: item.status,
          file_url: item.file_url,
          bloomsdata: item.bloomsdata as AnalysisHistoryItem['bloomsdata']
        }));

        setAnalysisHistory(formattedData);
      } catch (error) {
        console.error("Error fetching analysis history:", error);
        toast.error("Failed to load analysis history");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisHistory();
  }, [user]);

  const handleDownloadReport = (id: string) => {
    console.log(`Downloading report for analysis ${id}`);
    toast.info("Report download feature is coming soon!");
    // In a real application, this would trigger a download
  };

  const handleViewAnalysis = (fileUrl: string) => {
    if (!fileUrl) {
      toast.error("Analysis reference not found");
      return;
    }
    
    navigate(`/analytics/report/${fileUrl}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Processing</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Unknown</Badge>;
    }
  };

  // Get quick summary of the analysis
  const getAnalysisSummary = (item: AnalysisHistoryItem) => {
    if (item.status !== "completed" || !item.bloomsdata) {
      return "No analysis data available";
    }

    const bloomsData = item.bloomsdata;
    const totalQuestions = bloomsData.totalQuestions || 0;
    
    let questionSummary = `${totalQuestions} questions analyzed`;
    
    // Extract highest Bloom's level - handle both old and new terminology
    if (bloomsData) {
      const bloomsLevels = {
        remember: bloomsData.knowledge || bloomsData.remember || 0,
        understand: bloomsData.comprehension || bloomsData.understand || 0,
        apply: bloomsData.application || bloomsData.apply || 0,
        analyze: bloomsData.analysis || bloomsData.analyze || 0,
        evaluate: bloomsData.evaluation || bloomsData.evaluate || 0,
        create: bloomsData.synthesis || bloomsData.create || 0
      };
      
      const highestLevel = Object.entries(bloomsLevels)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, value]) => value > 0)[0];
        
      if (highestLevel) {
        const [levelName, percentage] = highestLevel;
        questionSummary += ` • ${percentage}% ${levelName.charAt(0).toUpperCase() + levelName.slice(1)} level`;
      }
    }
    
    return questionSummary;
  };

  return (
    <div className="space-y-6 animate-page-transition-in">
      <div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => navigate("/analytics")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analysis
        </Button>
      </div>

      <h1 className="text-3xl font-bold">Analysis History</h1>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : analysisHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No analysis history found</h3>
          <p className="text-muted-foreground mb-6">
            Start analyzing papers to see your analysis history here
          </p>
          <Button
            onClick={() => navigate("/analytics")}
            variant="default"
          >
            Start Analyzing Papers
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {analysisHistory.map((analysis) => (
            <Card key={analysis.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{analysis.title}</h2>
                      {getStatusBadge(analysis.status)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{analysis.created_at}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-2"
                      onClick={() => handleDownloadReport(analysis.id)}
                      disabled={analysis.status !== "completed"}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="gap-2"
                      onClick={() => handleViewAnalysis(analysis.file_url)}
                      disabled={analysis.status !== "completed"}
                    >
                      <BarChart className="h-4 w-4" />
                      View Report
                    </Button>
                  </div>
                </div>
                
                <div className="pt-2">
                  {analysis.status === "failed" ? (
                    <div className="flex items-center text-red-500 text-sm">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <span>Analysis failed. Please try again.</span>
                    </div>
                  ) : analysis.status === "processing" ? (
                    <div className="flex items-center text-blue-500 text-sm">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Analysis in progress...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {getAnalysisSummary(analysis)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
