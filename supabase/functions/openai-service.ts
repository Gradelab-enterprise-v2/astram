export interface OpenAIServiceOptions {
  model?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
  retries?: number;
}

export interface OpenAIVisionRequest {
  prompt: string;
  imageUrls: string[];
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  error?: unknown;
}

export function createOpenAIService(
  apiKey: string,
  options: OpenAIServiceOptions = {}
) {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }

  const defaultOptions = {
    model: "gpt-4o", // Using gpt-4o as default for better OCR
    defaultTemperature: 0.0,
    defaultMaxTokens: 4000, // Increased default tokens
    timeout: 120000, // 120 seconds timeout (increased from 60000)
    retries: 2, // Default to 2 retry
    ...options,
  };

  // Test connection to OpenAI API
  const testConnection = async (): Promise<ConnectionTestResult> => {
    try {
      console.log(`Testing connection to OpenAI API...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for test
      
      try {
        // Use a minimal API call just to check connectivity
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Connection test failed with status ${response.status}: ${errorText}`);
          
          let message = `Connection test failed with status ${response.status}`;
          
          if (response.status === 401) {
            message = "Authentication failed. Please check your OpenAI API key.";
          } else if (response.status === 403) {
            message = "Access denied. Please check your OpenAI API key and ensure you have appropriate permissions.";
          }
          
          return {
            success: false,
            message,
            error: new Error(errorText),
          };
        }
        
        return {
          success: true,
          message: "Successfully connected to OpenAI API",
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      console.error("OpenAI API connection error:", error);
      
      let message = "OpenAI API connection failed";
      
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          message = "Connection timed out. Please check your network.";
        } else {
          message = `${message}: ${error.message}`;
        }
      }
      
      return {
        success: false,
        message,
        error,
      };
    }
  };
  
  // Function to fetch with timeout and retries
  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries: number) => {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
      try {
        // Exponential backoff for retries
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s delay
          console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Create a new controller for each attempt
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.log(`Request timeout after ${defaultOptions.timeout / 1000} seconds`);
        }, defaultOptions.timeout);
        
        try {
          const fetchOptions = {
            ...options,
            signal: controller.signal
          };
          
          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
      }
    }
    
    throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError?.message || "Unknown error"}`);
  };
  
  const processImagesWithVision = async (request: OpenAIVisionRequest) => {
    const model = defaultOptions.model;
      
    try {
      // Log details
      console.log(`Processing ${request.imageUrls.length} images with ${model}`);
      
      // Special handling for answer key extractions
      const isAnswerKey = request.system?.toLowerCase().includes('answer key') || 
                           request.prompt.toLowerCase().includes('answer key');
      
      // Prepare the image content array
      const content = [];
      
      // Determine if this is an answer key extraction and use appropriate prompting
      if (isAnswerKey) {
        console.log("Using specialized handling for answer key extraction");
        
        content.push({
          type: "text",
          text: "CRITICAL OCR TASK: This is an answer key image containing text that must be extracted completely. Extract ALL visible text from this image, exactly as it appears."
        });
      } else {
        // Regular extraction prompt
        content.push({
          type: "text",
          text: request.prompt
        });
      }
      
      // Add images to content
      for (const imageUrl of request.imageUrls) {
        try {
          // Fetch the image as binary data
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for image fetch
          
          try {
            const imageResponse = await fetch(
              imageUrl, 
              { 
                method: 'GET',
                headers: {
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                },
                signal: controller.signal
              }
            );
            
            clearTimeout(timeoutId);
            
            if (!imageResponse.ok) {
              throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
            }
            
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
            const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
            
            // Always use high detail for better OCR quality
            content.push({
              type: "image_url",
              image_url: {
                url: `data:${contentType};base64,${base64Image}`,
                detail: "high" // Request high detail for better OCR
              }
            });
            
            console.log(`Successfully processed image: ${imageUrl}`);
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        } catch (error) {
          console.error(`Error processing image ${imageUrl}:`, error);
          // Add a text note about the failed image instead
          content.push({
            type: "text",
            text: `[Failed to process image: ${error.message}]`,
          });
        }
      }
      
      // Enhanced system message with stronger instructions for answer keys
      let systemMessage = '';
      
      if (isAnswerKey) {
        systemMessage = `Extract text from this image`;
      } else {
        systemMessage = request.system || 'Extract what is written in image ';
      }
      
      // Format request body
      const requestBody = JSON.stringify({
        model: model,
        max_tokens: request.max_tokens || defaultOptions.defaultMaxTokens,
        temperature: isAnswerKey ? 0.0 : (request.temperature || defaultOptions.defaultTemperature), // Force 0 temperature for answer keys
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content }
        ]
      });
      
      console.log(`Sending request to OpenAI using model ${model}...`);
      
      // First attempt - standard request
      let response = await fetchWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: requestBody
        },
        defaultOptions.retries
      );
      
      if (!response.ok) {
        let errorMessage = `OpenAI API returned status ${response.status}`;
        
        try {
          const errorJson = await response.json();
          if (errorJson.error) {
            errorMessage += `: ${errorJson.error.message || errorJson.error}`;
          }
        } catch (e) {
          // If can't parse JSON, try to get text
          const errorText = await response.text();
          errorMessage += `: ${errorText}`;
        }
        
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      let result = await response.json();
      console.log(`Response received from ${model}`);
      
      // Extract the content from the response
      if (result && result.choices && result.choices.length > 0) {
        let extractedText = result.choices[0]?.message?.content || "";
        
        // Check for placeholder responses
        const placeholderPhrases = [
          "unable to process",
          "can't process",
          "cannot process",
          "I don't have the ability",
          "I cannot",
          "If you can provide",
          "I'm unable",
          "I am unable",
          "I can't see",
          "not able to see"
        ];
        
        const containsPlaceholder = placeholderPhrases.some(phrase => 
          extractedText.toLowerCase().includes(phrase.toLowerCase())
        );
        
        // For answer keys, if we got a placeholder response, retry with a different approach
        if (isAnswerKey && containsPlaceholder) {
          console.log("Detected placeholder response for answer key, retrying with stronger instructions...");
          
          // Second attempt with even stronger instructions
          const retrySystemMessage = `You are an OCR engine. You are looking at an image that contains text. 
          
