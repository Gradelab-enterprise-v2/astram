#!/usr/bin/env node

/**
 * Script to create Appwrite storage buckets using REST API
 * This script creates all required storage buckets in Appwrite using server-side API calls
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Required buckets configuration
const BUCKETS = [
  {
    bucketId: 'student-sheets',
    name: 'Student Answer Sheets',
    permissions: ['any'],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 104857600, // 100MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
    compression: 'gzip',
    encryption: false,
    antivirus: false
  },
  {
    bucketId: 'test-papers',
    name: 'Test Papers',
    permissions: ['any'],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 104857600, // 100MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
    compression: 'gzip',
    encryption: false,
    antivirus: false
  },
  {
    bucketId: 'chapter-materials',
    name: 'Chapter Materials',
    permissions: ['any'],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 104857600, // 100MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
    compression: 'gzip',
    encryption: false,
    antivirus: false
  },
  {
    bucketId: 'profile-images',
    name: 'Profile Images',
    permissions: ['any'],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 10485760, // 10MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif'],
    compression: 'gzip',
    encryption: false,
    antivirus: false
  },
  {
    bucketId: 'gradelab-uploads',
    name: 'GradeLab Uploads',
    permissions: ['any'],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 104857600, // 100MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
    compression: 'gzip',
    encryption: false,
    antivirus: false
  },
  {
    bucketId: 'papers',
    name: 'Papers',
    permissions: ['any'],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 104857600, // 100MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
    compression: 'gzip',
    encryption: false,
    antivirus: false
  },
  {
    bucketId: 'ocr-images',
    name: 'OCR Images',
    permissions: ['any'],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 104857600, // 100MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif'],
    compression: 'gzip',
    encryption: false,
    antivirus: false
  },
  {
    bucketId: 'question-papers',
    name: 'Question Papers',
    permissions: ['any'],
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 104857600, // 100MB
    allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
    compression: 'gzip',
    encryption: false,
    antivirus: false
  }
];

async function createAppwriteBuckets() {
  console.log('🔧 Creating Appwrite Storage Buckets...\n');

  // Check if Appwrite is configured
  if (!process.env.VITE_APPWRITE_ENDPOINT || !process.env.VITE_APPWRITE_PROJECT_ID) {
    console.log('❌ Appwrite not configured. Please set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID in your .env file');
    return;
  }

  // Check if API key is available for server-side operations
  if (!process.env.APPWRITE_API_KEY) {
    console.log('❌ APPWRITE_API_KEY not configured.');
    console.log('   To create buckets programmatically, you need a server API key.');
    console.log('   1. Go to your Appwrite console: ' + process.env.VITE_APPWRITE_ENDPOINT.replace('/v1', ''));
    console.log('   2. Navigate to Overview → Integrations → API Keys');
    console.log('   3. Create a new API key with Storage permissions');
    console.log('   4. Add APPWRITE_API_KEY=your_api_key to your .env file');
    console.log('');
    console.log('   Alternatively, create buckets manually in the console:');
    console.log('   - Go to Storage → Create Bucket');
    console.log('   - Use the bucket IDs listed below:');
    BUCKETS.forEach(bucket => {
      console.log(`     * ${bucket.bucketId} (${bucket.name})`);
    });
    return;
  }

  console.log(`📡 Connecting to Appwrite at: ${process.env.VITE_APPWRITE_ENDPOINT}`);
  console.log(`📦 Project ID: ${process.env.VITE_APPWRITE_PROJECT_ID}\n`);

  const createdBuckets = [];
  const existingBuckets = [];
  const failedBuckets = [];

  for (const bucket of BUCKETS) {
    try {
      console.log(`Creating bucket: ${bucket.name} (${bucket.bucketId})`);
      
      const response = await fetch(`${process.env.VITE_APPWRITE_ENDPOINT}/storage/buckets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': process.env.VITE_APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': process.env.APPWRITE_API_KEY
        },
        body: JSON.stringify({
          bucketId: bucket.bucketId,
          name: bucket.name,
          permissions: [`read("any")`, `create("any")`, `update("any")`, `delete("any")`],
          fileSecurity: bucket.fileSecurity,
          enabled: bucket.enabled,
          maximumFileSize: bucket.maximumFileSize,
          allowedFileExtensions: bucket.allowedFileExtensions,
          compression: bucket.compression,
          encryption: bucket.encryption,
          antivirus: bucket.antivirus
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Successfully created bucket: ${bucket.name}`);
        createdBuckets.push(bucket.bucketId);
      } else {
        const error = await response.json();
        if (error.code === 409) {
          console.log(`ℹ️  Bucket already exists: ${bucket.name}`);
          existingBuckets.push(bucket.bucketId);
        } else {
          console.error(`❌ Failed to create bucket ${bucket.name}: ${error.message}`);
          failedBuckets.push({ id: bucket.bucketId, error: error.message });
        }
      }
      
    } catch (error) {
      console.error(`❌ Failed to create bucket ${bucket.name}:`, error.message);
      failedBuckets.push({ id: bucket.bucketId, error: error.message });
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
  console.log('📝 Note: Files will be uploaded to both Supabase and Appwrite');
  console.log('\n🧪 Test your setup with: npm run test:dual-storage');
}

// Run the setup
createAppwriteBuckets().catch(console.error);
