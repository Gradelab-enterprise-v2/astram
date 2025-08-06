import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAIL } from "./constants";

export async function setupAdminAccount() {
  try {
    // First try to sign in with admin credentials
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: "Jainil@1901"
    });

    if (signInError?.message === "Invalid login credentials") {
      // If login fails, create new admin account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password: "Jainil@1901",
        options: {
          data: {
            role: 'admin'
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      return {
        success: true,
        message: "Admin account created successfully. Please check your email for verification.",
        isNewAccount: true
      };
    }

    if (signInError) {
      throw signInError;
    }

    return {
      success: true,
      message: "Admin account already exists and credentials are correct.",
      isNewAccount: false
    };
  } catch (error: any) {
    console.error("Error setting up admin account:", error);
    return {
      success: false,
      message: error.message || "Failed to setup admin account",
      error
    };
  }
} 