EXTREMELY IMPORTANT: YOU MUST EXTRACT ALL TEXT VISIBLE IN THE IMAGE.

This image contains an answer key with clear visible text. 
DO NOT respond with "I'm unable to process images" - extract whatever text you can see.
DO NOT add any commentary, disclaimers or explanations.
Just provide the raw text content, formatted appropriately.

This is a CRITICAL task for an educational system.`;

          const retryUserContent = [
            { 
              type: "text", 
              text: "URGENT: Extract ALL visible text from this answer key image exactly as it appears. This is a pure OCR task - just read and transcribe the text." 
            },
            ...content.filter(item => item.type === "image_url")
          ];
          
          const retryRequestBody = JSON.stringify({
            model: model,
            max_tokens: 4000,
            temperature: 0.0,
            messages: [
              { role: "system", content: retrySystemMessage },
              { role: "user", content: retryUserContent }
            ]
          });
          
          console.log("Sending retry request for answer key extraction...");
          
          try {
            const retryResponse = await fetchWithRetry(
              'https://api.openai.com/v1/chat/completions',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: retryRequestBody
              },
              1 // One retry for this second attempt
            );
            
            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              
              if (retryResult && retryResult.choices && retryResult.choices.length > 0) {
                const retryText = retryResult.choices[0]?.message?.content || "";
                
                // Check if retry also returned a placeholder
                const retryContainsPlaceholder = placeholderPhrases.some(phrase => 
                  retryText.toLowerCase().includes(phrase.toLowerCase())
                );
                
                if (!retryContainsPlaceholder && retryText.length > 20) {
                  console.log("Successfully extracted text with retry approach");
                  extractedText = retryText;
                } else {
                  console.log("Retry also failed, using original text");
                  // Let's use a clearer error message instead of placeholder text
                  if (retryContainsPlaceholder) {
                    return {
                      combinedResult: "ERROR: The OCR service was unable to properly extract text from the answer key image. The image may be unclear or have poor quality. Please try uploading a clearer image.",
                      rawResponse: result
                    };
                  }
                }
              }
            }
          } catch (retryError) {
            console.error("Error in retry attempt:", retryError);
          }
        }
        
        // Final check for placeholder text
        if (placeholderPhrases.some(phrase => extractedText.toLowerCase().includes(phrase.toLowerCase()))) {
          console.error("Final result still contains placeholder response");
          return {
            combinedResult: "ERROR: The OCR service was unable to properly extract text from this image. Please try with a clearer image or contact support.",
            rawResponse: result
          };
        }
        
        return {
          combinedResult: extractedText,
          rawResponse: result
        };
      } else {
        console.warn(`Response format unexpected:`, result);
        return {
          combinedResult: `[No text content found in response]`,
          rawResponse: result
        };
      }
    } catch (error) {
      console.error(`Error processing images:`, error);
      throw error;
    }
  };
  
  return {
    testConnection,
    processImagesWithVision,
  };
}