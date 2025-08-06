import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Rubric } from "@/types/rubrics";
import { toast } from "sonner";

export function useRubrics() {
    const queryClient = useQueryClient();

    const getRubricByTestId = async (testId: string) => {
        const { data, error } = await supabase
            .from("rubrics")
            .select("*")
            .eq("test_id", testId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return data;
    };

    const createRubric = async (testId: string, rubric: Partial<Rubric>) => {
        const { data, error } = await supabase
            .from("rubrics")
            .insert([{ test_id: testId, ...rubric }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    };

    const updateRubric = async (id: string, rubric: Partial<Rubric>) => {
        const { data, error } = await supabase
            .from("rubrics")
            .update(rubric)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    };

    const useRubricByTestId = (testId: string) => {
        return useQuery({
            queryKey: ["rubric", testId],
            queryFn: () => getRubricByTestId(testId),
            enabled: !!testId,
        });
    };

    const createRubricMutation = useMutation({
        mutationFn: ({ testId, rubric }: { testId: string; rubric: Partial<Rubric> }) =>
            createRubric(testId, rubric),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rubric"] });
            toast.success("Rubrics saved successfully");
        },
        onError: (error) => {
            toast.error("Failed to save rubrics");
            console.error("Error saving rubrics:", error);
        },
    });

    const updateRubricMutation = useMutation({
        mutationFn: ({ id, rubric }: { id: string; rubric: Partial<Rubric> }) =>
            updateRubric(id, rubric),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["rubric"] });
            toast.success("Rubrics updated successfully");
        },
        onError: (error) => {
            toast.error("Failed to update rubrics");
            console.error("Error updating rubrics:", error);
        },
    });

    return {
        useRubricByTestId,
        createRubricMutation,
        updateRubricMutation,
    };
} 