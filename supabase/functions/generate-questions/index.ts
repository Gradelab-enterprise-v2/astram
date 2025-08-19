
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration constants
const MAX_QUESTIONS_PER_CHUNK = 25; // Generate questions in smaller chunks
const MAX_RETRIES = 3;
const TIMEOUT_MS = 120000; // 2 minutes timeout

interface QuestionGenerationRequest {
  subject: any;
  topic: string;
  questionType?: 'mcq' | 'theory' | 'mixed'; // Added 'mixed' option
  mcqCount?: number;
  difficultyLevel: number;
  theoryDistribution?: any;
  courseOutcomeDistribution?: any;
  bloomsTaxonomy?: any;
  chapterContent?: string;
  courseOutcomes?: any[]; // Optional course outcomes
}

interface Question {
  question_text: string;
  question_type: "MCQ" | "Theory";
  topic: string;
  difficulty: number;
  bloom_level: string;
  course_outcome?: string;
  options?: Array<{text: string, is_correct: boolean}>;
  answer_text?: string;
  marks?: number;
}

// Add validation function for database constraints
function validateQuestionForDatabase(question: Question): boolean {
  // Validate question_type constraint
  if (question.question_type !== 'MCQ' && question.question_type !== 'Theory') {
    console.warn(`Invalid question_type: ${question.question_type}`);
    return false;
  }

  // Validate difficulty range constraint
  if (question.difficulty < 0 || question.difficulty > 100) {
    console.warn(`Invalid difficulty: ${question.difficulty}`);
    return false;
  }

  // Validate marks constraint
  if (question.question_type === 'MCQ' && question.marks !== null && question.marks !== undefined) {
    console.warn(`MCQ question should not have marks: ${question.marks}`);
    return false;
  }

  if (question.question_type === 'Theory' && question.marks !== null && question.marks !== undefined) {
    if (![1, 2, 4, 8].includes(question.marks)) {
      console.warn(`Theory question has invalid marks: ${question.marks}`);
      return false;
    }
  }

  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // OpenAI Configuration
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY.');
    }
    
    console.log('Using OpenAI for question generation');
    
    const requestData: QuestionGenerationRequest = await req.json();
    const {
      subject,
      topic,
      questionType = 'mcq', // Default to mcq if not specified
      mcqCount = 10,
      difficultyLevel,
      theoryDistribution,
      courseOutcomeDistribution,
      bloomsTaxonomy,
      chapterContent,
      courseOutcomes = [] // Make courseOutcomes optional with default empty array
    } = requestData;

    console.log('Generating questions with parameters:', {
      subject: subject?.name,
      topic,
      questionType,
      mcqCount,
      difficultyLevel,
      theoryDistribution: theoryDistribution ? 'Provided' : 'N/A',
      bloomsTaxonomy: bloomsTaxonomy ? 'Provided' : 'N/A',
      courseOutcomesCount: courseOutcomes?.length || 0,
      contentLength: chapterContent?.length || 0
    });

    // Calculate total questions needed
    let totalQuestions = 0;
    let mcqQuestionsNeeded = 0;
    let theoryQuestionsNeeded = 0;
    
    if (questionType === 'mcq') {
      totalQuestions = mcqCount;
      mcqQuestionsNeeded = mcqCount;
    } else if (questionType === 'theory') {
      totalQuestions = (theoryDistribution?.mark1Questions || 0) + 
        (theoryDistribution?.mark2Questions || 0) + 
        (theoryDistribution?.mark4Questions || 0) + 
        (theoryDistribution?.mark8Questions || 0);
      theoryQuestionsNeeded = totalQuestions;
    } else if (questionType === 'mixed') {
      // For mixed, generate both types
      mcqQuestionsNeeded = mcqCount || 0;
      theoryQuestionsNeeded = (theoryDistribution?.mark1Questions || 0) + 
        (theoryDistribution?.mark2Questions || 0) + 
        (theoryDistribution?.mark4Questions || 0) + 
        (theoryDistribution?.mark8Questions || 0);
      totalQuestions = mcqQuestionsNeeded + theoryQuestionsNeeded;
    }

    console.log(`Total questions to generate: ${totalQuestions}`);

    // Generate questions in chunks
    const allQuestions: Question[] = [];
    
    if (questionType === 'mixed') {
      // Generate MCQ and Theory questions separately
      console.log(`Generating ${mcqQuestionsNeeded} MCQ questions and ${theoryQuestionsNeeded} Theory questions`);
      
      // Generate MCQ questions
      if (mcqQuestionsNeeded > 0) {
        const mcqChunks = Math.ceil(mcqQuestionsNeeded / MAX_QUESTIONS_PER_CHUNK);
        for (let chunkIndex = 0; chunkIndex < mcqChunks; chunkIndex++) {
          const questionsInThisChunk = Math.min(
            MAX_QUESTIONS_PER_CHUNK, 
            mcqQuestionsNeeded - (chunkIndex * MAX_QUESTIONS_PER_CHUNK)
          );
          
          console.log(`Generating MCQ chunk ${chunkIndex + 1}/${mcqChunks} with ${questionsInThisChunk} questions`);
          
          const chunkQuestions = await generateQuestionChunk({
            OPENAI_API_KEY,
            subject,
            topic,
            questionType: 'mcq',
            questionsInThisChunk,
            difficultyLevel,
            theoryDistribution,
            courseOutcomeDistribution,
            bloomsTaxonomy,
            chapterContent,
            courseOutcomes: courseOutcomes || [],
          }, chunkIndex, mcqChunks);
          
          allQuestions.push(...chunkQuestions);
        }
      }
      
      // Generate Theory questions
      if (theoryQuestionsNeeded > 0) {
        const theoryChunks = Math.ceil(theoryQuestionsNeeded / MAX_QUESTIONS_PER_CHUNK);
        for (let chunkIndex = 0; chunkIndex < theoryChunks; chunkIndex++) {
          const questionsInThisChunk = Math.min(
            MAX_QUESTIONS_PER_CHUNK, 
            theoryQuestionsNeeded - (chunkIndex * MAX_QUESTIONS_PER_CHUNK)
          );
          
          console.log(`Generating Theory chunk ${chunkIndex + 1}/${theoryChunks} with ${questionsInThisChunk} questions`);
          
          const chunkQuestions = await generateQuestionChunk({
            OPENAI_API_KEY,
            subject,
            topic,
            questionType: 'theory',
            questionsInThisChunk,
            difficultyLevel,
            theoryDistribution,
            courseOutcomeDistribution,
            bloomsTaxonomy,
            chapterContent,
            courseOutcomes: courseOutcomes || [],
          }, chunkIndex, theoryChunks);
          
          allQuestions.push(...chunkQuestions);
        }
      }
    } else {
      // Generate single type questions (original logic)
      const chunks = Math.ceil(totalQuestions / MAX_QUESTIONS_PER_CHUNK);
      
      for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
        const questionsInThisChunk = Math.min(
          MAX_QUESTIONS_PER_CHUNK, 
          totalQuestions - (chunkIndex * MAX_QUESTIONS_PER_CHUNK)
        );
        
        console.log(`Generating chunk ${chunkIndex + 1}/${chunks} with ${questionsInThisChunk} questions`);
        
        const chunkQuestions = await generateQuestionChunk({
          OPENAI_API_KEY,
          subject,
          topic,
          questionType,
          questionsInThisChunk,
          difficultyLevel,
          theoryDistribution,
          courseOutcomeDistribution,
          bloomsTaxonomy,
          chapterContent,
          courseOutcomes: courseOutcomes || [],
        }, chunkIndex, chunks);
        
        allQuestions.push(...chunkQuestions);
      }
    }

    console.log(`Successfully generated ${allQuestions.length} questions`);

    return new Response(JSON.stringify({ 
      success: true, 
      questions: allQuestions 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in generate-questions function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An error occurred during question generation"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function generateQuestionChunk(
  params: {
    OPENAI_API_KEY: string;
    subject: any;
    topic: string;
    questionType: 'mcq' | 'theory';
    questionsInThisChunk: number;
    difficultyLevel: number;
    theoryDistribution?: any;
    courseOutcomeDistribution?: any;
    bloomsTaxonomy?: any;
    chapterContent?: string;
    courseOutcomes?: any[];
  },
  chunkIndex: number,
  totalChunks: number
): Promise<Question[]> {
  const {
    OPENAI_API_KEY,
    subject,
    topic,
    questionType,
    questionsInThisChunk,
    difficultyLevel,
    theoryDistribution,
    courseOutcomeDistribution,
    bloomsTaxonomy,
    chapterContent,
    courseOutcomes,
  } = params;

  // Create structured system message
  const systemMessage = `You are an AI specialized in generating high-quality educational assessment questions.

Generate exactly ${questionsInThisChunk} ${questionType.toUpperCase()} questions for the topic: "${topic}" in ${subject?.name || 'the subject'}.

Difficulty Level: ${difficultyLevel}/100
Question Type: ${questionType.toUpperCase()}
Chunk: ${chunkIndex + 1} of ${totalChunks}

${questionType === 'mcq' ? 
  `Generate exactly ${questionsInThisChunk} multiple choice questions with 4 options each. Each question should have:
  - question: the question text
  - options: array of 4 option strings
  - correct_answer: the correct option from the options array` :
  `Generate exactly ${questionsInThisChunk} theory questions with the following mark distribution:
  - 1 mark questions: ${theoryDistribution?.mark1Questions || 0}
  - 2 mark questions: ${theoryDistribution?.mark2Questions || 0}
  - 4 mark questions: ${theoryDistribution?.mark4Questions || 0}
  - 8 mark questions: ${theoryDistribution?.mark8Questions || 0}
  
  Each theory question should have:
  - question: the question text
  - marks: the mark value (1, 2, 4, or 8)
  - answer: the expected answer text`
}

IMPORTANT RULES:
1. For MCQ questions: ensure correct_answer is one of the options in the options array
2. For Theory questions: ensure marks is one of the specified values (1, 2, 4, 8)
3. Use proper JSON syntax with double quotes
4. Validate that your response is valid JSON before sending`;

  // Create user message with context
  let userMessage = `Generate ${questionsInThisChunk} ${questionType.toUpperCase()} questions for the topic: "${topic}" in ${subject?.name || 'the subject'}.

Difficulty Level: ${difficultyLevel}/100
Question Type: ${questionType.toUpperCase()}
Chunk: ${chunkIndex + 1} of ${totalChunks}

${questionType === 'mcq' ? 
  `Generate exactly ${questionsInThisChunk} multiple choice questions with 4 options each. Each question should have:
  - question: the question text
  - options: array of 4 option strings
  - correct_answer: the correct option from the options array` :
  `Generate exactly ${questionsInThisChunk} theory questions with the following mark distribution:
  - 1 mark questions: ${theoryDistribution?.mark1Questions || 0}
  - 2 mark questions: ${theoryDistribution?.mark2Questions || 0}
  - 4 mark questions: ${theoryDistribution?.mark4Questions || 0}
  - 8 mark questions: ${theoryDistribution?.mark8Questions || 0}
  
  Each theory question should have:
  - question: the question text
  - marks: the mark value (1, 2, 4, or 8)
  - answer: the expected answer text`
}`;

  // Add course outcomes if available (optional)
  if (courseOutcomes && Array.isArray(courseOutcomes) && courseOutcomes.length > 0) {
    userMessage += `\n\nCourse Outcomes to consider:\n`;
    courseOutcomes.forEach((co: any, index: number) => {
      if (co && co.display_number && co.description) {
        userMessage += `CO${co.display_number}: ${co.description}\n`;
      }
    });
  }

  // Add chapter content if available
  if (chapterContent && chapterContent.length > 0) {
    const truncatedContent = chapterContent.length > 30000 
      ? chapterContent.substring(0, 30000) + "... [content truncated due to length]" 
      : chapterContent;
    
    userMessage += `\n\nChapter Content to base questions on:\n\n${truncatedContent}`;
  } else {
    userMessage += `\n\nGenerate questions based on common knowledge about ${topic} in ${subject?.name || 'the provided subject'}.`;
  }

  // Retry mechanism with structured response validation
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${MAX_RETRIES} for chunk ${chunkIndex + 1}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      // Define JSON schema for structured response (matching Azure OpenAI's actual output)
      const jsonSchema = questionType === 'mcq' ? {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 4,
                  maxItems: 4
                },
                correct_answer: { type: "string" }
              },
              required: ["question", "options", "correct_answer"]
            },
            minItems: questionsInThisChunk,
            maxItems: questionsInThisChunk
          }
        },
        required: ["questions"]
      } : {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                marks: { type: "number", enum: [1, 2, 4, 8] },
                answer: { type: "string" }
              },
              required: ["question", "marks", "answer"]
            },
            minItems: questionsInThisChunk,
            maxItems: questionsInThisChunk
          }
        },
        required: ["questions"]
      };

      let response: any;
      
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
          max_tokens: 4000,
        }),
        signal: controller.signal
      });
      
      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new Error(`OpenAI API error: ${errorText}`);
      }
      
      response = await openaiResponse.json();

      clearTimeout(timeoutId);

      // Handle response based on API type
      let generatedContent: string;
      
      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error("Invalid response from OpenAI API");
      }
      generatedContent = response.choices[0].message.content;
      
      console.log("Raw response received, attempting to parse...");
      console.log("Generated content length:", generatedContent?.length || 0);
      console.log("Generated content preview:", generatedContent?.substring(0, 500));
      
      // Parse and validate the response (Azure OpenAI returns structured JSON)
      const questions = parseAndValidateQuestions(generatedContent, questionType, questionsInThisChunk);
      
      console.log(`Parsed ${questions.length} questions from response`);
      
      if (questions.length === questionsInThisChunk) {
        console.log(`Successfully generated ${questions.length} questions for chunk ${chunkIndex + 1}`);
        return questions;
      } else {
        throw new Error(`Expected ${questionsInThisChunk} questions but got ${questions.length}`);
      }
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to generate questions after ${MAX_RETRIES} attempts: ${error.message}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('Failed to generate questions after all retry attempts');
}

