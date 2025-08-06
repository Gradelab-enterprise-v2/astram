import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { AzureOpenAI } from 'https://esm.sh/openai@latest';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Edge function configuration for remote-only setup
const getEdgeFunctionConfig = () => {
  // Use remote Supabase URL for edge functions
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://mfnhgldghrnjrwlhtvor.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }
  
  // Create service role client for edge functions
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  return {
    supabase,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  };
};

// Configuration
const OPENAI_TIMEOUT = 300000; // 5 minutes
const AZURE_TIMEOUT = 120000; // 2 minutes
const MAX_RETRIES = 3;
const MAX_PAGES_PER_REQUEST = 10;

// API Keys and Configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY');
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT');
const AZURE_OPENAI_DEPLOYMENT = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
const AZURE_OPENAI_API_VERSION = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-04-01-preview';

// Get Supabase configuration
const { supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEdgeFunctionConfig();

interface ExtractionRequest {
  // Common fields
  documentType?: 'question' | 'answer' | 'student-sheet' | 'chapter-material';
  prompt?: string;
  pageIndex?: number;
  
  // For URL-based images (legacy extract-text)
  imageUrls?: string[];
  paperId?: string; // For test papers
  
  // For base64 images (legacy extract-handwritten)
  base64Images?: string[];
  sheetId?: string; // For student sheets and chapter materials
}

interface ExtractionResponse {
  success: boolean;
  extractedText?: string;
  pageCount?: number;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData: ExtractionRequest = await req.json();
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

    // Determine which API to use based on document type and available keys
    const useAzure = documentType === 'student-sheet' || documentType === 'chapter-material';
    
    if (useAzure) {
      if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
        throw new Error('Azure OpenAI configuration missing for student sheet extraction');
      }
      return await extractWithAzure(requestData);
    } else {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      return await extractWithOpenAI(requestData);
    }

  } catch (error) {
    console.error('Error in extract-text function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function extractWithOpenAI(requestData: ExtractionRequest): Promise<Response> {
  const { imageUrls, documentType = 'question', prompt, pageIndex = 0 } = requestData;

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('No image URLs provided');
  }

  const systemPrompt = documentType === 'answer' 
    ? `You are an OCR tool specialized in extracting content from educational answer keys. Your task is CRITICAL for student evaluation.

IMPORTANT INSTRUCTIONS:
1. Extract ALL text content visible in the document with perfect accuracy
2. Do not summarize or interpret - extract the exact text as it appears
3. Focus on maintaining the exact structure, formatting, and mathematical notation
4. If you cannot read any part of the text, mark it as [UNREADABLE] instead of apologizing
5. For answer keys, pay special attention to:
   - Question numbers and their corresponding answers
   - Mathematical equations and formulas
   - Step-by-step solutions
   - Marking schemes or point distributions
6. NEVER respond with "I'm sorry" or "I cannot" - always extract whatever text you can see
7. If the image quality is poor, extract what you can and mark unclear parts as [UNREADABLE]`
    : 'You are an OCR tool specialized in extracting content from educational question papers. Focus on accurately capturing questions, instructions, options (if any), and maintain the structure of the document. Preserve all mathematical equations, symbols, and special characters exactly as they appear. If you cannot read any part of the text, mark it as [UNREADABLE] instead of apologizing.';

  let retries = MAX_RETRIES;
  let lastError = null;

  while (retries > 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT);

      const userContent = [
        { type: 'text', text: `${prompt || (documentType === 'answer' 
          ? 'CRITICAL OCR TASK: This is an answer key image. Extract ALL visible text exactly as it appears, maintaining structure and formatting. Pay special attention to question numbers, answers, and any marking schemes. If any text is unclear, mark it as [UNREADABLE].'
          : 'Extract all text from these images while preserving formatting, line breaks, and structure. Include any mathematical equations, symbols, or special characters exactly as they appear. If any text is unclear or unreadable, mark it as [UNREADABLE].')}\n\nProcessing pages ${pageIndex + 1} to ${pageIndex + imageUrls.length} of the document.` }
      ];
      
      // Add all images to the request
      for (const imageUrl of imageUrls) {
        userContent.push({
          type: 'image_url',
          image_url: { 
            url: imageUrl,
            detail: retries === MAX_RETRIES ? 'high' : 'low'
          }
        });
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ];
          
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: messages,
          max_tokens: 8000,
          temperature: 0,
          response_format: { type: "text" }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      const extractedText = data.choices[0].message.content;

      // Check for generic apology messages
      if (extractedText.toLowerCase().includes("i'm sorry") || 
          extractedText.toLowerCase().includes("i cannot") || 
          extractedText.toLowerCase().includes("i can't")) {
        if (documentType === 'answer' && retries > 1) {
          throw new Error('The model returned an unhelpful response. Retrying with stronger instructions.');
        }
        throw new Error('The model returned an unhelpful response. Please try again.');
      }

      // For answer keys, validate the extracted text
      if (documentType === 'answer') {
        const hasQuestionNumbers = /\b\d+\.|\bQ\.?\s*\d+/i.test(extractedText);
        const hasAnswers = /answer|solution|mark|point/i.test(extractedText);
        
        if (!hasQuestionNumbers && !hasAnswers && retries > 1) {
          throw new Error('Extracted text does not appear to contain answer key content. Retrying with stronger instructions.');
        }
      }
  
      return new Response(
        JSON.stringify({
          success: true,
          extractedText,
          pageCount: imageUrls.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      lastError = error;
      retries--;
      
      if (error.name === 'AbortError') {
        console.error(`Request timed out (attempt ${MAX_RETRIES - retries}/${MAX_RETRIES})`);
        if (imageUrls.length > 1) {
          console.log(`Retrying with fewer pages (${Math.ceil(imageUrls.length / 2)}) due to timeout`);
          const halfUrls = imageUrls.slice(0, Math.ceil(imageUrls.length / 2));
          return await extractWithOpenAI({ ...requestData, imageUrls: halfUrls });
        }
      } else {
        console.error(`Error in attempt ${MAX_RETRIES - retries}/${MAX_RETRIES}:`, error);
      }

      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, MAX_RETRIES - retries) * 1000));
      }
    }
  }

  throw lastError || new Error('Failed to process images after multiple attempts');
}

