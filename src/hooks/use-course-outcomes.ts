
import { useState, useEffect } from "react";
import { CourseOutcome } from "@/types/academics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCourseOutcomes(subjectId: string | undefined) {
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCourseOutcomes = async () => {
    if (!subjectId) {
      setCourseOutcomes([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('course_outcomes')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at');
        
      if (error) {
        throw new Error(`Error fetching course outcomes: ${error.message}`);
      }
      
      // Transform data to include display_number for proper CO labeling
      const transformedData = data ? data.map((outcome, index) => ({
        ...outcome,
        display_number: index + 1
      })) : [];
      
      setCourseOutcomes(transformedData);
    } catch (err) {
      console.error('Error fetching course outcomes:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const addCourseOutcome = async (description: string) => {
    if (!subjectId || !description.trim()) {
      toast.error("Subject ID and description are required");
      return;
    }
    
    setIsAdding(true);
    
    try {
      const { data, error } = await supabase
        .from('course_outcomes')
        .insert({
          subject_id: subjectId,
          description: description.trim()
        })
        .select();
        
      if (error) {
        throw new Error(`Error adding course outcome: ${error.message}`);
      }
      
      toast.success("Course outcome added successfully");
      await fetchCourseOutcomes(); // Refresh the list
    } catch (err) {
      console.error('Error adding course outcome:', err);
      toast.error("Failed to add course outcome");
    } finally {
      setIsAdding(false);
    }
  };

  const deleteCourseOutcome = async (outcomeId: string) => {
    if (!outcomeId) {
      toast.error("Outcome ID is required");
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('course_outcomes')
        .delete()
        .eq('id', outcomeId);
        
      if (error) {
        throw new Error(`Error deleting course outcome: ${error.message}`);
      }
      
      toast.success("Course outcome deleted successfully");
      await fetchCourseOutcomes(); // Refresh the list
    } catch (err) {
      console.error('Error deleting course outcome:', err);
      toast.error("Failed to delete course outcome");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (subjectId) {
      fetchCourseOutcomes();
    }
  }, [subjectId]);

  return { 
    courseOutcomes, 
    isLoading, 
    error, 
    addCourseOutcome, 
    deleteCourseOutcome,
    isAdding,
    isDeleting,
    refreshOutcomes: fetchCourseOutcomes
  };
}
