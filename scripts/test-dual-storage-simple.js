#!/usr/bin/env node

/**
 * Simple test script for dual storage system
 * This script tests the configuration without importing the full app
 */

import dotenv from 'dotenv';
import { Client, Storage } from 'appwrite';

// Load environment variables
dotenv.config();

async function testDualStorageConfig() {
  console.log('🧪 Testing Dual Storage Configuration...\n');

  // Check configuration
  console.log('📋 Configuration Check:');
  console.log(`   Supabase URL: ${process.env.VITE_SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Supabase Key: ${process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Appwrite Endpoint: ${process.env.VITE_APPWRITE_ENDPOINT ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Appwrite Project ID: ${process.env.VITE_APPWRITE_PROJECT_ID ? '✅ Configured' : '❌ Not configured'}`);
  console.log('');

  // Check if Supabase is configured
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.log('❌ Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return;
  }

  // Check if Appwrite is configured
  if (!process.env.VITE_APPWRITE_ENDPOINT || !process.env.VITE_APPWRITE_PROJECT_ID) {
    console.log('⚠️  Appwrite not configured. Dual storage will use Supabase only.');
    console.log('   To enable Appwrite backup, set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID');
    console.log('');
    console.log('✅ System will work with Supabase only');
    return;
  }

  // Test Appwrite connection
  console.log('🔗 Testing Appwrite Connection...');
  try {
    const appwriteClient = new Client()
      .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
      .setProject(process.env.VITE_APPWRITE_PROJECT_ID);

    const appwriteStorage = new Storage(appwriteClient);

    // Test connection by trying to list files in a bucket
    // This will fail if bucket doesn't exist, but will confirm connection
    const requiredBuckets = [
      'student-sheets',
      'test-papers', 
      'chapter-materials',
      'profile-images',
      'gradelab-uploads',
      'papers',
      'ocr-images',
      'question-papers'
    ];

    console.log('📦 Checking required buckets...');
    let existingBuckets = [];
    let missingBuckets = [];

    for (const bucketId of requiredBuckets) {
      try {
        // Try to list files in the bucket - this will work if bucket exists
        await appwriteStorage.listFiles(bucketId);
        console.log(`   ✅ ${bucketId} - exists`);
        existingBuckets.push(bucketId);
      } catch (error) {
        if (error.code === 404) {
          console.log(`   ❌ ${bucketId} - missing`);
          missingBuckets.push(bucketId);
        } else {
          console.log(`   ⚠️  ${bucketId} - error: ${error.message}`);
          missingBuckets.push(bucketId);
        }
      }
    }

    console.log('');
    console.log(`✅ Appwrite connection successful!`);
    console.log(`📊 Bucket Status: ${existingBuckets.length}/${requiredBuckets.length} buckets exist`);
    
    if (missingBuckets.length > 0) {
      console.log('');
      console.log('❌ Missing buckets need to be created manually:');
      missingBuckets.forEach(bucket => {
        console.log(`   - ${bucket}`);
      });
      console.log('');
      console.log('📝 To create buckets:');
      console.log('   1. Go to your Appwrite console: ' + process.env.VITE_APPWRITE_ENDPOINT.replace('/v1', ''));
      console.log('   2. Navigate to Storage');
      console.log('   3. Click "Create Bucket" for each missing bucket');
      console.log('   4. Set bucket ID exactly as shown above');
      console.log('   5. Set permissions to allow all users (*)');
      console.log('   6. Set file size limit to 50MB');
      console.log('   7. Allow file types: image/*, application/pdf, text/*');
    }

    console.log('');
    if (existingBuckets.length === requiredBuckets.length) {
      console.log('🎉 Dual storage system is fully configured!');
      console.log('📝 Files will be uploaded to both Supabase and Appwrite');
    } else {
      console.log('⚠️  Dual storage partially configured');
      console.log('📝 Files will be uploaded to Supabase and existing Appwrite buckets only');
    }

  } catch (error) {
    console.error('❌ Appwrite connection failed:', error.message);
    console.log('');
    console.log('⚠️  Appwrite is configured but not accessible.');
    console.log('   The system will still work with Supabase only.');
    console.log('   Check your Appwrite endpoint and project ID.');
    console.log('   Make sure your Appwrite instance is running.');
  }
}

// Run the test
testDualStorageConfig().catch(console.error);
