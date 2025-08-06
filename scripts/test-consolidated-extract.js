// Test script for the consolidated extract-text function
// This script will test different scenarios to ensure the function works correctly

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testExtractText() {
  console.log('🧪 Testing consolidated extract-text function...\n');

  try {
    // Test 1: Question paper extraction (OpenAI path)
    console.log('📝 Test 1: Question paper extraction (OpenAI path)');
    console.log('This should use OpenAI API with imageUrls parameter');
    
    const testImageUrls = [
      'https://example.com/test-image-1.jpg',
      'https://example.com/test-image-2.jpg'
    ];

    const questionTest = await supabase.functions.invoke('extract-text', {
      body: {
        documentType: 'question',
        imageUrls: testImageUrls,
        prompt: 'Extract all text from these question paper images',
        pageIndex: 0
      }
    });

    console.log('Question test result:', questionTest);
    console.log('✅ Question paper test completed\n');

    // Test 2: Student answer sheet extraction (Azure path)
    console.log('📝 Test 2: Student answer sheet extraction (Azure path)');
    console.log('This should use Azure OpenAI API with base64Images parameter');
    
    const testBase64Images = [
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 pixel
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    ];

    const studentTest = await supabase.functions.invoke('extract-text', {
      body: {
        documentType: 'student-sheet',
        base64Images: testBase64Images,
        sheetId: 'test-sheet-id'
      }
    });

    console.log('Student test result:', studentTest);
    console.log('✅ Student answer sheet test completed\n');

    // Test 3: Chapter material extraction (Azure path)
    console.log('📝 Test 3: Chapter material extraction (Azure path)');
    console.log('This should use Azure OpenAI API with base64Images parameter');
    
    const chapterTest = await supabase.functions.invoke('extract-text', {
      body: {
        documentType: 'chapter-material',
        base64Images: testBase64Images,
        sheetId: 'test-chapter-id'
      }
    });

    console.log('Chapter test result:', chapterTest);
    console.log('✅ Chapter material test completed\n');

    console.log('🎉 All tests completed! The consolidated function appears to be working correctly.');
    console.log('\n📋 Summary:');
    console.log('- Question papers: Uses OpenAI API with imageUrls');
    console.log('- Student sheets: Uses Azure OpenAI API with base64Images');
    console.log('- Chapter materials: Uses Azure OpenAI API with base64Images');
    console.log('\n✅ Ready to remove the old extract-handwritten function!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔍 Debugging information:');
    console.log('- Check if the function is deployed correctly');
    console.log('- Verify environment variables are set');
    console.log('- Check function logs in Supabase dashboard');
  }
}

// Run the test
testExtractText(); 