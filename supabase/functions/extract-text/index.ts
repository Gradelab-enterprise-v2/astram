import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { AzureOpenAI } from 'https://esm.sh/openai@latest';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const AZURE_TIMEOUT = 120000; // 2 minutes
const IMAGE_DOWNLOAD_TIMEOUT = 60000; // 1 minute for image downloads
const MAX_RETRIES = 3;
const MAX_PAGES_PER_REQUEST = 20;

// Azure OpenAI Configuration
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY');
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT');
const AZURE_OPENAI_DEPLOYMENT = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
const AZURE_OPENAI_API_VERSION = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-12-01-preview';

// Supabase Configuration
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
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { 
      documentType = 'question', 
      prompt, 
      pageIndex = 0, 
      imageUrls, 
      base64Images, 
      sheetId, 
      paperId 
    } = requestData;

    // Validate input
    if (!imageUrls && !base64Images) {
      throw new Error('Either imageUrls or base64Images must be provided');
    }

    if (imageUrls && (!Array.isArray(imageUrls) || imageUrls.length === 0)) {
      throw new Error('imageUrls must be a non-empty array');
    }

    if (base64Images && (!Array.isArray(base64Images) || base64Images.length === 0)) {
      throw new Error('base64Images must be a non-empty array');
    }

    // Validate required IDs based on document type
    if (documentType === 'student-sheet' || documentType === 'chapter-material') {
      if (!sheetId) {
        throw new Error('sheetId is required for student-sheet and chapter-material document types');
      }
    }

    if (documentType === 'question' || documentType === 'answer') {
      if (!paperId) {
        throw new Error('paperId is required for question and answer document types');
      }
    }

    // Check Azure OpenAI configuration
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      throw new Error('Azure OpenAI configuration missing');
    }

    // Use Azure OpenAI for all document types now
    if (base64Images) {
      return await extractWithAzure(requestData);
    } else if (imageUrls) {
      // Convert image URLs to base64 for Azure processing
      const convertedRequestData = {
        ...requestData,
        base64Images: await convertImageUrlsToBase64(imageUrls)
      };
      return await extractWithAzure(convertedRequestData);
    } else {
      throw new Error('No images provided');
    }

  } catch (error) {
    console.error('Error in extract-text function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unknown error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

/**
 * Convert image URLs to base64 for Azure processing
 */
async function convertImageUrlsToBase64(imageUrls: string[]): Promise<string[]> {
  const base64Images: string[] = [];
  
  for (const url of imageUrls) {
    try {
      if (url.startsWith('data:image/')) {
        // Already base64, extract the data
        const base64Match = url.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
        if (base64Match && base64Match[1]) {
          base64Images.push(base64Match[1]);
        }
      } else {
        // HTTP URL, download and convert
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        base64Images.push(base64);
      }
    } catch (error) {
      console.error(`Error converting image to base64: ${url}`, error);
      throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
  }
  
  return base64Images;
}

/**
 * Extract text using Azure OpenAI with batch processing
 */
async function extractWithAzure(requestData: any) {
  const { base64Images, sheetId, documentType = 'chapter-material' } = requestData;

  if (!base64Images || base64Images.length === 0) {
    throw new Error('No base64 images provided');
  }

  // Update status if sheetId is provided
  if (sheetId) {
    const tableName = documentType === 'student-sheet' ? 'student_answer_sheets' : 'analysis_history';
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        status: 'processing',
        has_extracted_text: false,
        extracted_text: 'Processing...'
      })
      .eq('id', sheetId);

    if (updateError) {
      console.error('Error updating status:', updateError);
    }
  }

  // Process images using batch processing with multiple concurrent batches
  const extractedTexts = await processImagesInBatches(base64Images, documentType, sheetId);
  
  const completeExtractedText = extractedTexts.join("\n\n");
  console.log('Batch text extraction completed');

  // Validate that we got meaningful text
  if (!completeExtractedText || completeExtractedText.trim().length === 0) {
    throw new Error('No text was extracted from the images. Please try again.');
  }

  // Update the database if sheetId is provided
  if (sheetId) {
    const tableName = documentType === 'student-sheet' ? 'student_answer_sheets' : 'analysis_history';
    const { error: saveError } = await supabase
      .from(tableName)
      .update({
        extracted_text: completeExtractedText,
        has_extracted_text: true,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', sheetId);

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
}

/**
 * Process images in batches with multiple concurrent batches
 */
async function processImagesInBatches(base64Images: string[], documentType: string, sheetId?: string): Promise<string[]> {
  const batches = createBatches(base64Images, BATCH_SIZE);
  console.log(`Created ${batches.length} batches of ${BATCH_SIZE} images each for ${documentType}`);

  const results: string[] = [];
  
  // Process batches with controlled concurrency
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);
    console.log(`Processing batches ${i + 1}-${Math.min(i + MAX_CONCURRENT_BATCHES, batches.length)} concurrently`);
    
    const batchPromises = currentBatches.map(async (batch, batchIndex) => {
      const batchNumber = i + batchIndex + 1;
      console.log(`Starting batch ${batchNumber} with ${batch.length} images`);
      return await processBatch(batch, batchNumber, documentType, sheetId);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
    
    // Update progress in database if sheetId is provided
    if (sheetId) {
      const progress = Math.min(((i + MAX_CONCURRENT_BATCHES) * BATCH_SIZE / base64Images.length) * 100, 100);
      const tableName = documentType === 'student-sheet' ? 'student_answer_sheets' : 'analysis_history';
      await supabase
        .from(tableName)
        .update({
          extracted_text: `Processing... ${Math.round(progress)}% complete (${Math.min((i + MAX_CONCURRENT_BATCHES) * BATCH_SIZE, base64Images.length)} of ${base64Images.length} pages)`
        })
        .eq('id', sheetId);
    }
    
    // Small delay between batch groups to avoid overwhelming the API
    if (i + MAX_CONCURRENT_BATCHES < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
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
async function processBatch(images: string[], batchNumber: number, documentType: string, sheetId?: string): Promise<string[]> {
  const batchPromises = images.map(async (base64Image, index) => {
    const globalIndex = (batchNumber - 1) * BATCH_SIZE + index;
    try {
      console.log(`Processing image ${globalIndex + 1} in batch ${batchNumber}`);
      const extractedText = await extractTextFromImageWithAzure(base64Image, globalIndex, documentType);
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
async function extractTextFromImageWithAzure(base64Image: string, pageNumber: number, documentType: string): Promise<string> {
  try {
    console.log(`Using Azure OpenAI GPT-4 Vision for image ${pageNumber + 1} text extraction (${documentType})`);

    const options = {
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiKey: AZURE_OPENAI_API_KEY,
      deployment: AZURE_OPENAI_DEPLOYMENT,
      apiVersion: AZURE_OPENAI_API_VERSION
    };

    const client = new AzureOpenAI(options);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AZURE_TIMEOUT);

    try {
      // Customize system prompt based on document type with enhanced MCQ and detail extraction
      let systemPrompt = "You are an expert at extracting text from educational documents with PERFECT accuracy. Your task is CRITICAL - extract EVERY SINGLE DETAIL visible in the document without missing anything. IMPORTANT: For each image, clearly indicate which page number it represents. Format your response with clear page separators like '=== PAGE 1 ===', '=== PAGE 2 ===', etc. for each image in the order provided.";

      if (documentType === 'student-sheet') {
        systemPrompt += " MCQ EXTRACTION: For student answer sheets, carefully observe and extract MCQ circles and answer selections exactly as they appear. Look for circles, ovals, checkmarks, or any marks around answer options (A, B, C, D). Extract these naturally as they appear in the document. Also extract: handwritten content, mathematical equations, diagrams, question numbers, student responses, any marks or annotations, erased answers, partial answers, and ALL visible text. Convert mathematical equations to LaTeX format using $$ delimiters, and convert diagrams to Mermaid format using ```mermaid code blocks.";
      } else if (documentType === 'answer') {
        systemPrompt += " COMPREHENSIVE EXTRACTION: For answer keys, extract EVERY detail including: question numbers, ALL answer options (A, B, C, D), correct answers, mathematical equations and formulas, step-by-step solutions, marking schemes, point distributions, any explanatory text, diagrams, and ALL visible content. Convert mathematical equations to LaTeX format using $$ delimiters.";
      } else if (documentType === 'question') {
        systemPrompt += " COMPLETE EXTRACTION: For question papers, extract EVERY element: questions and their complete structure, ALL answer options (A, B, C, D), mathematical equations and formulas, diagrams and visual elements, instructions and options, question numbers, marks allocation, and ANY other visible text. Convert mathematical equations to LaTeX format using $$ delimiters.";
      }

      systemPrompt += " DIAGRAM EXTRACTION: Look carefully for ANY visual diagrams, flowcharts, schematics, or structured visual elements. Convert ALL diagrams to proper Mermaid format using ```mermaid code blocks. Use correct Mermaid syntax with proper node definitions: [Node Name] not just Node Name. For decision points, use {Decision?} format. For processes, use [Process Name] format. For start/end points, use [Start] or [End] format. Use proper arrow syntax: -->, -.->, ==>, etc. Include ALL visible elements and connections from the diagram. If you see a diagram but are unsure of the type, use 'graph TD' as default. CRITICAL: Each node must be defined on its own line with complete labels. Never truncate node labels or leave them incomplete. If you cannot clearly see all elements of a diagram, describe it in text instead of creating invalid Mermaid syntax. MATHEMATICAL EQUATIONS: Convert ALL mathematical expressions to LaTeX format using $$ delimiters. Use proper LaTeX syntax: \\\\frac{}{}, \\\\sqrt{}, \\\\int, \\\\sum, \\\\pi, \\\\theta, etc. FINAL CHECK: Before responding, ensure you have extracted EVERY visible text, symbol, mark, circle, number, and detail from the image. If anything is unclear, mark it as [UNCLEAR] but still attempt to extract it.";

      const response = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ALL text and details from this ${documentType} image exactly as they appear. Pay special attention to: MCQ circles and answer selections (circles, ovals, checkmarks around A, B, C, D options), handwritten content, typed text, question numbers, mathematical equations, diagrams, marks allocation, student responses, and any other visible marks or annotations. Extract circles and marks naturally as they appear in the document. If anything is unclear, mark it as [UNCLEAR] but still attempt to extract it.`
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
        console.error(`Processing image ${pageNumber + 1} timed out after ${AZURE_TIMEOUT / 1000} seconds`);
        throw new Error(`Request timed out after ${AZURE_TIMEOUT / 1000} seconds`);
      }
      throw fetchError;
    }

  } catch (error) {
    console.error(`Error extracting text from image:`, error);
    throw error;
  }
}
