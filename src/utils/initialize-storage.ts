import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Ensures that a storage bucket exists, creating it if it doesn't
 * @param bucketName The name of the bucket to ensure exists
 * @returns Promise resolving to a boolean indicating if the bucket exists or was created
 */
export async function ensureBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`Checking if bucket '${bucketName}' exists...`);
    
    // First check if the bucket exists
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
      
    if (listError) {
      console.error("Error listing buckets:", listError);
      // Don't throw here, just return false if we can't list buckets
      return false;
    }
    
    // See if our bucket exists
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`Bucket '${bucketName}' already exists`);
      return true;
    }
    
    console.log(`Bucket '${bucketName}' does not exist, attempting to create it...`);
    
    // Try to call the create-storage edge function if available
    try {
      console.log("Attempting to create bucket via edge function...");
      const { data, error } = await supabase.functions.invoke("create-storage", {
        body: { bucketName }
      });
      
      if (error) {
        console.error("Error calling create-storage edge function:", error);
        // Continue with client-side creation attempt as fallback
      } else if (data?.success) {
        console.log(`Successfully created bucket '${bucketName}' via edge function`);
        return true;
      }
    } catch (edgeFunctionError) {
      console.error("Error calling create-storage edge function:", edgeFunctionError);
      // Continue with client-side creation attempt as fallback
    }
    
    // As a fallback, try direct creation which may work depending on RLS policies
    console.log(`Attempting direct bucket creation for '${bucketName}'...`);
    const { error: createError } = await supabase
      .storage
      .createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf', 'text/plain']
      });
      
    if (createError) {
      console.error(`Error creating bucket '${bucketName}':`, createError);
      // Don't throw here, just report the error and return false
      return false;
    }
    
    console.log(`Successfully created bucket '${bucketName}'`);
    return true;
  } catch (error) {
    console.error(`Error ensuring bucket '${bucketName}' exists:`, error);
    
    // Don't throw, just report the error to the UI and return false
    toast.error("Storage bucket access issue. Using alternative method for text extraction.");
    return false;
  }
}

/**
 * Checks if a user has access to a storage bucket
 * @param bucketName The name of the bucket to check
 * @returns Promise resolving to a boolean indicating if the user has access
 */
export async function userHasBucketAccess(bucketName: string): Promise<boolean> {
  try {
    // Try listing files in the bucket as a simple access test
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .list('', { limit: 1 });
      
    if (error) {
      console.warn(`User does not have access to bucket '${bucketName}':`, error);
      return false;
    }
    
    // Try uploading a test file
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    const testFile = new File([testBlob], 'permission-test.txt', { type: 'text/plain' });
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(`test/${Date.now()}-permission-test.txt`, testFile, {
        upsert: true
      });
      
    if (uploadError) {
      console.warn(`User cannot write to bucket '${bucketName}':`, uploadError);
      return false;
    }
    
    // Clean up the test file
    try {
      await supabase
        .storage
        .from(bucketName)
        .remove([uploadData.path]);
    } catch (cleanupError) {
      console.warn("Error cleaning up test file:", cleanupError);
      // Ignore cleanup errors
    }
    
    return true;
  } catch (error) {
    console.warn(`Error checking bucket access for '${bucketName}':`, error);
    return false;
  }
}
