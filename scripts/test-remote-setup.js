// Test script to verify remote-only Supabase setup
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Test environment variables
console.log('🔍 Testing remote-only Supabase setup...\n');

const remoteUrl = process.env.VITE_SUPABASE_URL;
const remoteKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('📋 Environment Variables:');
console.log('- Remote URL:', remoteUrl ? '✅ Set' : '❌ Missing');
console.log('- Remote Key:', remoteKey ? '✅ Set' : '❌ Missing');
console.log('');

if (!remoteUrl || !remoteKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create client
const supabase = createClient(remoteUrl, remoteKey);

async function testRemoteSetup() {
  try {
    console.log('🧪 Testing remote database connection...');
    
    // Test remote database
    const { data: dbData, error: dbError } = await supabase
      .from('students')
      .select('id')
      .limit(1);
    
    if (dbError) {
      console.error('❌ Remote database error:', dbError);
    } else {
      console.log('✅ Remote database connection successful');
    }
    
    console.log('\n🧪 Testing remote storage connection...');
    
    // Test remote storage
    const { data: storageData, error: storageError } = await supabase.storage
      .listBuckets();
    
    if (storageError) {
      console.error('❌ Remote storage error:', storageError);
    } else {
      console.log('✅ Remote storage connection successful');
      console.log('- Available buckets:', storageData.map(b => b.name));
    }
    
    console.log('\n🎉 Remote-only setup test completed!');
    console.log('📋 Summary:');
    console.log('- Remote database: Used for all data operations');
    console.log('- Remote storage: Used for file uploads');
    console.log('- Remote functions: Used for edge functions');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRemoteSetup(); 