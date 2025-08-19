// Debug script to get detailed error information from extract-text function
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function debugExtractTextFunction() {
  console.log('🔍 Debugging extract-text function...\n');

  // Test with minimal valid request
  console.log('📝 Testing student sheet request with sheetId...');
  try {
    const request = {
      documentType: 'student-sheet',
      sheetId: 'test-sheet-123',
      imageUrls: ['https://example.com/test-image.png']
    };

    console.log('Request body:', JSON.stringify(request, null, 2));

    const { data, error } = await supabase.functions.invoke('extract-text', {
      body: request
    });

    if (error) {
      console.log('❌ Error response:');
      console.log('Error message:', error.message);
      console.log('Error context:', error.context);
      
      // Try to get the response body for more details
      if (error.context && error.context.body) {
        try {
          const responseText = await error.context.body.text();
          console.log('Response body:', responseText);
        } catch (bodyError) {
          console.log('Could not read response body:', bodyError.message);
        }
      }
    } else {
      console.log('✅ Success response:', data);
    }
  } catch (error) {
    console.log('❌ Exception caught:', error.message);
    console.log('Error details:', error);
  }
}

debugExtractTextFunction(); 