
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

// Define the profile type
export interface UserProfile {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

// Get user profile by ID
export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  console.log("Fetching user profile for:", userId);
  
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();
  
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  return data as UserProfile;
};

// Create or update a profile
export const upsertUserProfile = async (profile: Partial<UserProfile> & { id: string }): Promise<UserProfile> => {
  console.log("Upserting user profile:", profile);
  
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profile)
    .select()
    .single();
  
  if (error) {
    console.error("Error upserting user profile:", error);
    throw error;
  }
  
  return data as UserProfile;
};

export function useUserProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  
  // Query to fetch the user profile
  const query = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => userId ? fetchUserProfile(userId) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Mutation to update the profile
  const mutation = useMutation({
    mutationFn: upsertUserProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(["userProfile", userId], data);
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  // Handle updating the user's name
  const updateUserName = (name: string) => {
    if (!userId) {
      toast.error("You must be logged in to update your profile.");
      return;
    }
    
    mutation.mutate({ 
      id: userId, 
      name 
    });
  };
  
  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateUserName,
    isUpdating: mutation.isPending
  };
}
