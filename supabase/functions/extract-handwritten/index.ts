import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';
import { getEdgeFunctionConfig } from '../_shared/dual-config.ts';

// OpenAI configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Get Supabase configuration for edge functions (always uses remote)
const { supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEdgeFunctionConfig();

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  let sheetId = '';

  try {
    // Make sure we have the required environment variables
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'OpenAI API key missing'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Supabase configuration missing'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // Parse request body
    const requestData = await req.json();
    const { sheetId: requestSheetId, base64Images: base64Images1 } = requestData;
    sheetId = requestSheetId;

    if (!sheetId || !base64Images1 || !Array.isArray(base64Images1) || base64Images1.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing sheet ID or images'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    console.log(`Processing ${base64Images1.length} images for sheet ID: ${sheetId}`);
    console.log(`First image length: ${base64Images1[0]?.length || 'undefined'}`);
    console.log(`Image types: ${base64Images1.map((img, i) => `${i}: ${typeof img}`).join(', ')}`);

    // Update the sheet status to processing
    const { error: updateError } = await supabase.from('student_answer_sheets').update({
      status: 'processing',
      has_extracted_text: false,
      extracted_text: 'Processing...'
    }).eq('id', sheetId);

    if (updateError) {
      console.error('Error updating sheet status:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to update sheet status'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    // Process each image individually and extract text
    const extractedTextPromises = base64Images1.map(async (base64Image, index) => {
      try {
        console.log(`Processing image ${index + 1} of ${base64Images1.length}`);
        
        // Validate the base64Image parameter
        if (!base64Image || typeof base64Image !== 'string') {
          throw new Error(`Invalid base64Image parameter for page ${index + 1}`);
        }
        
        const extractedText = await extractTextFromImage(base64Image, index);
        // Format the extracted text with page markers
        return `=== PAGE ${index + 1} ===\n\n${extractedText}`;
      } catch (error) {
        console.error(`Error extracting text from image ${index + 1}:`, error);
        return `=== PAGE ${index + 1} ===\n\n[Error processing page ${index + 1}: ${error.message || 'Unknown error'}]`;
      }
    });

    // Wait for all text extraction to complete
    const extractedPageTexts = await Promise.all(extractedTextPromises);

    // Combine all page texts (they already have page markers)
    const completeExtractedText = extractedPageTexts.join("\n\n");

    console.log('Text extraction completed');
    
    // Validate that we got meaningful text
    if (!completeExtractedText || completeExtractedText.trim().length === 0) {
      throw new Error('No text was extracted from the images. Please try again.');
    }

    // Update the student_answer_sheets table with the extracted text
    const { error: saveError } = await supabase.from('student_answer_sheets').update({
      extracted_text: completeExtractedText,
      has_extracted_text: true,
      status: 'completed',
      updated_at: new Date().toISOString()
    }).eq('id', sheetId);

    if (saveError) {
      console.error('Error saving extracted text:', saveError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to save extracted text'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    return new Response(JSON.stringify({
      success: true,
      extractedText: completeExtractedText
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in extract-handwritten function:', error);

    // Try to update the sheet status to failed
    try {
      if (sheetId) {
        await supabase.from('student_answer_sheets').update({
          status: 'failed',
          has_extracted_text: true,
          extracted_text: `Text extraction failed: ${error.message || 'An unexpected error occurred'}. You can try again using the retry button.`,
          updated_at: new Date().toISOString()
        }).eq('id', sheetId);
      }
    } catch (updateError) {
      console.error('Error updating sheet status to failed:', updateError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});

async function extractTextFromImage(base64Image, pageNumber) {
  try {
    console.log(`Using OpenAI GPT-4 Vision for image ${pageNumber + 1} text extraction`);

    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout

    try {
      // Call OpenAI API with the vision model to extract text from the image
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: "system",
              content: "You are an expert at extracting text from student answer sheets. Extract all handwritten and typed text from all images provided. IMPORTANT: For each image, clearly indicate which page number it represents. Format your response with clear page separators like '=== PAGE 1 ===', '=== PAGE 2 ===', etc. for each image in the order provided."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract all text from this image.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 800,
          temperature: 0.1,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response from OpenAI API");
      }

      return data.choices[0].message.content;
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error(`Processing image ${pageNumber + 1} timed out after 120 seconds`);
        throw new Error("Request timed out after 120 seconds");
      }

      throw fetchError;
    }
  } catch (error) {
    console.error(`Error extracting text from image:`, error);
    throw error;
  }
}
