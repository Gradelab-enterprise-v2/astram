import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GeneratedQuestion } from "@/types/academics";
import { toast } from "sonner";

export function useQuestionBank() {
  const queryClient = useQueryClient();

  const fetchQuestions = async (): Promise<GeneratedQuestion[]> => {
    console.log("Fetching questions from database...");
    const { data, error } = await supabase
      .from("generated_questions")
      .select("*, subject:subjects(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching questions:", error);
      throw new Error(error.message);
    }

    console.log(`Fetched ${data?.length || 0} questions from database`);

    // Cast the question_type to ensure it matches the expected type
    return (data || []).map(question => ({
      ...question,
      question_type: question.question_type as "MCQ" | "Theory",
      options: question.options as any // Cast options to the appropriate type
    }));
  };

  const getQuestionById = async (id: string): Promise<GeneratedQuestion> => {
    const { data, error } = await supabase
      .from("generated_questions")
      .select("*, subject:subjects(*)")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Cast the question_type to ensure it matches the expected type
    return {
      ...data,
      question_type: data.question_type as "MCQ" | "Theory",
      options: data.options as any // Cast options to the appropriate type
    };
  };

  const createQuestion = async (question: Omit<GeneratedQuestion, "id" | "created_at" | "updated_at" | "subject">): Promise<GeneratedQuestion> => {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("generated_questions")
      .insert({
        ...question,
        user_id: userData.user?.id
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Cast the question_type to ensure it matches the expected type
    return {
      ...data,
      question_type: data.question_type as "MCQ" | "Theory",
      options: data.options as any // Cast options to the appropriate type
    };
  };

  const updateQuestion = async ({ id, ...question }: Partial<GeneratedQuestion> & { id: string }): Promise<GeneratedQuestion> => {
    const { data, error } = await supabase
      .from("generated_questions")
      .update(question)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Cast the question_type to ensure it matches the expected type
    return {
      ...data,
      question_type: data.question_type as "MCQ" | "Theory",
      options: data.options as any // Cast options to the appropriate type
    };
  };

  const deleteQuestion = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("generated_questions")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }
  };

  const deleteQuestions = async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    
    const { error } = await supabase
      .from("generated_questions")
      .delete()
      .in("id", ids);

    if (error) {
      throw new Error(error.message);
    }
  };

  const createQuestions = async (questions: Omit<GeneratedQuestion, "id" | "created_at" | "updated_at" | "subject">[]): Promise<GeneratedQuestion[]> => {
    if (!questions || questions.length === 0) {
      throw new Error("No questions provided for creation");
    }
    
    console.log(`Creating ${questions.length} questions in the database`);
    
    const { data: userData } = await supabase.auth.getUser();
    
    const questionsWithUserId = questions.map(q => ({
      ...q,
      user_id: userData.user?.id
    }));
    
    const { data, error } = await supabase
      .from("generated_questions")
      .insert(questionsWithUserId)
      .select();

    if (error) {
      console.error("Error creating questions:", error);
      throw new Error(`Failed to create questions: ${error.message}`);
    }

    console.log(`Successfully created ${data?.length || 0} questions in database`);

    return (data || []).map(question => ({
      ...question,
      question_type: question.question_type as "MCQ" | "Theory",
      options: question.options as any
    }));
  };

  // Get questions by topic and subject (for history view)
  const getQuestionsByTopic = async (topic: string, subjectId: string): Promise<GeneratedQuestion[]> => {
    console.log(`Fetching questions for topic: ${topic}, subject: ${subjectId}`);
    
    const { data, error } = await supabase
      .from("generated_questions")
      .select("*, subject:subjects(*)")
      .eq("topic", topic)
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching questions by topic:", error);
      throw new Error(error.message);
    }

    console.log(`Fetched ${data?.length || 0} questions for topic: ${topic}`);

    return (data || []).map(question => ({
      ...question,
      question_type: question.question_type as "MCQ" | "Theory",
      options: question.options as any
    }));
  };

  // Get question generation sessions (grouped by topic and subject)
  const getQuestionSessions = async (): Promise<Array<{
    id: string;
    topic: string;
    subject: string;
    subjectId: string;
    count: number;
    lastGenerated: Date;
    questions: GeneratedQuestion[];
  }>> => {
    console.log("Fetching question generation sessions...");
    
    const { data, error } = await supabase
      .from("generated_questions")
      .select("*, subject:subjects(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching question sessions:", error);
      throw new Error(error.message);
    }

    // Group questions by topic and subject
    const sessionsMap = new Map<string, {
      id: string;
      topic: string;
      subject: string;
      subjectId: string;
      count: number;
      lastGenerated: Date;
      questions: GeneratedQuestion[];
    }>();

    (data || []).forEach(question => {
      const topic = question.topic || "Unnamed Topic";
      const subject = question.subject?.name || "Unassigned";
      const subjectId = question.subject?.id || "unknown";
      const key = `${topic}_${subjectId}`;
      
      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          id: key,
          topic,
          subject,
          subjectId,
          count: 0,
          lastGenerated: new Date(question.created_at || Date.now()),
          questions: []
        });
      }
      
      const session = sessionsMap.get(key)!;
      session.count++;
      session.questions.push({
        ...question,
        question_type: question.question_type as "MCQ" | "Theory",
        options: question.options as any
      });
      
      const questionDate = new Date(question.created_at || Date.now());
      if (questionDate > session.lastGenerated) {
        session.lastGenerated = questionDate;
      }
    });
    
    const sessions = Array.from(sessionsMap.values()).sort((a, b) => 
      b.lastGenerated.getTime() - a.lastGenerated.getTime()
    );

    console.log(`Found ${sessions.length} question generation sessions`);
    return sessions;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["questions"],
    queryFn: fetchQuestions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attempt) => Math.min(attempt > 1 ? 2000 : 1000, 30 * 1000)
  });

  const createMutation = useMutation({
    mutationFn: createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create question: ${error.message}`);
    }
  });

  const createManyMutation = useMutation({
    mutationFn: createQuestions,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success(`Successfully created ${data.length} questions`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create questions: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update question: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete question: ${error.message}`);
    }
  });

  const deleteManyMutation = useMutation({
    mutationFn: deleteQuestions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Questions deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete questions: ${error.message}`);
    }
  });

  return {
    questions: data || [],
    isLoading,
    error: error as Error,
    refetch,
    getQuestionById,
    getQuestionsByTopic,
    getQuestionSessions,
    createQuestion: createMutation.mutate,
    createQuestions: createManyMutation.mutate,
    updateQuestion: updateMutation.mutate,
    deleteQuestion: deleteMutation.mutate,
    deleteQuestions: deleteManyMutation.mutate,
    isCreating: createMutation.isPending,
    isCreatingMany: createManyMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
