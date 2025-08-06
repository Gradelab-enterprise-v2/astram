
import { useQuery } from "@tanstack/react-query";
import { fetchSubjects, getSubjectsByClassId } from "./subject-api";
import { Subject } from "@/types/academics";
import { toast } from "sonner";

export function useSubjectQueries() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Add a function to get subjects by class ID
  const useSubjectsByClass = (classId: string) => {
    return useQuery({
      queryKey: ["subjects", "by-class", classId],
      queryFn: () => getSubjectsByClassId(classId),
      enabled: !!classId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      meta: {
        onError: (error: Error) => {
          console.error(`Error loading subjects for class ${classId}:`, error);
          toast.error(`Failed to load subjects: ${error.message}`);
        }
      }
    });
  };

  return {
    subjects: data || [],
    isLoading,
    error: error as Error,
    refetchSubjects: refetch,
    useSubjectsByClass // Export the new hook
  };
}
