import { Client, Storage, Databases } from 'appwrite';

// Appwrite client configuration
const appwriteClient = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'http://localhost/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

// Storage instance
export const appwriteStorage = new Storage(appwriteClient);

// Databases instance (if needed for metadata)
export const appwriteDatabases = new Databases(appwriteClient);

// Check if Appwrite is configured
export const isAppwriteConfigured = () => {
  return import.meta.env.VITE_APPWRITE_ENDPOINT && import.meta.env.VITE_APPWRITE_PROJECT_ID;
};

// Re-export APPWRITE_BUCKETS from constants file
export { APPWRITE_BUCKETS } from './storage-constants';

export default appwriteClient;
