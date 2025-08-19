import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AzureOpenAI } from 'https://esm.sh/openai@latest';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const azureOpenAIKey = Deno.env.get('AZURE_OPENAI_API_KEY');
const azureOpenAIEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
const azureOpenAIDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
const azureOpenAIApiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-12-01-preview';

// GPT-5 Azure OpenAI Configuration
const azureGPT5Key = Deno.env.get('AZURE_OPENAI_GPT5_API_KEY');
const azureGPT5Endpoint = Deno.env.get('AZURE_OPENAI_GPT5_ENDPOINT');
const azureGPT5Deployment = Deno.env.get('AZURE_OPENAI_GPT5_DEPLOYMENT');
const azureGPT5ApiVersion = Deno.env.get('AZURE_OPENAI_GPT5_API_VERSION') || '2025-01-01-preview';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Get request data
    const { questionPaper, answerKey, studentAnswerSheet, studentInfo, preserveRawExtractedText } = await req.json();
    
    // Check if we have GPT-5 Azure OpenAI configured, then regular Azure OpenAI, otherwise fall back to OpenAI
    const useGPT5Azure = azureGPT5Key && azureGPT5Endpoint && azureGPT5Deployment;
    const useAzureOpenAI = azureOpenAIKey && azureOpenAIEndpoint && azureOpenAIDeployment;
    
    if (!useGPT5Azure && !useAzureOpenAI && !openAIApiKey) {
      throw new Error('No AI credentials configured. Please set either GPT-5 Azure OpenAI, regular Azure OpenAI, or OpenAI credentials.');
    }

    console.log("Processing evaluation for student:", studentInfo.name);
    console.log("Using GPT-5 Azure OpenAI:", useGPT5Azure);
    console.log("Using Regular Azure OpenAI:", useAzureOpenAI);
    
    if (useGPT5Azure) {
      console.log('GPT-5 Azure OpenAI Configuration:');
      console.log('- AZURE_OPENAI_GPT5_ENDPOINT:', azureGPT5Endpoint);
      console.log('- AZURE_OPENAI_GPT5_DEPLOYMENT:', azureGPT5Deployment);
      console.log('- AZURE_OPENAI_GPT5_API_VERSION:', azureGPT5ApiVersion);
      console.log('- AZURE_OPENAI_GPT5_API_KEY:', azureGPT5Key ? '[SET]' : '[NOT SET]');
    } else if (useAzureOpenAI) {
      console.log('Regular Azure OpenAI Configuration:');
      console.log('- AZURE_OPENAI_ENDPOINT:', azureOpenAIEndpoint);
      console.log('- AZURE_OPENAI_DEPLOYMENT:', azureOpenAIDeployment);
      console.log('- AZURE_OPENAI_API_VERSION:', azureOpenAIApiVersion);
      console.log('- AZURE_OPENAI_API_KEY:', azureOpenAIKey ? '[SET]' : '[NOT SET]');
    }

    console.log("Input lengths - Question paper:", questionPaper?.length || 0, "Answer key:", answerKey?.length || 0, "Student sheet:", studentAnswerSheet?.length || 0);

    // Use full length text without truncation
    const fullQuestionPaper = questionPaper;
    const fullAnswerKey = answerKey;
    const fullStudentAnswerSheet = studentAnswerSheet;

    const totalLength = (fullQuestionPaper?.length || 0) + (fullAnswerKey?.length || 0) + (fullStudentAnswerSheet?.length || 0);
    console.log("Total input length:", totalLength, "characters");

    // Create the enhanced system prompt for accurate evaluation
    const systemPrompt = `
      You are an expert AI evaluator responsible for accurately grading a student's answer sheet. Your task is CRITICAL and requires PERFECT attention to detail.

      EVALUATION REQUIREMENTS:
      1. CAREFULLY analyze the question paper to identify ALL questions, including those in different sections
      2. MATCH each question from the question paper with its corresponding answer in the answer key
      3. ALIGN student answers with the correct question numbers and sections
      4. HANDLE instruction sections properly - questions may be grouped under different instruction headers
      5. DETECT question numbering patterns (1, 2, 3... or A, B, C... or Roman numerals)
      6. IDENTIFY section breaks and instruction headers that group questions
      7. ENSURE no questions are missed due to section organization

      QUESTION DETECTION STRATEGY:
      - Look for ALL question numbers throughout the paper, not just the first section
      - Check for different numbering systems (1, 2, 3... or A, B, C... or I, II, III...)
      - Identify instruction sections that group questions (e.g., "Answer any 5 questions", "Section A", etc.)
      - Count questions in EACH section separately, then sum them up
      - Look for questions that might be numbered differently in different sections
      - Check for sub-questions (1a, 1b, 1c... or similar patterns)

      ALIGNMENT REQUIREMENTS:
      - Question number from question paper MUST match answer key question number
      - Student answer must be aligned with the correct question number
      - If student wrote answer under wrong question number, identify this misalignment
      - Handle cases where student may have skipped questions or written answers out of order
      - Verify that question content matches between question paper and answer key

      GRADING CRITERIA:
      - Award 0 marks for completely incorrect or missing answers
      - Award partial marks for partially correct answers based on answer key criteria
      - Award full marks only when student answer contains ALL key elements from answer key
      - Be strict but fair - if answer doesn't match expected content, award 0 marks
      - Consider mathematical accuracy, conceptual understanding, and completeness

      You MUST return a valid JSON object with the following structure exactly:
      {
        "student_name": "Student Name",
        "roll_no": "Roll Number",
        "class": "Class Name",
        "subject": "Subject Name",
        "total_questions_detected": 60,
        "questions_by_section": {
          "Section A": 20,
          "Section B": 25,
          "Section C": 15
        },
        "overall_performance": {
          "strengths": ["Specific strength 1", "Specific strength 2"],
          "areas_for_improvement": ["Specific area 1", "Specific area 2"],
          "study_recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
          "personalized_summary": "A detailed, personalized summary of the student's performance"
        },
        "answers": [
          {
            "question_no": 1,
            "section": "Section A",
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
            "personalized_feedback": "Specific, actionable feedback for this question",
            "alignment_notes": "Any notes about question-answer alignment or numbering issues"
          }
        ]
      }

      CRITICAL INSTRUCTIONS:
      - Count ALL questions in ALL sections of the question paper
      - Ensure question numbers are correctly aligned between question paper, answer key, and student answers
      - Handle instruction sections that may group or limit questions
      - Provide detailed feedback for each question
      - Include section information for each question
      - Add alignment_notes for any numbering or section misalignments
      - Your response MUST be valid JSON and must strictly follow this format
      - Do not include any text outside of the JSON object
      - Never use HTML or other markup in your response
      - Double-check that your response is valid JSON before sending it
    `;

    // Create a batch processing function for large question sets
    const processBatch = async (client: any, startIndex: number, batchSize: number) => {
      const endIndex = Math.min(startIndex + batchSize, 60); // Cap at 60 questions
      
      const batchPrompt = `
CRITICAL INSTRUCTION: You are processing ONLY questions ${startIndex + 1} to ${endIndex}.

Your task is to:
1. Find questions ${startIndex + 1} to ${endIndex} in the question paper
2. Match them with answers ${startIndex + 1} to ${endIndex} in the answer key
3. Find student answers for questions ${startIndex + 1} to ${endIndex}
4. Evaluate ONLY these specific questions

Question Paper (Extract questions ${startIndex + 1}-${endIndex}):
${fullQuestionPaper}

Answer Key (Extract answers ${startIndex + 1}-${endIndex}):
${fullAnswerKey}

Student Answer Sheet (Extract answers ${startIndex + 1}-${endIndex}):
${fullStudentAnswerSheet}

Student: ${studentInfo.name} | Roll: ${studentInfo.rollNumber} | Class: ${studentInfo.class} | Subject: ${studentInfo.subject}

Return ONLY the answers array for questions ${startIndex + 1} to ${endIndex} in this exact format:
[
  {
    "question_no": ${startIndex + 1},
    "section": "Section Name",
    "question": "question text",
    "expected_answer": "expected answer",
    "answer": "student answer",
    "raw_extracted_text": "student answer",
    "score": [score, total],
    "remarks": "feedback",
    "confidence": 0.95,
    "concepts": ["concept"],
    "missing_elements": ["missing"],
    "answer_matches": false,
    "personalized_feedback": "feedback",
    "alignment_notes": "notes"
  }
]

IMPORTANT: 
- Process ONLY questions ${startIndex + 1} to ${endIndex}
- Return ONLY the JSON array
- Do not include any other text or explanations
- Ensure each question number matches the index`;

      const batchResponse = await client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert evaluator. Process the given questions and return ONLY the answers array in valid JSON format.'
          },
          {
            role: 'user',
            content: batchPrompt
          }
        ],
        temperature: 0.1,
        response_format: {
          type: "json_object"
        },
        max_tokens: 16384
      });

      return batchResponse.choices[0].message.content;
    };

    // Create the main evaluation prompt
    const userPrompt = `
IMPORTANT: You MUST count EVERY question in the question paper before proceeding.

STEP 1 - QUESTION COUNTING:
Question Paper: ${fullQuestionPaper}

Count ALL questions systematically:
- Look for question numbers (1, 2, 3... or A, B, C... or I, II, III...)
- Check ALL sections of the paper
- Count sub-questions (1a, 1b, 1c...)
- Do NOT miss any questions
- Write down the total count

STEP 2 - ANSWER KEY MATCHING:
Answer Key: ${fullAnswerKey}

Match each question from step 1 with its answer key counterpart
- Ensure question numbers match exactly
- Verify question content matches

STEP 3 - STUDENT ANSWER ALIGNMENT:
Student Answer Sheet: ${fullStudentAnswerSheet}

Align student answers with the correct question numbers
- Check if student wrote answers under correct numbers
- Identify any misalignments

STEP 4 - GRADING:
Grade each answer using the answer key as the standard
- Award 0 for incorrect/missing answers
- Award partial marks for incomplete answers
- Award full marks only for complete answers

Student Information:
- Name: ${studentInfo.name}
- Roll Number: ${studentInfo.rollNumber}
- Class: ${studentInfo.class}
- Subject: ${studentInfo.subject}

CRITICAL: Return ONLY valid JSON with the exact structure specified in the system message.`;

    // First, try to count questions and use batch processing if needed
    console.log("Starting evaluation process...");
    
    // Try to get the total question count first
    const countPrompt = `
Count the total number of questions in this question paper. Look for ALL question numbers throughout the entire paper.
Return ONLY a number.

Question Paper: ${fullQuestionPaper}`;
    
    let totalQuestions = 0;
    let batchClient;
    let parsedResult;
    
    try {
      // Determine which client to use for counting
      if (useGPT5Azure) {
        batchClient = new AzureOpenAI({
          endpoint: azureGPT5Endpoint,
          apiKey: azureGPT5Key,
          deployment: azureGPT5Deployment,
          apiVersion: azureGPT5ApiVersion
        });
      } else if (useAzureOpenAI) {
        batchClient = new AzureOpenAI({
          endpoint: azureOpenAIEndpoint,
          apiKey: azureOpenAIKey,
          deployment: azureOpenAIDeployment,
          apiVersion: azureOpenAIApiVersion
        });
      } else {
        throw new Error("No Azure client available for batch processing");
      }
      
      console.log("Created batch client for question counting...");
      
      const countResponse = await batchClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Count ALL questions in the paper and return only the number. Be thorough and count every question.'
          },
          {
            role: 'user',
            content: countPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      });
      
      totalQuestions = parseInt(countResponse.choices[0].message.content.trim());
      console.log("Detected total questions:", totalQuestions);
      
      if (totalQuestions > 5) { // Process in batches if more than 5 questions
        console.log("Large question set detected, processing in batches...");
        
        // Process in batches of 8 questions (smaller batches for better reliability)
        const batchSize = 8;
        const allAnswers = [];
        
        for (let i = 0; i < totalQuestions; i += batchSize) {
          console.log(`Processing batch ${Math.floor(i/batchSize) + 1}: questions ${i+1} to ${Math.min(i+batchSize, totalQuestions)}`);
          
          try {
            console.log(`Starting batch ${Math.floor(i/batchSize) + 1} for questions ${i+1} to ${Math.min(i+batchSize, totalQuestions)}`);
            const batchResult = await processBatch(batchClient, i, batchSize);
            console.log(`Batch ${Math.floor(i/batchSize) + 1} raw result:`, batchResult.substring(0, 200));
            
            const batchAnswers = JSON.parse(batchResult);
            console.log(`Batch ${Math.floor(i/batchSize) + 1} parsed:`, batchAnswers);
            
            if (Array.isArray(batchAnswers)) {
              allAnswers.push(...batchAnswers);
              console.log(`Added ${batchAnswers.length} answers from batch ${Math.floor(i/batchSize) + 1}`);
            } else if (batchAnswers.answers && Array.isArray(batchAnswers.answers)) {
              allAnswers.push(...batchAnswers.answers);
              console.log(`Added ${batchAnswers.length} answers from batch ${Math.floor(i/batchSize) + 1}`);
            } else {
              console.warn(`Batch ${Math.floor(i/batchSize) + 1} returned unexpected format:`, batchAnswers);
            }
            
            console.log(`Batch ${Math.floor(i/batchSize) + 1} completed: ${batchAnswers.length || 0} answers`);
          } catch (batchError) {
            console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);
            console.error(`Batch ${Math.floor(i/batchSize) + 1} error details:`, batchError.message);
            // Continue with next batch
          }
        }
        
        // Create the final result
        parsedResult = {
          student_name: studentInfo.name,
          roll_no: studentInfo.rollNumber,
          class: studentInfo.class,
          subject: studentInfo.subject,
          total_questions_detected: totalQuestions,
          questions_by_section: {"All Questions": totalQuestions},
          overall_performance: {
            strengths: ["Batch processed evaluation completed"],
            areas_for_improvement: ["Review all questions systematically"],
            study_recommendations: ["Focus on weak areas identified"],
            personalized_summary: "Evaluation completed through batch processing"
          },
          answers: allAnswers
        };
        
        console.log("Batch processing completed with", allAnswers.length, "answers");
      }
    } catch (countError) {
      console.error("Failed to count questions or process batches:", countError);
      console.log("Falling back to normal processing...");
    }
    
    // If batch processing didn't work, fall back to normal processing
    if (!parsedResult) {
      const modelSource = useGPT5Azure ? "GPT-5 Azure OpenAI" : useAzureOpenAI ? "Azure OpenAI" : "OpenAI";
      console.log(`Calling ${modelSource} API for evaluation with extended timeout (180 seconds)...`);
    
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180 seconds timeout

    try {
      let response;
      
      if (useGPT5Azure) {
        // Use Azure OpenAI SDK with GPT-5
        console.log(`Using GPT-5 Azure OpenAI SDK for evaluation with deployment: ${azureGPT5Deployment}`);
        const options = {
          endpoint: azureGPT5Endpoint,
          apiKey: azureGPT5Key,
          deployment: azureGPT5Deployment,
          apiVersion: azureGPT5ApiVersion
        };
        const client = new AzureOpenAI(options);
        
        try {
          response = await client.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userPrompt
              }
            ],
            temperature: 0.1,
            response_format: {
              type: "json_object"
            },
            max_tokens: 16000 // GPT-5 limit: 16384, using 16000 for safety
          });
        } catch (azureError) {
          console.error("GPT-5 Azure OpenAI SDK error:", azureError);
          throw azureError;
        }
      } else if (useAzureOpenAI) {
        // Use Azure OpenAI SDK with regular deployment
        console.log(`Using Regular Azure OpenAI SDK for evaluation with deployment: ${azureOpenAIDeployment}`);
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
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userPrompt
              }
            ],
            temperature: 0.1,
            response_format: {
              type: "json_object"
            },
            max_tokens: 16000 // GPT-5 limit: 16384, using 16000 for safety
          });
        } catch (azureError) {
          console.error("Regular Azure OpenAI SDK error:", azureError);
          throw azureError;
        }
      } else {
        // Use OpenAI API directly with GPT-4o
        console.log("Using OpenAI API for evaluation");
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Use faster model
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userPrompt
              }
            ],
            temperature: 0.1,
            response_format: {
              type: "json_object"
            },
            max_tokens: 30000, // Increased to prevent truncation
            stream: false
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

      // Handle response based on the source (GPT-5 Azure SDK vs Regular Azure SDK vs direct fetch)
      let evaluationResultContent;
      if (useGPT5Azure || useAzureOpenAI) {
        // Azure OpenAI SDK returns the response directly
        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message || !response.choices[0].message.content) {
          const source = useGPT5Azure ? "GPT-5 Azure OpenAI" : "Regular Azure OpenAI";
          console.error(`Invalid response format from ${source}:`, response);
          throw new Error(`Invalid response format from ${source}`);
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
        
                // Always attempt batch processing for large question sets to ensure complete coverage
        console.log("Attempting batch processing for complete question coverage...");
        
        // Try to get the total question count first
        const countPrompt = `
Count the total number of questions in this question paper. Look for ALL question numbers throughout the entire paper.
Return ONLY a number.

Question Paper: ${fullQuestionPaper}`;
        
        let totalQuestions = 0;
        let batchClient;
        
        try {
          // Determine which client to use for counting
          if (useGPT5Azure) {
            batchClient = new AzureOpenAI({
              endpoint: azureGPT5Endpoint,
              apiKey: azureGPT5Key,
              deployment: azureGPT5Deployment,
              apiVersion: azureGPT5ApiVersion
            });
          } else if (useAzureOpenAI) {
            batchClient = new AzureOpenAI({
              endpoint: azureOpenAIEndpoint,
              apiKey: azureOpenAIKey,
              deployment: azureOpenAIDeployment,
              apiVersion: azureOpenAIApiVersion
            });
          } else {
            throw new Error("No Azure client available for batch processing");
          }
          
          const countResponse = await batchClient.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'Count ALL questions in the paper and return only the number. Be thorough and count every question.'
              },
              {
                role: 'user',
                content: countPrompt
              }
            ],
            temperature: 0.1,
            max_tokens: 100
          });
          
          totalQuestions = parseInt(countResponse.choices[0].message.content.trim());
          console.log("Detected total questions:", totalQuestions);
          
          if (totalQuestions > 5) { // Process in batches if more than 5 questions
            console.log("Large question set detected, processing in batches...");
            
            // Process in batches of 8 questions (smaller batches for better reliability)
            const batchSize = 8;
            const allAnswers = [];
            
            for (let i = 0; i < totalQuestions; i += batchSize) {
              console.log(`Processing batch ${Math.floor(i/batchSize) + 1}: questions ${i+1} to ${Math.min(i+batchSize, totalQuestions)}`);
              
              try {
                console.log(`Starting batch ${Math.floor(i/batchSize) + 1} for questions ${i+1} to ${Math.min(i+batchSize, totalQuestions)}`);
                const batchResult = await processBatch(batchClient, i, batchSize);
                console.log(`Batch ${Math.floor(i/batchSize) + 1} raw result:`, batchResult.substring(0, 200));
                
                const batchAnswers = JSON.parse(batchResult);
                console.log(`Batch ${Math.floor(i/batchSize) + 1} parsed:`, batchAnswers);
                
                if (Array.isArray(batchAnswers)) {
                  allAnswers.push(...batchAnswers);
                  console.log(`Added ${batchAnswers.length} answers from batch ${Math.floor(i/batchSize) + 1}`);
                } else if (batchAnswers.answers && Array.isArray(batchAnswers.answers)) {
                  allAnswers.push(...batchAnswers.answers);
                  console.log(`Added ${batchAnswers.answers.length} answers from batch ${Math.floor(i/batchSize) + 1}`);
                } else {
                  console.warn(`Batch ${Math.floor(i/batchSize) + 1} returned unexpected format:`, batchAnswers);
                }
                
                console.log(`Batch ${Math.floor(i/batchSize) + 1} completed: ${batchAnswers.length || 0} answers`);
              } catch (batchError) {
                console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);
                console.error(`Batch ${Math.floor(i/batchSize) + 1} error details:`, batchError.message);
                // Continue with next batch
              }
            }
            
            // Create the final result
            parsedResult = {
              student_name: studentInfo.name,
              roll_no: studentInfo.rollNumber,
              class: studentInfo.class,
              subject: studentInfo.subject,
              total_questions_detected: totalQuestions,
              questions_by_section: {"All Questions": totalQuestions},
              overall_performance: {
                strengths: ["Batch processed evaluation completed"],
                areas_for_improvement: ["Review all questions systematically"],
                study_recommendations: ["Focus on weak areas identified"],
                personalized_summary: "Evaluation completed through batch processing"
              },
              answers: allAnswers
            };
            
            console.log("Batch processing completed with", allAnswers.length, "answers");
          }
        } catch (countError) {
          console.error("Failed to count questions or process batches:", countError);
          console.log("Falling back to normal processing...");
        }
        
        // If batch processing wasn't needed or failed, try normal parsing
        let parsedResult;
        if (!parsedResult) {
          // Debug: Log a sample of the result to help diagnose the issue
          console.log("Result sample (first 100 chars):", evaluationResultContent.substring(0, 100));
          
          // Try to parse the evaluation result content as JSON
          
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
                
                // Try to repair the JSON by finding the last complete answer object
                const answersMatch = fixedContent.match(/"answers":\s*\[([\s\S]*)\]/);
                if (answersMatch) {
                  const answersContent = answersMatch[1];
                  const lastCompleteAnswer = answersContent.match(/[^}]*}[^}]*$/);
                  if (lastCompleteAnswer) {
                    const repairedContent = fixedContent.replace(
                      /"answers":\s*\[[\s\S]*\]/,
                      `"answers": [${lastCompleteAnswer[0]}]`
                    );
                    try {
                      parsedResult = JSON.parse(repairedContent);
                      console.log("Successfully parsed repaired content");
                    } catch (repairError) {
                      throw new Error(`JSON parsing failed: ${parseError.message}. Response may be truncated or malformed.`);
                    }
                  } else {
                    throw new Error(`JSON parsing failed: ${parseError.message}. Response may be truncated or malformed.`);
                  }
                } else {
                  throw new Error(`JSON parsing failed: ${parseError.message}. Response may be truncated or malformed.`);
                }
              }
            } else {
              throw new Error(`JSON parsing failed: ${parseError.message}. Response may be truncated or malformed.`);
            }
          }
        }

        // Validate parsed result has the expected structure
        if (!parsedResult.student_name || !Array.isArray(parsedResult.answers)) {
          console.error("Parsed result missing required fields:", parsedResult);
          throw new Error("Parsed result missing required fields");
        }

        // Validate question count consistency
        if (parsedResult.total_questions_detected && parsedResult.answers.length !== parsedResult.total_questions_detected) {
          console.warn(`Question count mismatch: detected ${parsedResult.total_questions_detected} but got ${parsedResult.answers.length} answers`);
          // Update total_questions_detected to match actual answers
          parsedResult.total_questions_detected = parsedResult.answers.length;
        }

        // Ensure all answers have sequential question numbers
        const questionNumbers = parsedResult.answers.map(a => a.question_no).sort((a, b) => a - b);
        const expectedNumbers = Array.from({length: parsedResult.answers.length}, (_, i) => i + 1);
        
        if (JSON.stringify(questionNumbers) !== JSON.stringify(expectedNumbers)) {
          console.warn("Question numbers are not sequential, fixing...");
          parsedResult.answers.forEach((answer, index) => {
            answer.question_no = index + 1;
          });
        }

        // Ensure all answers have the correct structure and validate scoring
        parsedResult.answers.forEach((answer, index) => {
          // Make sure raw_extracted_text exists, fallback to answer if not
          if (!answer.raw_extracted_text) {
            answer.raw_extracted_text = answer.answer || "No text extracted";
          }
          
          // Validate and fix scoring
          if (!answer.score || !Array.isArray(answer.score) || answer.score.length !== 2) {
            console.warn(`Invalid score format for question ${answer.question_no}, setting to 0/1`);
            answer.score = [0, 1];
          }
          
          // Ensure score is within valid range
          if (answer.score[0] < 0 || answer.score[0] > answer.score[1]) {
            console.warn(`Invalid score ${answer.score[0]}/${answer.score[1]} for question ${answer.question_no}, fixing...`);
            answer.score[0] = Math.max(0, Math.min(answer.score[0], answer.score[1]));
          }
          
          // Ensure answer_matches flag exists and is consistent with score
          if (answer.answer_matches === undefined) {
            answer.answer_matches = answer.score[0] > 0;
          } else {
            // Fix inconsistency between answer_matches and score
            const shouldMatch = answer.score[0] > 0;
            if (answer.answer_matches !== shouldMatch) {
              console.warn(`Fixing answer_matches inconsistency for question ${answer.question_no}`);
              answer.answer_matches = shouldMatch;
            }
          }
          
          // Add clarity to remarks for non-matching answers
          if (!answer.answer_matches && (!answer.remarks || !answer.remarks.includes("doesn't match"))) {
            answer.remarks = `Answer doesn't match expected content. ${answer.remarks || ''}`;
          }
          
          // Ensure personalized_feedback exists
          if (!answer.personalized_feedback) {
            answer.personalized_feedback = answer.remarks || "Review this topic for better understanding.";
          }
          
          // Ensure section information exists
          if (!answer.section) {
            answer.section = "Main Section";
          }
          
          // Ensure alignment_notes exists
          if (!answer.alignment_notes) {
            answer.alignment_notes = "Question properly aligned";
          }
        });

        // Ensure overall_performance exists
        if (!parsedResult.overall_performance) {
          parsedResult.overall_performance = {
            strengths: [
              "Continue working to build strengths in core concepts."
            ],
            areas_for_improvement: [
              "Review the core concepts covered in this assessment."
            ],
            study_recommendations: [
              "Create a structured study plan focusing on the topics covered in this assessment."
            ],
            personalized_summary: "Focus on understanding the core concepts and practicing with examples."
          };
        }

        // Ensure questions_by_section exists
        if (!parsedResult.questions_by_section) {
          parsedResult.questions_by_section = {
            "Main Section": parsedResult.answers.length
          };
        }

        // Ensure total_questions_detected exists and is accurate
        if (!parsedResult.total_questions_detected) {
          parsedResult.total_questions_detected = parsedResult.answers.length;
        } else {
          // Validate that total_questions_detected matches actual answers
          if (parsedResult.total_questions_detected !== parsedResult.answers.length) {
            console.warn(`Correcting total_questions_detected from ${parsedResult.total_questions_detected} to ${parsedResult.answers.length}`);
            parsedResult.total_questions_detected = parsedResult.answers.length;
          }
        }

        // Log final validation results
        console.log("Final validation results:");
        console.log("- Total questions detected:", parsedResult.total_questions_detected);
        console.log("- Actual answers provided:", parsedResult.answers.length);
        console.log("- Question numbers:", parsedResult.answers.map(a => a.question_no));
        console.log("- Score ranges:", parsedResult.answers.map(a => `${a.score[0]}/${a.score[1]}`));

        console.log("Successfully parsed evaluation result as JSON");
        console.log("Total questions detected:", parsedResult.total_questions_detected);
        console.log("Questions by section:", parsedResult.questions_by_section);
        
        return new Response(JSON.stringify({
          success: true,
          evaluation: parsedResult
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
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
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error("OpenAI API request timed out after 180 seconds");
        return new Response(JSON.stringify({
          success: false,
          error: "API request timed out after 180 seconds. Please try again with a smaller input or reduce complexity."
        }), {
          status: 504,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
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
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
