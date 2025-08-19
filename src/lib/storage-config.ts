import { supabase } from './supabase';
import { uploadToDualStorage, deleteFromDualStorage, getFileFromDualStorage } from './dual-storage';
import { STORAGE_BUCKETS } from './storage-constants';

// Use the main supabase client for storage operations
export const localSupabase = supabase;

// Re-export STORAGE_BUCKETS for backward compatibility
export { STORAGE_BUCKETS };

// Helper function to upload image to dual storage (Supabase + Appwrite)
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
    const result = await uploadToDualStorage(bucket, path, file, options);
    
    if (result.error) {
      console.error('Error uploading to dual storage:', result.error);
      throw result.error;
    }

    return {
      data: result.data,
      publicUrl: result.publicUrl,
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

// Helper function to get image from dual storage
export const getImageFromLocal = async (bucket: string, path: string) => {
  try {
    const result = await getFileFromDualStorage(bucket, path);
    
    if (result.error) {
      console.error('Error downloading from dual storage:', result.error);
      throw result.error;
    }

    return {
      data: result.data,
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

// Helper function to delete image from dual storage
export const deleteImageFromLocal = async (bucket: string, path: string, appwriteFileId?: string) => {
  try {
    const result = await deleteFromDualStorage(bucket, path, appwriteFileId);
    
    if (!result.success) {
      console.error('Error deleting from dual storage:', result.errors);
      throw new Error('Failed to delete from storage');
    }

    return {
      data: { success: true },
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

// Helper function to list images in dual storage (uses Supabase for listing)
export const listImagesFromLocal = async (bucket: string, path?: string) => {
  try {
    const { data, error } = await localSupabase.storage
      .from(bucket)
      .list(path || '');

    if (error) {
      console.error('Error listing from storage:', error);
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