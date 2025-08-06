
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  fetchPapersByTest, 
  fetchPapersBySubject, 
  uploadPaper, 
  extractText, 
  deletePaper,
  linkPaperToTest,
  unlinkPaper
} from "@/services/test-paper-service";
import { TestPaper } from "@/types/test-papers";

export function useTestPapers() {
  const queryClient = useQueryClient();

  // Query hooks
  const usePapersByTest = (testId: string) => {
    return useQuery({
      queryKey: ["test-papers", testId],
      queryFn: () => fetchPapersByTest(testId),
      enabled: !!testId,
    });
  };

  const usePapersBySubject = (subjectId: string) => {
    return useQuery({
      queryKey: ["test-papers", "subject", subjectId],
      queryFn: () => fetchPapersBySubject(subjectId),
      enabled: !!subjectId,
    });
  };

  // Mutation hooks
  const uploadPaperMutation = useMutation({
    mutationFn: uploadPaper,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["test-papers", data.test_id] });
      if (data.subject_id) {
        queryClient.invalidateQueries({ queryKey: ["test-papers", "subject", data.subject_id] });
      }
      toast.success("Paper uploaded successfully");
      return data; // Return data to be used in the callback
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload paper: ${error.message}`);
    },
  });

  const linkPaperToTestMutation = useMutation({
    mutationFn: ({ paperId, testId }: { paperId: string, testId: string }) => 
      linkPaperToTest(paperId, testId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["test-papers", data.test_id] });
      if (data.subject_id) {
        queryClient.invalidateQueries({ queryKey: ["test-papers", "subject", data.subject_id] });
      }
      
      // Try to find and link the corresponding question/answer paper
      const findAndLinkPair = async () => {
        try {
          if (data.subject_id) {
            // Get all papers for this subject
            const papers = await fetchPapersBySubject(data.subject_id);
            
            // Determine if this is a question or answer paper
            const isPaperType = data.paper_type;
            const targetType = isPaperType === "question" ? "answer" : "question";
            
            // Extract base title
            let baseTitle = data.title;
            const questionMatch = baseTitle.match(/^(.*?)\s*-\s*Question Paper$/);
            const answerMatch = baseTitle.match(/^(.*?)\s*-\s*Answer Key$/);
            
            if (questionMatch) {
              baseTitle = questionMatch[1];
            } else if (answerMatch) {
              baseTitle = answerMatch[1];
            }
            
            // Find corresponding pair paper
            const relatedTitle = targetType === "question" 
              ? `${baseTitle} - Question Paper` 
              : `${baseTitle} - Answer Key`;
            
            const pairPaper = papers.find(p => 
              p.title === relatedTitle && 
              p.paper_type === targetType && 
              (!p.test_id || p.test_id !== data.test_id)
            );
            
            // If found, also link this paper
            if (pairPaper) {
              await linkPaperToTest(pairPaper.id, data.test_id!);
              queryClient.invalidateQueries({ queryKey: ["test-papers", data.test_id] });
            }
          }
        } catch (error) {
          console.error("Error auto-linking pair paper:", error);
          // Don't show an error toast as this is an enhancement, not a critical function
        }
      };
      
      // Try to link the pair, but don't block the UI or show errors if it fails
      findAndLinkPair();
    },
    onError: (error: Error) => {
      // Error handling is done in the component
    },
  });

  // Extract text mutation with proper error handling
  const extractTextMutation = useMutation({
    mutationFn: (paperId: string) => extractText(paperId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["test-papers", data.test_id] });
      if (data.subject_id) {
        queryClient.invalidateQueries({ queryKey: ["test-papers", "subject", data.subject_id] });
      }
    },
    onError: (error: Error) => {
      // Error handling is done in the component
    },
  });

  const deletePaperMutation = useMutation({
    mutationFn: (params: { paperId: string, deleteRelated?: boolean }) => 
      deletePaper(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test-papers"] });
      toast.success("Paper deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete paper: ${error.message}`);
    },
  });

  const unlinkPaperMutation = useMutation({
    mutationFn: (params: { paperId: string, testId: string }) => 
      unlinkPaper(params),
    onSuccess: (data) => {
      if (data.test_id) {
        queryClient.invalidateQueries({ queryKey: ["test-papers", data.test_id] });
      }
      if (data.subject_id) {
        queryClient.invalidateQueries({ queryKey: ["test-papers", "subject", data.subject_id] });
      }
    },
    onError: (error: Error) => {
      // Error handling is done in the component
    },
  });

  return {
    usePapersByTest,
    usePapersBySubject,
    uploadPaper: (data: any, options?: any) => uploadPaperMutation.mutate(data, options),
    linkPaperToTest: (data: any, options?: any) => linkPaperToTestMutation.mutate(data, options),
    extractText: (paperId: string, options?: any) => extractTextMutation.mutate(paperId, options),
    deletePaper: deletePaperMutation.mutate,
    unlinkPaper: (data: any, options?: any) => unlinkPaperMutation.mutate(data, options),
    isUploading: uploadPaperMutation.isPending,
    isLinking: linkPaperToTestMutation.isPending,
    isExtracting: extractTextMutation.isPending,
    isDeleting: deletePaperMutation.isPending,
    isUnlinking: unlinkPaperMutation.isPending,
  };
}

// Re-export type for convenience
export type { TestPaper } from "@/types/test-papers";
