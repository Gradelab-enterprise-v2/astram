import { supabase } from './supabase';
import { appwriteStorage, isAppwriteConfigured } from './appwrite';
import { STORAGE_BUCKETS, APPWRITE_BUCKETS } from './storage-constants';
import { ID } from 'appwrite';

// Map Supabase buckets to Appwrite buckets
const BUCKET_MAPPING = {
  [STORAGE_BUCKETS.STUDENT_SHEETS]: APPWRITE_BUCKETS.STUDENT_SHEETS,
  [STORAGE_BUCKETS.TEST_PAPERS]: APPWRITE_BUCKETS.TEST_PAPERS,
  [STORAGE_BUCKETS.CHAPTER_MATERIALS]: APPWRITE_BUCKETS.CHAPTER_MATERIALS,
  [STORAGE_BUCKETS.PROFILE_IMAGES]: APPWRITE_BUCKETS.PROFILE_IMAGES,
  [STORAGE_BUCKETS.GRADELAB_UPLOADS]: APPWRITE_BUCKETS.GRADELAB_UPLOADS,
  'papers': APPWRITE_BUCKETS.PAPERS,
  'ocr-images': APPWRITE_BUCKETS.OCR_IMAGES,
  'question-papers': APPWRITE_BUCKETS.QUESTION_PAPERS
};

export interface UploadResult {
  data: any;
  publicUrl: string;
  error: any;
  appwriteFileId?: string; // Appwrite file ID for future reference
}

/**
 * Upload file to both Supabase and Appwrite (if configured)
 */
export const uploadToDualStorage = async (
  bucket: string,
  path: string,
  file: File | Blob,
  options?: {
    cacheControl?: string;
    upsert?: boolean;
  }
): Promise<UploadResult> => {
  const results: UploadResult[] = [];
  
  try {
    // Always upload to Supabase first
    console.log(`Uploading to Supabase bucket: ${bucket}, path: ${path}`);
    const supabaseResult = await uploadToSupabase(bucket, path, file, options);
    results.push(supabaseResult);
    
    // If Appwrite is configured, upload there too
    if (isAppwriteConfigured()) {
      const appwriteBucket = BUCKET_MAPPING[bucket];
      console.log(`Bucket mapping check - Supabase: ${bucket} -> Appwrite: ${appwriteBucket}`);
      
      if (appwriteBucket) {
        console.log(`Uploading to Appwrite bucket: ${appwriteBucket}, path: ${path}`);
        const appwriteResult = await uploadToAppwrite(appwriteBucket, path, file);
        results.push(appwriteResult);
        
        // Debug: List files after upload
        try {
          const files = await appwriteStorage.listFiles(appwriteBucket);
          console.log(`Files in Appwrite bucket ${appwriteBucket} after upload:`, files);
        } catch (error) {
          console.error('Error listing files after upload:', error);
        }
      } else {
        console.warn(`No Appwrite bucket mapping found for Supabase bucket: ${bucket}`);
        console.log('Available bucket mappings:', BUCKET_MAPPING);
      }
    } else {
      console.log('Appwrite not configured, skipping Appwrite upload');
    }
    
    // Return the Supabase result (primary storage)
    // Appwrite upload is for backup/redundancy
    return {
      data: supabaseResult.data,
      publicUrl: supabaseResult.publicUrl,
      error: supabaseResult.error,
      appwriteFileId: results.find(r => r.appwriteFileId)?.appwriteFileId
    };
    
  } catch (error) {
    console.error('Dual storage upload failed:', error);
    return {
      data: null,
      publicUrl: '',
      error: error,
      appwriteFileId: undefined
    };
  }
};

/**
 * Upload file to Supabase storage
 */
const uploadToSupabase = async (
  bucket: string,
  path: string,
  file: File | Blob,
  options?: {
    cacheControl?: string;
    upsert?: boolean;
  }
): Promise<UploadResult> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert || true,
      });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }

    // Get public URL from Supabase
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      data,
      publicUrl: urlData.publicUrl,
      error: null
    };
  } catch (error) {
    console.error('Supabase upload failed:', error);
    return {
      data: null,
      publicUrl: '',
      error: error
    };
  }
};

/**
 * Upload file to Appwrite storage
 */
