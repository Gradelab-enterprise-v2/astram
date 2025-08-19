#!/usr/bin/env node

/**
 * Simple script to create Appwrite buckets using the client SDK
 */

import { Client, Storage } from 'appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createBuckets() {
  console.log('🔧 Creating Appwrite Buckets...\n');

  // Check configuration
  if (!process.env.VITE_APPWRITE_ENDPOINT || !process.env.VITE_APPWRITE_PROJECT_ID) {
    console.log('❌ Appwrite not configured. Please set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID');
    return;
  }

  console.log(`📡 Connecting to Appwrite at: ${process.env.VITE_APPWRITE_ENDPOINT}`);
  console.log(`📦 Project ID: ${process.env.VITE_APPWRITE_PROJECT_ID}\n`);

  // Create client
  const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID);

  const storage = new Storage(client);

  // Bucket configurations
  const buckets = [
    {
      id: 'student-sheets',
      name: 'Student Answer Sheets',
      maxSize: 52428800 // 50MB
    },
    {
      id: 'test-papers',
      name: 'Test Papers',
      maxSize: 52428800
    },
    {
      id: 'chapter-materials',
      name: 'Chapter Materials',
      maxSize: 52428800
    },
    {
      id: 'profile-images',
      name: 'Profile Images',
      maxSize: 10485760 // 10MB
    },
    {
      id: 'gradelab-uploads',
      name: 'GradeLab Uploads',
      maxSize: 52428800
    },
    {
      id: 'papers',
      name: 'Papers',
      maxSize: 52428800
    },
    {
      id: 'ocr-images',
      name: 'OCR Images',
      maxSize: 52428800
    },
    {
      id: 'question-papers',
      name: 'Question Papers',
      maxSize: 52428800
    }
  ];

  const created = [];
  const failed = [];

  for (const bucket of buckets) {
    try {
      console.log(`Creating bucket: ${bucket.name} (${bucket.id})`);
      
      // Try to create bucket using the client SDK
      // Note: This will only work if the client has admin permissions
      const result = await storage.createBucket(
        bucket.id,
        bucket.name,
        ['*'], // permissions
        false,  // fileSecurity
        true,   // enabled
        bucket.maxSize,
        ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
        'gzip',
        false,  // encryption
        false   // antivirus
      );
      
      console.log(`✅ Successfully created: ${bucket.name}`);
      created.push(bucket.id);
      
    } catch (error) {
      if (error.code === 409) {
        console.log(`ℹ️  Already exists: ${bucket.name}`);
        created.push(bucket.id);
      } else {
        console.log(`❌ Failed: ${bucket.name} - ${error.message}`);
        failed.push({ id: bucket.id, error: error.message });
      }
    }
  }

  console.log('\n📋 Summary:');
  console.log(`✅ Created/Exists: ${created.length} buckets`);
  console.log(`❌ Failed: ${failed.length} buckets`);

  if (created.length > 0) {
    console.log('\n✅ Working buckets:');
    created.forEach(id => console.log(`   - ${id}`));
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed buckets:');
    failed.forEach(({ id, error }) => console.log(`   - ${id}: ${error}`));
  }

  console.log('\n🧪 Test with: npm run test:dual-storage');
}

createBuckets().catch(console.error);
