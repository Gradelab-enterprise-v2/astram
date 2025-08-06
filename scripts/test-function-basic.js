// Basic test to check if the extract-text function is responding
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('- VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('- VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBasicFunction() {
  console.log('🧪 Testing basic function connectivity...\n');

  try {
    // Test 1: Basic function call with minimal parameters
    console.log('📝 Test 1: Basic function call');
    
    const result = await supabase.functions.invoke('extract-text', {
      body: {
        documentType: 'question',
        imageUrls: ['https://example.com/test.jpg']
      }
    });

    console.log('Function response:', result);
    
    if (result.error) {
      console.error('❌ Function error:', result.error);
    } else {
      console.log('✅ Function is responding');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔍 Possible issues:');
    console.log('- Function not deployed');
    console.log('- Environment variables missing');
    console.log('- Network connectivity issues');
    console.log('- Function code has syntax errors');
  }
}

// Run the test
testBasicFunction(); 