const uploadToAppwrite = async (
  bucket: string,
  path: string,
  file: File | Blob
): Promise<UploadResult> => {
  try {
    console.log(`Appwrite upload - Bucket: ${bucket}, Path: ${path}, File size: ${file instanceof File ? file.size : 'unknown'}`);
    
    // Appwrite uses file ID instead of path for uploads
    // We'll use the path as a prefix and generate a unique ID
    const fileId = ID.unique();
    const fileName = `${path.replace(/\//g, '_')}_${fileId}`;
    
    console.log(`Appwrite upload - Generated fileId: ${fileId}, fileName: ${fileName}`);
    
    // Appwrite requires a File object, not a Blob
    if (!(file instanceof File)) {
      throw new Error('Appwrite upload requires a File object, not a Blob');
    }
    
    const result = await appwriteStorage.createFile(
      bucket,
      fileId,
      file
    );

    console.log(`Appwrite upload successful - Result:`, result);

    // Get file URL from Appwrite
    const fileUrl = appwriteStorage.getFileView(bucket, fileId);
    
    console.log(`Appwrite file URL: ${fileUrl.toString()}`);

    return {
      data: result,
      publicUrl: fileUrl.toString(),
      error: null,
      appwriteFileId: fileId
    };
  } catch (error) {
    console.error('Appwrite upload failed:', error);
    return {
      data: null,
      publicUrl: '',
      error: error
    };
  }
};

/**
 * Delete file from both Supabase and Appwrite
 */
export const deleteFromDualStorage = async (
  bucket: string,
  path: string,
  appwriteFileId?: string
): Promise<{ success: boolean; errors: any[] }> => {
  const errors: any[] = [];
  
  try {
    // Delete from Supabase
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      
      if (error) {
        console.error('Error deleting from Supabase:', error);
        errors.push({ storage: 'supabase', error });
      }
    } catch (error) {
      console.error('Supabase delete failed:', error);
      errors.push({ storage: 'supabase', error });
    }
    
    // Delete from Appwrite if configured and file ID is provided
    if (isAppwriteConfigured() && appwriteFileId) {
      const appwriteBucket = BUCKET_MAPPING[bucket];
      if (appwriteBucket) {
        try {
          await appwriteStorage.deleteFile(appwriteBucket, appwriteFileId);
        } catch (error) {
          console.error('Error deleting from Appwrite:', error);
          errors.push({ storage: 'appwrite', error });
        }
      }
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('Dual storage delete failed:', error);
    return {
      success: false,
      errors: [error]
    };
  }
};

/**
 * Get file from storage (prioritizes Supabase)
 */
export const getFileFromDualStorage = async (
  bucket: string,
  path: string
): Promise<{ data: any; error: any }> => {
  try {
    // Try Supabase first
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      console.error('Error downloading from Supabase:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('File retrieval failed:', error);
    return { data: null, error };
  }
};

/**
 * List files from Appwrite storage (for debugging)
 */
export const listFilesFromAppwrite = async (bucket: string) => {
  try {
    if (!isAppwriteConfigured()) {
      console.log('Appwrite not configured');
      return { data: null, error: 'Appwrite not configured' };
    }

    console.log(`Listing files from Appwrite bucket: ${bucket}`);
    const result = await appwriteStorage.listFiles(bucket);
    console.log(`Appwrite files in bucket ${bucket}:`, result);
    
    return { data: result, error: null };
  } catch (error) {
    console.error('Error listing files from Appwrite:', error);
    return { data: null, error };
  }
};

/**
 * Debug function to check bucket mapping and file visibility
 */
export const debugStorageUpload = async (bucket: string, path: string) => {
  console.log('=== Storage Debug Info ===');
  console.log('Supabase bucket:', bucket);
  console.log('File path:', path);
  
  const appwriteBucket = BUCKET_MAPPING[bucket];
  console.log('Mapped Appwrite bucket:', appwriteBucket);
  console.log('Bucket mapping:', BUCKET_MAPPING);
  
  if (isAppwriteConfigured()) {
    console.log('Appwrite is configured');
    try {
      const files = await appwriteStorage.listFiles(appwriteBucket);
      console.log(`Files in Appwrite bucket ${appwriteBucket}:`, files);
    } catch (error) {
      console.error('Error listing Appwrite files:', error);
    }
  } else {
    console.log('Appwrite is NOT configured');
  }
  
  console.log('=== End Debug Info ===');
};
