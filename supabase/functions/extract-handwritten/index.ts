import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { AzureOpenAI } from 'https://esm.sh/openai@latest';
import { corsHeaders } from '../_shared/cors.ts';
import { getEdgeFunctionConfig } from '../_shared/dual-config.ts';

// Azure OpenAI configuration
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY');
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT');
const AZURE_OPENAI_DEPLOYMENT = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
const AZURE_OPENAI_API_VERSION = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-04-01-preview';

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
    if (!AZURE_OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Azure OpenAI API key missing'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Azure OpenAI configuration missing (endpoint or deployment)'
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
    console.log(`Using Azure OpenAI GPT-4 Vision for image ${pageNumber + 1} text extraction`);

    // Create Azure OpenAI client
    const options = {
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiKey: AZURE_OPENAI_API_KEY,
      deployment: AZURE_OPENAI_DEPLOYMENT,
      apiVersion: AZURE_OPENAI_API_VERSION
    };
    const client = new AzureOpenAI(options);

    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout

    try {
      // Call Azure OpenAI API with the vision model to extract text from the image
      const response = await client.chat.completions.create({
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
        max_completion_tokens: 800,
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      clearTimeout(timeoutId);

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error("Invalid response from Azure OpenAI API");
      }

      return response.choices[0].message.content;
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


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { AzureOpenAI } from 'https://esm.sh/openai@latest';
import { corsHeaders } from '../_shared/cors.ts';
// Azure OpenAI configuration
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY');
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT');
const AZURE_OPENAI_DEPLOYMENT = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
const AZURE_OPENAI_API_VERSION = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-04-01-preview';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Create a Supabase client with the service role key for admin actions
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  let sheetId = '';
  try {
    // Make sure we have the required environment variables
    if (!AZURE_OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Azure OpenAI API key missing'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Azure OpenAI configuration missing (endpoint or deployment)'
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
    const { sheetId: requestSheetId, base64Images } = requestData;
    sheetId = requestSheetId;
    if (!sheetId || !base64Images || !Array.isArray(base64Images) || base64Images.length === 0) {
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
    console.log(`Processing ${base64Images.length} images for sheet ID: ${sheetId}`);
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
    const extractedTextPromises = base64Images.map(async (base64Image, index)=>{
      try {
        console.log(`Processing image ${index + 1} of ${base64Images.length}`);
        const extractedText = await extractTextFromImage(base64Image, index);
        // Format the extracted text with page markers
        return `=== PAGE ${index + 1} ===\n\n${extractedText}`;
      } catch (error) {
        console.error(`Error extracting text from image ${index + 1}:`, error);
        return `=== PAGE ${index + 1} ===\n\n[Error processing page ${index + 1}: ${error.message}]`;
      }
    });
    // Wait for all text extraction to complete
    const extractedPageTexts = await Promise.all(extractedTextPromises);
    // Combine all page texts (they already have page markers)
    const completeExtractedText = extractedPageTexts.join("\n\n");
    console.log('Text extraction completed');
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
    console.log(`Using Azure OpenAI GPT-4 Vision for image ${pageNumber + 1} text extraction`);
    // Create Azure OpenAI client
    const options = {
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiKey: AZURE_OPENAI_API_KEY,
      deployment: AZURE_OPENAI_DEPLOYMENT,
      apiVersion: AZURE_OPENAI_API_VERSION
    };
    const client = new AzureOpenAI(options);
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(()=>controller.abort(), 120000); // 120 seconds timeout
    try {
      // Call Azure OpenAI API with the vision model to extract text from the image
      const response = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting text from student answer sheets. Extract all handwritten and typed text from the image."
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
        max_completion_tokens: 800,
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });
      clearTimeout(timeoutId);
      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error("Invalid response from Azure OpenAI API");
      }
      return response.choices[0].message.content;
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
