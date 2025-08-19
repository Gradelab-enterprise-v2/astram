#!/usr/bin/env node

/**
 * Test script for dual storage system
 * This script tests uploading files to both Supabase and Appwrite
 */

import { uploadToDualStorage } from '../src/lib/dual-storage.js';
import { isAppwriteConfigured } from '../src/lib/appwrite.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDualStorage() {
  console.log('🧪 Testing Dual Storage System...\n');

  // Check configuration
  console.log('📋 Configuration Check:');
  console.log(`   Supabase URL: ${process.env.VITE_SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Supabase Key: ${process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Appwrite Endpoint: ${process.env.VITE_APPWRITE_ENDPOINT ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Appwrite Project ID: ${process.env.VITE_APPWRITE_PROJECT_ID ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Appwrite Enabled: ${isAppwriteConfigured() ? '✅ Yes' : '❌ No'}`);
  console.log('');

  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.log('❌ Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return;
  }

  // Create a test file
  const testContent = 'This is a test file for dual storage system - ' + new Date().toISOString();
  const testFile = new File([testContent], 'test-file.txt', { type: 'text/plain' });

  console.log('📤 Testing File Upload...');
  console.log(`   File: ${testFile.name}`);
  console.log(`   Size: ${testFile.size} bytes`);
  console.log(`   Type: ${testFile.type}`);
  console.log('');

  try {
    const result = await uploadToDualStorage(
      'test-papers',
      `test/${Date.now()}-test-file.txt`,
      testFile
    );

    console.log('📊 Upload Results:');
    console.log(`   Success: ${!result.error ? '✅ Yes' : '❌ No'}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error.message}`);
    } else {
      console.log(`   Supabase URL: ${result.publicUrl}`);
      console.log(`   Appwrite File ID: ${result.appwriteFileId || 'N/A'}`);
    }

    console.log('');
    console.log('🎉 Dual storage test completed!');
    
    if (isAppwriteConfigured()) {
      console.log('📝 Files are being uploaded to both Supabase and Appwrite');
    } else {
      console.log('📝 Files are being uploaded to Supabase only (Appwrite not configured)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDualStorage().catch(console.error);
