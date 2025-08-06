// Test script to verify the extract-text function works correctly
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testExtractTextFunction() {
  console.log('🧪 Testing extract-text function with different document types...\n');

  // Test 1: Test papers (imageUrls + paperId)
  console.log('📄 Test 1: Test papers (imageUrls + paperId)');
  try {
    const testPaperRequest = {
      documentType: 'question',
      paperId: 'test-paper-123',
      imageUrls: ['https://example.com/test-image-1.png', 'https://example.com/test-image-2.png']
    };

    const { data: testPaperData, error: testPaperError } = await supabase.functions.invoke('extract-text', {
      body: testPaperRequest
    });

    if (testPaperError) {
      console.log('❌ Test papers error:', testPaperError.message);
      if (testPaperError.context) {
        console.log('Context:', testPaperError.context);
      }
    } else {
      console.log('✅ Test papers request accepted');
    }
  } catch (error) {
    console.log('❌ Test papers failed:', error.message);
  }

  console.log('');

  // Test 2: Student sheets (base64Images + sheetId)
  console.log('📝 Test 2: Student sheets (base64Images + sheetId)');
  try {
    const studentSheetRequest = {
      documentType: 'student-sheet',
      sheetId: 'test-sheet-123',
      base64Images: ['base64-image-data-1', 'base64-image-data-2']
    };

    const { data: studentSheetData, error: studentSheetError } = await supabase.functions.invoke('extract-text', {
      body: studentSheetRequest
    });

    if (studentSheetError) {
      console.log('❌ Student sheets error:', studentSheetError.message);
      if (studentSheetError.context) {
        console.log('Context:', studentSheetError.context);
      }
    } else {
      console.log('✅ Student sheets request accepted');
    }
  } catch (error) {
    console.log('❌ Student sheets failed:', error.message);
  }

  console.log('');

  // Test 3: Chapter materials (base64Images + sheetId)
  console.log('📚 Test 3: Chapter materials (base64Images + sheetId)');
  try {
    const chapterMaterialRequest = {
      documentType: 'chapter-material',
      sheetId: 'test-chapter-123',
      base64Images: ['base64-image-data-1', 'base64-image-data-2']
    };

    const { data: chapterMaterialData, error: chapterMaterialError } = await supabase.functions.invoke('extract-text', {
      body: chapterMaterialRequest
    });

    if (chapterMaterialError) {
      console.log('❌ Chapter materials error:', chapterMaterialError.message);
      if (chapterMaterialError.context) {
        console.log('Context:', chapterMaterialError.context);
      }
    } else {
      console.log('✅ Chapter materials request accepted');
    }
  } catch (error) {
    console.log('❌ Chapter materials failed:', error.message);
  }

  console.log('');

  // Test 4: Invalid request (missing required fields)
  console.log('🚫 Test 4: Invalid request (missing required fields)');
  try {
    const invalidRequest = {
      documentType: 'student-sheet',
      // Missing sheetId and base64Images
    };

    const { data: invalidData, error: invalidError } = await supabase.functions.invoke('extract-text', {
      body: invalidRequest
    });

    if (invalidError) {
      console.log('✅ Invalid request properly rejected:', invalidError.message);
    } else {
      console.log('❌ Invalid request was accepted (should have been rejected)');
    }
  } catch (error) {
    console.log('✅ Invalid request properly rejected:', error.message);
  }

  console.log('\n🎉 Testing completed!');
}

testExtractTextFunction(); 