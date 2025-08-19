
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AzureOpenAI } from 'https://esm.sh/openai@latest';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const azureOpenAIKey = Deno.env.get('AZURE_OPENAI_API_KEY');
const azureOpenAIEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
const azureOpenAIDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
const azureOpenAIApiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-08-01-preview';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request data
    const { questionPaper, answerKey, studentAnswerSheet, studentInfo, preserveRawExtractedText } = await req.json();

    // Check if we have Azure OpenAI configured, otherwise fall back to OpenAI
    const useAzureOpenAI = azureOpenAIKey && azureOpenAIEndpoint && azureOpenAIDeployment;
    
    if (!useAzureOpenAI && !openAIApiKey) {
      throw new Error('Neither Azure OpenAI nor OpenAI credentials are configured. Please set either Azure OpenAI credentials or OPENAI_API_KEY.');
    }

    console.log("Processing evaluation for student:", studentInfo.name);
    console.log("Using Azure OpenAI:", useAzureOpenAI);
    if (useAzureOpenAI) {
      console.log('Azure OpenAI Configuration:');
      console.log('- AZURE_OPENAI_ENDPOINT:', azureOpenAIEndpoint);
      console.log('- AZURE_OPENAI_DEPLOYMENT:', azureOpenAIDeployment);
      console.log('- AZURE_OPENAI_API_VERSION:', azureOpenAIApiVersion);
      console.log('- AZURE_OPENAI_API_KEY:', azureOpenAIKey ? '[SET]' : '[NOT SET]');
    }
    console.log("Input lengths - Question paper:", questionPaper?.length || 0, 
                "Answer key:", answerKey?.length || 0, 
                "Student sheet:", studentAnswerSheet?.length || 0);
    
    // Check if inputs are too large and truncate if necessary
    const MAX_INPUT_LENGTH = 50000; // 50KB limit per input
    const MAX_TOTAL_LENGTH = 150000; // 150KB total limit
    
    let truncatedQuestionPaper = questionPaper;
    let truncatedAnswerKey = answerKey;
    let truncatedStudentAnswerSheet = studentAnswerSheet;
    
    if (questionPaper && questionPaper.length > MAX_INPUT_LENGTH) {
      console.warn("Question paper too large, truncating from", questionPaper.length, "to", MAX_INPUT_LENGTH);
      truncatedQuestionPaper = questionPaper.substring(0, MAX_INPUT_LENGTH) + "\n\n[Content truncated due to size limits]";
    }
    
    if (answerKey && answerKey.length > MAX_INPUT_LENGTH) {
      console.warn("Answer key too large, truncating from", answerKey.length, "to", MAX_INPUT_LENGTH);
      truncatedAnswerKey = answerKey.substring(0, MAX_INPUT_LENGTH) + "\n\n[Content truncated due to size limits]";
    }
    
    if (studentAnswerSheet && studentAnswerSheet.length > MAX_INPUT_LENGTH) {
      console.warn("Student answer sheet too large, truncating from", studentAnswerSheet.length, "to", MAX_INPUT_LENGTH);
      truncatedStudentAnswerSheet = studentAnswerSheet.substring(0, MAX_INPUT_LENGTH) + "\n\n[Content truncated due to size limits]";
    }
    
    const totalLength = (truncatedQuestionPaper?.length || 0) + (truncatedAnswerKey?.length || 0) + (truncatedStudentAnswerSheet?.length || 0);
    if (totalLength > MAX_TOTAL_LENGTH) {
      console.warn("Total input length", totalLength, "exceeds limit", MAX_TOTAL_LENGTH, "- evaluation may fail");
    }

    // Create the system prompt for evaluation with explicit JSON format requirements
    const systemPrompt = `
      You are an AI evaluator responsible for grading a student's answer sheet and providing detailed, personalized feedback.
      Analyze the question paper to understand the questions and their marks.
      Analyze the answer key to understand the correct answers and valuation criteria.
      Assess the answers STRICTLY. If student's answer doesn't contain key elements from the answer key, award 0 marks.
      
      You MUST return a valid JSON object with the following structure exactly:
      {
        "student_name": "Student Name",
        "roll_no": "Roll Number",
        "class": "Class Name",
        "subject": "Subject Name",
        "overall_performance": {
          "strengths": ["Specific strength 1", "Specific strength 2"],
          "areas_for_improvement": ["Specific area 1", "Specific area 2"],
          "study_recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
          "personalized_summary": "A detailed, personalized summary of the student's performance"
        },
        "answers": [
          {
            "question_no": 1,
            "question": "The question text",
            "expected_answer": "The expected answer from answer key",
            "answer": "The student's answer",
            "raw_extracted_text": "The original extracted text from student's answer without any processing",
            "score": [assigned_score, total_score],
            "remarks": "Detailed feedback explaining why score was awarded or deducted, identify specific errors",
            "confidence": 0.95,
            "concepts": ["Concept 1", "Concept 2", "Concept 3"],
            "missing_elements": ["Example", "Formula", "Diagram"],
            "answer_matches": false,
            "personalized_feedback": "Specific, actionable feedback for this question"
          }
        ]
      }
      
      For each answer, provide:
      1. "raw_extracted_text": The EXACT text extracted from the student's answer sheet without any modification
      2. "answer": The processed version of student's answer after you've interpreted it
      3. "answer_matches": Boolean flag indicating if the student's answer contains the key elements from the expected answer
      4. "concepts": An array of 3-5 key concepts covered in the student's answer. Be specific and educational.
      5. "missing_elements": A comprehensive array indicating what's missing from the answer like "Detailed examples", "Mathematical formulas", etc.
      6. "remarks": Give specific, actionable feedback explaining the score
      7. "personalized_feedback": Provide specific, actionable feedback for this question that would help the student improve
      
      For the overall_performance section:
      1. "strengths": List 2-3 specific strengths based on the student's actual performance
      2. "areas_for_improvement": List 2-3 specific areas that need improvement
      3. "study_recommendations": List 2-3 specific study recommendations
      4. "personalized_summary": Write a detailed, personalized summary of the student's performance that includes:
         - Overall assessment of their understanding
         - Specific examples of what they did well
         - Specific areas where they struggled
         - Encouraging but honest feedback
         - Next steps for improvement
      
      IMPORTANT: 
      - Your response MUST be valid JSON and must strictly follow this format
      - Make feedback detailed, specific, and educational
      - For questions where student hasn't provided a matching answer, set score to [0, total_marks], set answer_matches to false
      - Do not include any text outside of the JSON object
      - Never use HTML or other markup in your response
      - Double-check that your response is valid JSON before sending it
      - Be specific about what the student did well and what they need to improve
      - If a student performed well, acknowledge their strengths
      - If a student struggled, provide constructive, encouraging feedback
    `;

    // Create the user prompt with the evaluation data
    const userPrompt = `
      Question Paper:
      ${truncatedQuestionPaper}
      
      Answer Key:
      ${truncatedAnswerKey}
      
      Student Answer Sheet:
      ${truncatedStudentAnswerSheet}
      
      Student Information:
      - Name: ${studentInfo.name}
      - Roll Number: ${studentInfo.rollNumber}
      - Class: ${studentInfo.class}
      - Subject: ${studentInfo.subject}
      
      Instructions:
      1. Store the exact extracted text in "raw_extracted_text"
      2. Include the "answer_matches" flag to indicate if answer matches expected content
      3. Award 0 marks for answers that don't match expected content
      4. Provide clear explanation in remarks when an answer doesn't match
      5. Generate personalized feedback for each question
      6. Create an overall performance summary that is specific to this student's actual performance
      
      Evaluate the answers and provide the response ONLY as a valid JSON object in the format specified in the system message.
      IMPORTANT: Do not include HTML tags or any formatting in your response, only pure JSON.
      Your response will be parsed as JSON, so ensure it is valid and properly formatted.
    `;

    console.log("Calling OpenAI API for evaluation with extended timeout (120 seconds)...");
    
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout
    
    try {
      let response: any;
      
      if (useAzureOpenAI) {
        // Use Azure OpenAI SDK (same as generate-questions function)
        console.log(`Using Azure OpenAI SDK for evaluation`);
        
        const options = {
          endpoint: azureOpenAIEndpoint,
          apiKey: azureOpenAIKey,
          deployment: azureOpenAIDeployment,
          apiVersion: azureOpenAIApiVersion
        };
        const client = new AzureOpenAI(options);
        
        try {
          response = await client.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1, // Lower temperature for more consistent JSON formatting
            response_format: { type: "json_object" }, // Explicitly request JSON format
            max_tokens: 8000,
          });
        } catch (azureError) {
          console.error("Azure OpenAI SDK error:", azureError);
          throw azureError;
        }
      } else {
        // Use OpenAI API directly
        console.log("Using OpenAI API for evaluation");
        
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
            max_tokens: 8000,
          }),
          signal: controller.signal
        });
        
        if (!openAIResponse.ok) {
          const error = await openAIResponse.json();
          console.error("OpenAI API error:", error);
          throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
        }
        
        response = await openAIResponse.json();
      }
      
      clearTimeout(timeoutId);

      // Handle response based on the source (Azure SDK vs direct fetch)
      let evaluationResultContent: string;
      
      if (useAzureOpenAI) {
        // Azure OpenAI SDK returns the response directly
        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message || !response.choices[0].message.content) {
          console.error("Invalid response format from Azure OpenAI:", response);
          throw new Error("Invalid response format from Azure OpenAI");
        }
        evaluationResultContent = response.choices[0].message.content;
      } else {
        // Direct OpenAI fetch returns JSON that needs parsing
        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message || !response.choices[0].message.content) {
          console.error("Invalid response format from OpenAI:", response);
          throw new Error("Invalid response format from OpenAI");
        }
        evaluationResultContent = response.choices[0].message.content;
      }

      try {
        console.log("Received evaluation result from OpenAI");
        
        // Debug: Log a sample of the result to help diagnose the issue
        console.log("Result sample (first 100 chars):", evaluationResultContent.substring(0, 100));
        
        // Try to parse the evaluation result content as JSON
        let parsedResult;
        
        // Make sure content is a string and clean any potential non-JSON content
        if (typeof evaluationResultContent !== 'string') {
          throw new Error(`Content is not a string: ${typeof evaluationResultContent}`);
        }
        
        // Remove any BOM characters that might be present
        let cleanedContent = evaluationResultContent.replace(/^\uFEFF/, '');
        
        // Log the full content length for debugging
        console.log("Full response length:", cleanedContent.length);
        console.log("Response preview (first 200 chars):", cleanedContent.substring(0, 200));
        console.log("Response preview (last 200 chars):", cleanedContent.substring(Math.max(0, cleanedContent.length - 200)));
        
        // Check if it starts with something that's not valid JSON start character
        if (cleanedContent.charAt(0) !== '{' && cleanedContent.charAt(0) !== '[') {
          console.error("Content doesn't start with valid JSON:", cleanedContent.substring(0, 100));
          
          // Try to extract JSON from content if it's embedded somewhere
          const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedContent = jsonMatch[0];
            console.log("Extracted potential JSON content:", cleanedContent.substring(0, 100));
          } else {
            throw new Error("Could not find valid JSON in the response");
          }
        }
        
        // Try to parse with detailed error information
        try {
          parsedResult = JSON.parse(cleanedContent);
        } catch (parseError) {
          console.error("JSON parse error details:", parseError);
          console.error("Error position:", parseError.message);
          
          // Try to identify the problematic area
          const errorMatch = parseError.message.match(/position (\d+)/);
          if (errorMatch) {
            const position = parseInt(errorMatch[1]);
            const start = Math.max(0, position - 50);
            const end = Math.min(cleanedContent.length, position + 50);
            console.error("Problematic area around position", position, ":", cleanedContent.substring(start, end));
          }
          
          // Try to fix common JSON issues
          let fixedContent = cleanedContent;
          
          // Try to find the last complete object if the response was truncated
          const lastBraceIndex = fixedContent.lastIndexOf('}');
          if (lastBraceIndex > 0) {
            fixedContent = fixedContent.substring(0, lastBraceIndex + 1);
            console.log("Attempting to parse truncated content ending at position:", lastBraceIndex);
            
            try {
              parsedResult = JSON.parse(fixedContent);
              console.log("Successfully parsed truncated content");
            } catch (truncatedError) {
              console.error("Failed to parse even truncated content:", truncatedError);
              throw new Error(`JSON parsing failed: ${parseError.message}. Response may be truncated or malformed.`);
            }
          } else {
            throw new Error(`JSON parsing failed: ${parseError.message}. Response may be truncated or malformed.`);
          }
        }
        
        // Validate parsed result has the expected structure
        if (!parsedResult.student_name || !Array.isArray(parsedResult.answers)) {
          console.error("Parsed result missing required fields:", parsedResult);
          throw new Error("Parsed result missing required fields");
        }
        
        // Ensure all answers have the correct structure
        parsedResult.answers.forEach((answer, index) => {
          // Make sure raw_extracted_text exists, fallback to answer if not
          if (!answer.raw_extracted_text) {
            answer.raw_extracted_text = answer.answer || "No text extracted";
          }
          
          // Ensure answer_matches flag exists
          if (answer.answer_matches === undefined) {
            // Determine if answer matches based on score
            answer.answer_matches = answer.score && answer.score[0] > 0;
          }
          
          // Add clarity to remarks for non-matching answers
          if (!answer.answer_matches && (!answer.remarks || !answer.remarks.includes("doesn't match"))) {
            answer.remarks = `Answer doesn't match expected content. ${answer.remarks || ''}`;
          }
          
          // Ensure personalized_feedback exists
          if (!answer.personalized_feedback) {
            answer.personalized_feedback = answer.remarks || "Review this topic for better understanding.";
          }
        });
        
        // Ensure overall_performance exists
        if (!parsedResult.overall_performance) {
          parsedResult.overall_performance = {
            strengths: ["Continue working to build strengths in core concepts."],
            areas_for_improvement: ["Review the core concepts covered in this assessment."],
            study_recommendations: ["Create a structured study plan focusing on the topics covered in this assessment."],
            personalized_summary: "Focus on understanding the core concepts and practicing with examples."
          };
        }
        
        console.log("Successfully parsed evaluation result as JSON");

        return new Response(JSON.stringify({ 
          success: true, 
          evaluation: parsedResult 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error("Failed to parse OpenAI response as JSON:", error);
        console.error("Raw response:", evaluationResultContent ? evaluationResultContent.substring(0, 500) : 'No content');
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          rawResponse: evaluationResultContent ? evaluationResultContent.substring(0, 500) : null
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error("OpenAI API request timed out after 120 seconds");
        return new Response(JSON.stringify({ 
          success: false, 
          error: "API request timed out after 120 seconds. Please try again with a smaller input or reduce complexity." 
        }), {
          status: 504, // Gateway Timeout
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error in evaluate-answer function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
