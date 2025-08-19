import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { AzureOpenAI } from 'https://esm.sh/openai@latest';
import { corsHeaders } from '../_shared/cors.ts';

// Azure OpenAI configuration
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY');
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT');
const AZURE_OPENAI_DEPLOYMENT = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
const AZURE_OPENAI_API_VERSION = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-04-01-preview';

// Supabase configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Batch processing configuration
const BATCH_SIZE = 10; // Process 10 images per batch
const MAX_CONCURRENT_BATCHES = 3; // Run up to 3 batches concurrently

// Create a Supabase client with the service role key for admin actions
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    console.log(`Processing ${base64Images.length} images for sheet ID: ${sheetId} using batch processing`);

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

    // Process images using batch processing with multiple concurrent batches
    const extractedTexts = await processImagesInBatches(base64Images);
    
    // Combine all extracted texts with page markers
    const completeExtractedText = extractedTexts.join("\n\n");
    console.log('Batch text extraction completed');

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

/**
 * Process images in batches with multiple concurrent batches
 */
async function processImagesInBatches(base64Images: string[]): Promise<string[]> {
  const batches = createBatches(base64Images, BATCH_SIZE);
  console.log(`Created ${batches.length} batches of ${BATCH_SIZE} images each`);

  const results: string[] = [];
  
  // Process batches with controlled concurrency
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
    console.log(`Processing batches ${i + 1}-${Math.min(i + MAX_CONCURRENT_BATCHES, batches.length)} concurrently`);
    
    const batchPromises = currentBatches.map(async (batch, batchIndex) => {
      const batchNumber = i + batchIndex + 1;
      console.log(`Starting batch ${batchNumber} with ${batch.length} images`);
      return await processBatch(batch, batchNumber);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
  }

  return results;
}

/**
 * Create batches from an array
 */
function createBatches<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Process a single batch of images
 */
async function processBatch(images: string[], batchNumber: number): Promise<string[]> {
  const batchPromises = images.map(async (base64Image, index) => {
    const globalIndex = (batchNumber - 1) * BATCH_SIZE + index;
    try {
      console.log(`Processing image ${globalIndex + 1} in batch ${batchNumber}`);
      const extractedText = await extractTextFromImage(base64Image, globalIndex);
      return `=== PAGE ${globalIndex + 1} ===\n\n${extractedText}`;
    } catch (error) {
      console.error(`Error processing image ${globalIndex + 1} in batch ${batchNumber}:`, error);
      return `=== PAGE ${globalIndex + 1} ===\n\n[Error processing page ${globalIndex + 1}: ${error.message}]`;
    }
  });

  return await Promise.all(batchPromises);
}

/**
 * Extract text from a single image using Azure OpenAI
 */
async function extractTextFromImage(base64Image: string, pageNumber: number): Promise<string> {
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
