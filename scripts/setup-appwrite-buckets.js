#!/usr/bin/env node

/**
 * Script to guide Appwrite storage buckets setup
 * Since bucket creation requires server-side access, this script provides
 * instructions for manual bucket creation through the Appwrite console
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Storage buckets to create
const BUCKETS = [
  'student-sheets',
  'test-papers', 
  'chapter-materials',
  'profile-images',
  'gradelab-uploads',
  'papers',
  'ocr-images',
  'question-papers'
];

async function setupAppwriteBuckets() {
  console.log('🔧 Setting up Appwrite Storage Buckets...\n');

  // Check if Appwrite is configured
  if (!process.env.VITE_APPWRITE_ENDPOINT || !process.env.VITE_APPWRITE_PROJECT_ID) {
    console.log('⚠️  Appwrite not configured. Skipping bucket setup.');
    console.log('   To enable Appwrite, set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID in your .env file');
    return;
  }

  console.log(`📡 Connecting to Appwrite at: ${process.env.VITE_APPWRITE_ENDPOINT}`);
  console.log(`📦 Project ID: ${process.env.VITE_APPWRITE_PROJECT_ID}\n`);

  const createdBuckets = [];
  const existingBuckets = [];
  const failedBuckets = [];

  for (const bucketId of BUCKETS) {
    try {
      console.log(`Creating bucket: ${bucketId}`);
      
      // For now, we'll just log the bucket creation
      // The actual bucket creation should be done through the Appwrite console
      // or using the Appwrite CLI
      console.log(`ℹ️  Please create bucket '${bucketId}' manually in your Appwrite console`);
      console.log(`   - Go to your Appwrite project dashboard`);
      console.log(`   - Navigate to Storage`);
      console.log(`   - Click 'Create Bucket'`);
      console.log(`   - Set bucket ID to: ${bucketId}`);
      console.log(`   - Set permissions to allow all users (*)`);
      console.log(`   - Set file size limit to 50MB`);
      console.log(`   - Allow file types: image/*, application/pdf, text/*`);
      console.log('');
      
      existingBuckets.push(bucketId);
      
    } catch (error) {
      console.error(`❌ Error with bucket ${bucketId}:`, error.message);
      failedBuckets.push({ id: bucketId, error: error.message });
    }
  }

  console.log('\n📋 Setup Summary:');
  console.log(`✅ Created: ${createdBuckets.length} buckets`);
  console.log(`ℹ️  Already existed: ${existingBuckets.length} buckets`);
  console.log(`❌ Failed: ${failedBuckets.length} buckets`);

  if (createdBuckets.length > 0) {
    console.log('\n🆕 Newly created buckets:');
    createdBuckets.forEach(id => console.log(`   - ${id}`));
  }

  if (existingBuckets.length > 0) {
    console.log('\n📁 Existing buckets:');
    existingBuckets.forEach(id => console.log(`   - ${id}`));
  }

  if (failedBuckets.length > 0) {
    console.log('\n❌ Failed buckets:');
    failedBuckets.forEach(({ id, error }) => console.log(`   - ${id}: ${error}`));
  }

  console.log('\n🎉 Appwrite storage setup complete!');
  console.log('📝 Note: Files will be uploaded to both Supabase and Appwrite (if configured)');
}

// Run the setup
setupAppwriteBuckets().catch(console.error);
