// Debug script to get the actual error message from extract-text function
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

  // Test student sheets with detailed error handling
  console.log('📝 Testing student sheets with detailed error...');
  try {
    const studentSheetRequest = {
      documentType: 'student-sheet',
      sheetId: 'test-sheet-123',
      base64Images: ['base64-image-data-1', 'base64-image-data-2']
    };

    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/extract-text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentSheetRequest)
    });

    const responseText = await response.text();
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response Body:', responseText);

    if (!response.ok) {
      console.log('❌ Function failed with status:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (parseError) {
        console.log('Could not parse error response as JSON');
      }
    } else {
      console.log('✅ Function succeeded');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

debugExtractTextFunction(); 