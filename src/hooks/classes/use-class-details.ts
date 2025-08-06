import { useState, useEffect, useCallback } from "react";
import { useClasses } from "@/hooks/use-classes";
import { useSubjects } from "@/hooks/use-subjects";
import { useStudents } from "@/hooks/use-students";
import { toast } from "sonner";
import { Class, Subject, Student } from "@/types/academics";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export function useClassDetails(classId: string | undefined) {
  const { getClassById, deleteClass, isDeleting } = useClasses();
  const { getSubjectsByClassId } = useSubjects();
  const { fetchStudentsByClass } = useStudents();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [classData, setClassData] = useState<Class | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isDataFetched, setIsDataFetched] = useState(false); // Flag to track if data has been fetched successfully

  const loadClassDetails = useCallback(async (retryCount = 0) => {
    if (!classId || isDataFetched) return; // Skip if already fetched successfully
    
    const MAX_RETRIES = 3;

    try {
      setLoading(true);
      setLoadError(false);
      setError(null);
      
      if (classId === "new") return;
      
      // Fetch all data in parallel for better performance
      const classDetails = await getClassById(classId);
      
      if (!classDetails) {
        console.error("Class not found for ID:", classId);
        toast.error("Class not found");
        setLoadError(true);
        setLoading(false);
        return;
      }
      
      // Only fetch subjects and students if we have a valid class
      const [classSubjects, classStudents] = await Promise.all([
        getSubjectsByClassId(classId),
        fetchStudentsByClass(classId)
      ]);
      
      // Update state with all fetched data
      setClassData(classDetails);
      setSubjects(classSubjects || []);
      setStudents(classStudents || []);
      setIsDataFetched(true); // Mark data as fetched successfully
      setLoading(false);
      
    } catch (err: any) {
      console.error("Error loading class details:", err);
      setError(err.message || "Failed to load class details");
      
      // Retry the operation with increasing delay
      if (retryCount < MAX_RETRIES) {
        const delay = 1000 * (retryCount + 1);
        toast.info(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => loadClassDetails(retryCount + 1), delay);
      } else {
        setLoadError(true);
        setLoading(false);
      }
    }
  }, [classId, getClassById, getSubjectsByClassId, fetchStudentsByClass, isDataFetched]);

  // Function to handle retry - reset isDataFetched to allow refetching
  const handleRetry = () => {
    setIsDataFetched(false);
    loadClassDetails();
  };
  
  // Function to refresh subject data without reloading everything
  const refreshSubjects = useCallback(async () => {
    if (!classId) return;
    
    try {
      const updatedSubjects = await getSubjectsByClassId(classId);
      setSubjects(updatedSubjects || []);
    } catch (err: any) {
      console.error("Error refreshing subjects:", err);
      toast.error("Failed to refresh subjects");
    }
  }, [classId, getSubjectsByClassId]);
  
  // Function to handle class deletion with navigation
  const handleDeleteClass = useCallback(() => {
    if (!classId) return;
    
    deleteClass(classId, {
      onSuccess: () => {
        toast.success("Class deleted successfully");
        // Invalidate all relevant queries to ensure data consistency
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["classes"] }),
          queryClient.invalidateQueries({ queryKey: ["students"] }),
          queryClient.invalidateQueries({ queryKey: ["students", "without-class"] }),
          queryClient.invalidateQueries({ queryKey: ["subjects"] }),
          queryClient.invalidateQueries({ queryKey: ["class-subjects"] })
        ]).then(() => {
          navigate('/classes');
        });
      },
      onError: (error: Error) => {
        toast.error(`Failed to delete class: ${error.message}`);
      },
    });
  }, [classId, deleteClass, queryClient, navigate]);

  return { 
    classData, 
    subjects, 
    students, 
    loading, 
    error, 
    loadError,
    loadClassDetails,
    refreshSubjects,
    handleRetry, 
    handleDeleteClass,
    isDeleting,
    isDataFetched
  };
}