function parseAndValidateQuestions(content: string, questionType: string, expectedCount: number): Question[] {
  try {
    console.log("Parsing content:", content.substring(0, 200));
    
    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", e);
      throw new Error('Invalid JSON response from Azure OpenAI');
    }

    console.log("Parsed structure:", Object.keys(parsed));

    // Handle different response formats
    let questionsArray: any[];
    if (parsed.questions && Array.isArray(parsed.questions)) {
      // Structured response: { questions: [...] }
      questionsArray = parsed.questions;
      console.log("Found questions array with", questionsArray.length, "items");
    } else if (Array.isArray(parsed)) {
      // Direct array response: [...]
      questionsArray = parsed;
      console.log("Found direct array with", questionsArray.length, "items");
    } else {
      console.error("Unexpected response structure:", parsed);
      throw new Error('Response does not contain a valid questions array');
    }

    // Validate each question
    const validatedQuestions: Question[] = [];
    for (const question of questionsArray) {
      console.log("Processing question:", JSON.stringify(question, null, 2));
      
      // Handle different question formats
      let questionText = question.question_text || question.question;
      let questionType = question.question_type || question.type;
      let questionMarks = question.marks;
      let questionOptions = question.options;
      let questionAnswer = question.answer_text || question.answer || question.correct_answer;
      
      console.log("Raw question object:", JSON.stringify(question, null, 2));
      console.log("Extracted values:", {
        questionText,
        questionType,
        questionMarks,
        questionOptions: questionOptions ? `${questionOptions.length} options` : 'null',
        questionAnswer: questionAnswer ? 'present' : 'null'
      });
      
      if (!questionText || typeof questionText !== 'string') {
        console.warn('Skipping question with invalid question_text:', question);
        continue;
      }

      // Determine question type based on structure
      if (!questionType) {
        if (questionOptions && Array.isArray(questionOptions) && questionOptions.length > 0) {
          questionType = 'MCQ';
        } else {
          questionType = 'Theory';
        }
      }

      // Normalize question type
      if (questionType === 'THEORY') questionType = 'Theory';
      if (questionType === 'MCQ') questionType = 'MCQ';
      
      console.log("Normalized question type:", questionType);
      
      if (questionType !== 'MCQ' && questionType !== 'Theory') {
        console.warn('Skipping question with invalid question_type:', questionType);
        console.warn('Available fields in question:', Object.keys(question));
        continue;
      }

      // Validate MCQ-specific fields
      if (questionType === 'MCQ') {
        if (!Array.isArray(questionOptions) || questionOptions.length !== 4) {
          console.warn('Skipping MCQ question with invalid options:', question);
          continue;
        }

        // Check if correct_answer exists and is one of the options
        if (!questionAnswer || typeof questionAnswer !== 'string') {
          console.warn('Skipping MCQ question with missing or invalid correct_answer:', question);
          continue;
        }

        if (!questionOptions.includes(questionAnswer)) {
          console.warn('Skipping MCQ question where correct_answer is not in options:', question);
          continue;
        }

        // Convert options to the expected format for database
        const formattedOptions = questionOptions.map((option: string, index: number) => ({
          text: option,
          is_correct: option === questionAnswer
        }));
        questionOptions = formattedOptions;
      }

      // Validate Theory-specific fields
      if (questionType === 'Theory') {
        if (typeof questionMarks !== 'number' || ![1, 2, 4, 8].includes(questionMarks)) {
          console.warn('Skipping Theory question with invalid marks:', questionMarks);
          continue;
        }
      }

      const validatedQuestion: Question = {
        question_text: questionText,
        question_type: questionType,
        topic: question.topic || 'Unknown',
        difficulty: question.difficulty || 50,
        bloom_level: question.bloom_level || 'Remember',
        course_outcome: question.course_outcome || null,
        options: questionOptions || null,
        answer_text: questionAnswer || null,
        marks: questionMarks || null,
      };

      // Additional database constraint validation
      if (!validateQuestionForDatabase(validatedQuestion)) {
        console.warn('Skipping question that violates database constraints:', validatedQuestion);
        continue;
      }

      validatedQuestions.push(validatedQuestion);
    }

    console.log(`Validated ${validatedQuestions.length} questions out of ${questionsArray.length} received`);
    
    // Ensure we have exactly the expected number of questions
    if (validatedQuestions.length !== expectedCount) {
      console.warn(`Got ${validatedQuestions.length} valid questions, expected ${expectedCount}`);
      
      // If we have more questions than expected, truncate to the expected count
      if (validatedQuestions.length > expectedCount) {
        console.log(`Truncating from ${validatedQuestions.length} to ${expectedCount} questions`);
        validatedQuestions.splice(expectedCount);
      }
      
      // If we have fewer questions than expected, this will be handled by the retry mechanism
      if (validatedQuestions.length < expectedCount) {
        throw new Error(`Expected ${expectedCount} questions but got ${validatedQuestions.length}`);
      }
    }
    
    return validatedQuestions;

  } catch (error) {
    console.error('Error parsing questions:', error);
    console.log('Raw content:', content.substring(0, 500));
    throw new Error(`Failed to parse questions: ${error.message}`);
  }
}
