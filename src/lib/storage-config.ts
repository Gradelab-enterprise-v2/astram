import { supabase } from './supabase';

// Use the main supabase client for storage operations
export const localSupabase = supabase;

// Storage bucket configuration
export const STORAGE_BUCKETS = {
  STUDENT_SHEETS: 'student-sheets',
  TEST_PAPERS: 'test-papers',
  CHAPTER_MATERIALS: 'chapter-materials',
  PROFILE_IMAGES: 'profile-images',
  GRADELAB_UPLOADS: 'gradelab-uploads'
};

// Helper function to upload image to local storage
export const uploadImageToLocal = async (
  bucket: string,
  path: string,
  file: File | Blob,
  options?: {
    cacheControl?: string;
    upsert?: boolean;
  }
) => {
  try {
    const { data, error } = await localSupabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert || true,
      });

    if (error) {
      console.error('Error uploading to local storage:', error);
      throw error;
    }

    // Get public URL from local storage
    const { data: urlData } = localSupabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      data,
      publicUrl: urlData.publicUrl,
      error: null
    };
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      data: null,
      publicUrl: null,
      error
    };
  }
};

// Helper function to get image from local storage
export const getImageFromLocal = async (bucket: string, path: string) => {
  try {
    const { data, error } = await localSupabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      console.error('Error downloading from local storage:', error);
      throw error;
    }

    return {
      data,
      error: null
    };
  } catch (error) {
    console.error('Download failed:', error);
    return {
      data: null,
      error
    };
  }
};

// Helper function to delete image from local storage
export const deleteImageFromLocal = async (bucket: string, path: string) => {
  try {
    const { data, error } = await localSupabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Error deleting from local storage:', error);
      throw error;
    }

    return {
      data,
      error: null
    };
  } catch (error) {
    console.error('Delete failed:', error);
    return {
      data: null,
      error
    };
  }
};

// Helper function to list images in local storage
export const listImagesFromLocal = async (bucket: string, path?: string) => {
  try {
    const { data, error } = await localSupabase.storage
      .from(bucket)
      .list(path || '');

    if (error) {
      console.error('Error listing from local storage:', error);
      throw error;
    }

    return {
      data,
      error: null
    };
  } catch (error) {
    console.error('List failed:', error);
    return {
      data: null,
      error
    };
  }
}; 