async function extractWithAzure(requestData: ExtractionRequest): Promise<Response> {
  const { base64Images, sheetId, documentType = 'student-sheet' } = requestData;

  if (!base64Images || base64Images.length === 0) {
    throw new Error('No base64 images provided');
  }

  // Update status if sheetId is provided
  if (sheetId) {
    const tableName = documentType === 'chapter-material' ? 'analysis_history' : 'student_answer_sheets';
    const { error: updateError } = await supabase.from(tableName).update({
      status: 'processing',
      has_extracted_text: false,
      extracted_text: 'Processing...'
    }).eq('id', sheetId);

    if (updateError) {
      console.error('Error updating status:', updateError);
    }
  }

  // Process each image individually
  const extractedTextPromises = base64Images.map(async (base64Image, index) => {
    try {
      console.log(`Processing image ${index + 1} of ${base64Images.length}`);
      
      if (!base64Image || typeof base64Image !== 'string') {
        throw new Error(`Invalid base64Image parameter for page ${index + 1}`);
      }
      
      const extractedText = await extractTextFromImageWithAzure(base64Image, index, documentType);
      return `=== PAGE ${index + 1} ===\n\n${extractedText}`;
    } catch (error) {
      console.error(`Error extracting text from image ${index + 1}:`, error);
      return `=== PAGE ${index + 1} ===\n\n[Error processing page ${index + 1}: ${error.message || 'Unknown error'}]`;
    }
  });

  // Wait for all text extraction to complete
  const extractedPageTexts = await Promise.all(extractedTextPromises);
  const completeExtractedText = extractedPageTexts.join("\n\n");

  console.log('Text extraction completed');
  
  // Validate that we got meaningful text
  if (!completeExtractedText || completeExtractedText.trim().length === 0) {
    throw new Error('No text was extracted from the images. Please try again.');
  }

  // Update the database if sheetId is provided
  if (sheetId) {
    const tableName = documentType === 'chapter-material' ? 'analysis_history' : 'student_answer_sheets';
    const { error: saveError } = await supabase.from(tableName).update({
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    extractedText: completeExtractedText
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function extractTextFromImageWithAzure(base64Image: string, pageNumber: number, documentType: string): Promise<string> {
  try {
    console.log(`Using Azure OpenAI GPT-4 Vision for image ${pageNumber + 1} text extraction`);

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
      const systemPrompt = documentType === 'chapter-material' 
        ? "You are an expert at extracting text from educational documents and chapter materials. Extract all handwritten and typed text from all images provided. IMPORTANT: For each image, clearly indicate which page number it represents. Format your response with clear page separators like '=== PAGE 1 ===', '=== PAGE 2 ===', etc. for each image in the order provided."
        : "You are an expert at extracting text from student answer sheets. Extract all handwritten and typed text from the image.";

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