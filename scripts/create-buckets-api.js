#!/usr/bin/env node

/**
 * Script to create Appwrite buckets using REST API only
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

async function createBucketsWithAPI() {
  console.log('🔧 Creating Appwrite Buckets via REST API...\n');

  // Check configuration
  if (!process.env.VITE_APPWRITE_ENDPOINT || !process.env.VITE_APPWRITE_PROJECT_ID) {
    console.log('❌ Appwrite not configured. Please set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID');
    return;
  }

  // Check if API key is available
  if (!process.env.APPWRITE_API_KEY) {
    console.log('❌ APPWRITE_API_KEY not configured.');
    console.log('   To create buckets via API, you need a server API key.');
    console.log('   1. Go to your Appwrite console: ' + process.env.VITE_APPWRITE_ENDPOINT.replace('/v1', ''));
    console.log('   2. Navigate to Overview → Integrations → API Keys');
    console.log('   3. Create a new API key with Storage permissions');
    console.log('   4. Add APPWRITE_API_KEY=your_api_key to your .env file');
    return;
  }

  console.log(`📡 Connecting to Appwrite at: ${process.env.VITE_APPWRITE_ENDPOINT}`);
  console.log(`📦 Project ID: ${process.env.VITE_APPWRITE_PROJECT_ID}\n`);

  // Bucket configurations
  const buckets = [
    {
      bucketId: 'student-sheets',
      name: 'Student Answer Sheets',
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 52428800, // 50MB
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
      compression: 'gzip',
      encryption: false,
      antivirus: false
    },
    {
      bucketId: 'test-papers',
      name: 'Test Papers',
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 52428800, // 50MB
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
      compression: 'gzip',
      encryption: false,
      antivirus: false
    },
    {
      bucketId: 'chapter-materials',
      name: 'Chapter Materials',
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 52428800, // 50MB
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
      compression: 'gzip',
      encryption: false,
      antivirus: false
    },
    {
      bucketId: 'profile-images',
      name: 'Profile Images',
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
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
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 52428800, // 50MB
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
      compression: 'gzip',
      encryption: false,
      antivirus: false
    },
    {
      bucketId: 'papers',
      name: 'Papers',
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 52428800, // 50MB
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
      compression: 'gzip',
      encryption: false,
      antivirus: false
    },
    {
      bucketId: 'ocr-images',
      name: 'OCR Images',
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 52428800, // 50MB
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif'],
      compression: 'gzip',
      encryption: false,
      antivirus: false
    },
    {
      bucketId: 'question-papers',
      name: 'Question Papers',
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 52428800, // 50MB
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx'],
      compression: 'gzip',
      encryption: false,
      antivirus: false
    }
  ];

  const created = [];
  const existing = [];
  const failed = [];

  for (const bucket of buckets) {
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
          permissions: bucket.permissions,
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
        console.log(`✅ Successfully created: ${bucket.name}`);
        created.push(bucket.bucketId);
      } else {
        const errorText = await response.text();
        let errorMessage = '';
        
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.message || error.error || 'Unknown error';
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }

        if (response.status === 409) {
          console.log(`ℹ️  Already exists: ${bucket.name}`);
          existing.push(bucket.bucketId);
        } else {
          console.log(`❌ Failed: ${bucket.name} - ${errorMessage}`);
          failed.push({ id: bucket.bucketId, error: errorMessage });
        }
      }
      
    } catch (error) {
      console.log(`❌ Failed: ${bucket.name} - ${error.message}`);
      failed.push({ id: bucket.bucketId, error: error.message });
    }
  }

  console.log('\n📋 Summary:');
  console.log(`✅ Created: ${created.length} buckets`);
  console.log(`ℹ️  Already existed: ${existing.length} buckets`);
  console.log(`❌ Failed: ${failed.length} buckets`);

  if (created.length > 0) {
    console.log('\n🆕 Newly created buckets:');
    created.forEach(id => console.log(`   - ${id}`));
  }

  if (existing.length > 0) {
    console.log('\n📁 Existing buckets:');
    existing.forEach(id => console.log(`   - ${id}`));
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed buckets:');
    failed.forEach(({ id, error }) => console.log(`   - ${id}: ${error}`));
  }

  console.log('\n🎉 Bucket creation complete!');
  console.log('🧪 Test your setup with: npm run test:dual-storage');
}

createBucketsWithAPI().catch(console.error);
