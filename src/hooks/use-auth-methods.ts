import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { config } from "../lib/config";

export function useAuthMethods() {

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Signing in with email:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Error during sign in:", error);
        toast.error(`Sign in failed: ${error.message}`);
        return { error };
      }
      
      console.log("Sign in successful:", data?.user?.email);
      toast.success("Signed in successfully");
      return { data };
    } catch (error) {
      console.error("Exception during sign in:", error);
      toast.error(`Sign in error: ${(error as Error).message}`);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    // Signup is disabled
    const error = new Error("Signup is not available. Please contact an administrator to create an account.");
    console.error(error.message);
    toast.error(error.message);
    return { error };
  };

  const signOut = async () => {
    try {
      console.log("Signing out...");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Error during sign out:", error);
        toast.error(`Sign out failed: ${error.message}`);
        return { error };
      }
      
      console.log("Sign out successful");
      toast.success("Signed out successfully");
      return {};
    } catch (error) {
      console.error("Exception during sign out:", error);
      toast.error(`Sign out error: ${(error as Error).message}`);
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    // Google sign-in is disabled
    const error = new Error("Google sign-in is not available. Please use email and password to sign in.");
    console.error(error.message);
    toast.error(error.message);
    return { error };
  };

  const resetPassword = async (email: string) => {
    try {
      console.log("Sending password reset to:", email);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: config.auth.passwordReset.requestUrl
      });
      
      if (error) {
        console.error("Error during password reset:", error);
        toast.error(`Password reset failed: ${error.message}`);
        return { error };
      }
      
      console.log("Password reset initiated:", data);
      toast.success("Password reset email sent");
      return { data };
    } catch (error) {
      console.error("Exception during password reset:", error);
      toast.error(`Password reset error: ${(error as Error).message}`);
      return { error: error as Error };
    }
  };

  const adminInviteUser = async (email: string, planId: string, isAnnual: boolean) => {
    try {
      console.log("Admin inviting user:", email, "with plan:", planId);
      
      // Use the edge function to invite the user
      const response = await supabase.functions.invoke('invite-user', {
        body: { 
          email, 
          planId, 
          isAnnual 
        }
      });
      
      if (response.error) {
        console.error("Error inviting user:", response.error);
        toast.error(`User invitation failed: ${response.error.message || JSON.stringify(response.error)}`);
        return { error: response.error };
      }
      
      const { data, error } = response.data;
      
      if (error) {
        console.error("Error from invite function:", error);
        toast.error(`Failed to invite user: ${error.message || JSON.stringify(error)}`);
        return { error };
      }
      
      if (!data) {
        console.error("No data returned from invite function");
        toast.error("Unexpected error inviting user");
        return { error: new Error("Unexpected error inviting user") };
      }
      
      console.log("User invited successfully:", data);
      toast.success(`User ${email} has been invited successfully`);
      
      return { 
        data: { 
          userId: data.userId, 
          temporaryPassword: data.temporaryPassword 
        } 
      };
    } catch (error) {
      console.error("Exception during user invitation:", error);
      toast.error(`User invitation error: ${(error as Error).message}`);
      return { error: error as Error };
    }
  };

  // Helper function to generate a secure password
  const generateSecurePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=";
    let password = "";
    
    // Ensure we have at least one character from each category
    password += charset.match(/[a-z]/)[0];
    password += charset.match(/[A-Z]/)[0];
    password += charset.match(/[0-9]/)[0];
    password += charset.match(/[!@#$%^&*()_\-+=]/)[0];
    
    // Fill the rest of the password
    for (let i = 4; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Error updating password:", error);
        toast.error(`Password update failed: ${error.message}`);
        return { error };
      }

      console.log("Password updated successfully");
      toast.success("Your password has been updated successfully");
      return { data };
    } catch (error) {
      console.error("Exception updating password:", error);
      toast.error(`Password update error: ${(error as Error).message}`);
      return { error: error as Error };
    }
  };

  return {
    signIn,
    signOut,
    resetPassword,
    adminInviteUser,
    updatePassword
  };
}
