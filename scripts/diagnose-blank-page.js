// Diagnostic script to help identify blank page issues
const { createClient } = require('@supabase/supabase-js');

// Check environment variables
console.log('🔍 Environment Variables Check:');
console.log('- VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('- VITE_GOOGLE_CLIENT_ID:', process.env.VITE_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseIssues() {
  console.log('🧪 Running diagnostics...\n');

  try {
    // Test 1: Basic Supabase connection
    console.log('📝 Test 1: Supabase connection');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Supabase connection failed:', sessionError);
    } else {
      console.log('✅ Supabase connection successful');
      console.log('- Session:', session.session ? 'Active' : 'None');
    }
    console.log('');

    // Test 2: Function availability
    console.log('📝 Test 2: Edge function availability');
    try {
      const { data, error } = await supabase.functions.invoke('extract-text', {
        body: {
          documentType: 'question',
          imageUrls: ['https://example.com/test.jpg']
        }
      });
      
      if (error) {
        console.error('❌ Function error:', error);
      } else {
        console.log('✅ Function is responding');
        console.log('- Response:', data);
      }
    } catch (funcError) {
      console.error('❌ Function call failed:', funcError.message);
    }
    console.log('');

    // Test 3: Database tables
    console.log('📝 Test 3: Database tables access');
    try {
      const { data: papers, error: papersError } = await supabase
        .from('test_papers')
        .select('id')
        .limit(1);
      
      if (papersError) {
        console.error('❌ test_papers table access failed:', papersError);
      } else {
        console.log('✅ test_papers table accessible');
      }
    } catch (dbError) {
      console.error('❌ Database access failed:', dbError.message);
    }

    // Test 4: Storage buckets
    console.log('📝 Test 4: Storage buckets');
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Storage access failed:', bucketsError);
      } else {
        console.log('✅ Storage accessible');
        console.log('- Available buckets:', buckets.map(b => b.name));
      }
    } catch (storageError) {
      console.error('❌ Storage access failed:', storageError.message);
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Run diagnostics
diagnoseIssues(); 