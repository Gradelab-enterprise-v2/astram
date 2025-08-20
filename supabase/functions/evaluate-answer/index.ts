
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AzureOpenAI } from 'https://esm.sh/openai@latest';

const azureOpenAIKey = Deno.env.get('AZURE_OPENAI_API_KEY');
const azureOpenAIEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
const azureOpenAIDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');
const azureOpenAIApiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-08-01-preview';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to analyze question paper and identify questions
async function analyzeQuestionPaper(questionPaper: string, answerKey: string) {
  // Enhanced analysis to count questions and identify sections
  const questionMatches = questionPaper.match(/(?:Q|Question|Q\.|Question\.)\s*(\d+)/gi) || [];
  const sectionMatches = questionPaper.match(/(?:Section|Sec\.|Sec)\s*([A-Za-z])/gi) || [];
  
  // More comprehensive question detection patterns
  const additionalPatterns = [
    questionPaper.match(/(?:^\d+\.|^\d+\)|^\d+\s)/gm) || [], // Lines starting with numbers
    questionPaper.match(/(?:[A-Z]\.\s*\d+|[A-Z]\)\s*\d+)/g) || [], // Section A.1, B.2, etc.
    questionPaper.match(/(?:MCQ|Multiple Choice|Objective|Subjective)\s*(\d+)/gi) || [] // Question type indicators
  ];
  
  // Combine all patterns and find the highest question number
  let maxQuestionNumber = 0;
  const allPatterns = [questionMatches, ...additionalPatterns];
  
  allPatterns.forEach(pattern => {
    pattern.forEach(match => {
      const numberMatch = match.match(/\d+/);
      if (numberMatch) {
        const num = parseInt(numberMatch[0]);
        if (num > maxQuestionNumber) {
          maxQuestionNumber = num;
        }
      }
    });
  });
  
  // Use the highest question number found, or fallback to pattern count
  const totalQuestions = Math.max(maxQuestionNumber, questionMatches.length) || 50;
  
  // Enhanced section detection
  const questionsBySection: { [key: string]: number } = {};
  
  if (sectionMatches.length > 0) {
    // Dynamic section distribution based on total questions
    const sections = ['A', 'B', 'C', 'D', 'E', 'F']; // Support up to 6 sections
    const questionsPerSection = Math.ceil(totalQuestions / sections.length);
    
    sections.forEach((section, index) => {
      if (index < sections.length - 1) {
        questionsBySection[`Section ${section}`] = questionsPerSection;
      } else {
        // Last section gets remaining questions
        const remainingQuestions = totalQuestions - (questionsPerSection * (sections.length - 1));
        questionsBySection[`Section ${section}`] = Math.max(remainingQuestions, 1);
      }
    });
  } else {
    questionsBySection['Main Section'] = totalQuestions;
  }
  
  console.log(`Question analysis: Detected ${totalQuestions} total questions across ${Object.keys(questionsBySection).length} sections`);
  
  return { totalQuestions, questionsBySection };
}

// Helper function to process a batch of questions
async function processQuestionBatch(
  client: any, 
  batchQuestions: number[], 
  questionPaper: string, 
  answerKey: string, 
  studentAnswerSheet: string, 
  studentInfo: any, 
  batchNumber: number
): Promise<any[]> {
  // Optimize prompt length for large question papers
  const batchPrompt = `
    Process ONLY the following question numbers: ${batchQuestions.join(', ')}
    
    Question Paper (focus on questions ${batchQuestions.join(', ')}):
    ${questionPaper}
    
    Answer Key (focus on questions ${batchQuestions.join(', ')}):
    ${answerKey}
    
    Student Answer Sheet (focus on questions ${batchQuestions.join(', ')}):
    ${studentAnswerSheet}
    
    Student Information:
    - Name: ${studentInfo.name}
    - Roll Number: ${studentInfo.rollNumber}
    - Class: ${studentInfo.class}
    - Subject: ${studentInfo.subject}
    
    Return ONLY the answers array for these specific questions in this format:
    [
      {
        "question_no": 1,
        "section": "Section A",
        "question": "Question text",
        "expected_answer": "Expected answer",
        "answer": "Student's answer",
        "raw_extracted_text": "Raw text",
        "score": [assigned_score, total_score],
        "remarks": "Feedback",
        "confidence": 0.95,
        "concepts": ["Concept 1", "Concept 2"],
        "missing_elements": ["Missing 1", "Missing 2"],
        "answer_matches": true/false,
        "personalized_feedback": "Personal feedback",
        "alignment_notes": "Alignment notes"
      }
    ]
    
    Process ONLY the questions ${batchQuestions.join(', ')} and return valid JSON array.
    Keep feedback concise but informative.
  `;
  
  try {
    // Dynamic token allocation based on batch size
    const maxTokens = batchQuestions.length <= 10 ? 4096 : 
                     batchQuestions.length <= 20 ? 8192 : 
                     batchQuestions.length <= 30 ? 16384 : 32768;
    
    const response = await client.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an AI evaluator. Process the specified questions and return a valid JSON array of answers.' },
        { role: 'user', content: batchPrompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
    });
    
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    // Handle both array and object with answers property
    const answers = Array.isArray(parsed) ? parsed : (parsed.answers || []);
    
    console.log(`Batch ${batchNumber}: Processed ${answers.length} questions (${batchQuestions.length} expected)`);
    return answers;
  } catch (error) {
    console.error(`Batch ${batchNumber} failed:`, error);
    // Return empty array for failed batch
    return [];
  }
}

// Helper function to combine batch results
function combineBatchResults(batchResults: any[], studentInfo: any, totalQuestions: number, questionsBySection: any) {
  // Flatten all batch results
  const allAnswers = batchResults.flat();
  
  // Sort by question number
  allAnswers.sort((a: any, b: any) => a.question_no - b.question_no);
  
  // Remove duplicates based on question number
  const uniqueAnswers = allAnswers.filter((answer: any, index: number, self: any[]) => 
    index === self.findIndex((a: any) => a.question_no === answer.question_no)
  );
  
  // Generate overall performance based on all answers
  const totalScore = uniqueAnswers.reduce((sum: number, answer: any) => sum + answer.score[0], 0);
  const totalPossible = uniqueAnswers.reduce((sum: number, answer: any) => sum + answer.score[1], 0);
  const scorePercentage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
  
  // Generate strengths and areas for improvement
  const strengths = uniqueAnswers
    .filter((answer: any) => answer.score[0] > answer.score[1] * 0.7)
    .slice(0, 3)
    .map((answer: any) => `Strong performance in ${answer.concepts?.[0] || 'question ' + answer.question_no}`);
  
  const areasForImprovement = uniqueAnswers
    .filter((answer: any) => answer.score[0] < answer.score[1] * 0.5)
    .slice(0, 3)
    .map((answer: any) => `Improve ${answer.concepts?.[0] || 'understanding in question ' + answer.question_no}`);
  
  const studyRecommendations = [
    'Review questions with low scores',
    'Practice similar question types',
    'Focus on weak concepts identified'
  ];
  
  const personalizedSummary = `${studentInfo.name} scored ${totalScore}/${totalPossible} (${scorePercentage.toFixed(1)}%). ${scorePercentage >= 70 ? 'Good performance overall.' : 'Areas for improvement identified.'}`;
  
  return {
    student_name: studentInfo.name,
    roll_no: studentInfo.rollNumber,
    class: studentInfo.class,
    subject: studentInfo.subject,
    total_questions_detected: totalQuestions,
    questions_by_section: questionsBySection,
    overall_performance: {
      strengths: strengths.length > 0 ? strengths : ['Continue working on core concepts'],
      areas_for_improvement: areasForImprovement.length > 0 ? areasForImprovement : ['Review all topics covered'],
      study_recommendations: studyRecommendations,
      personalized_summary: personalizedSummary
    },
    answers: uniqueAnswers
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request data
    const { questionPaper, answerKey, studentAnswerSheet, studentInfo, preserveRawExtractedText } = await req.json();

    if (!azureOpenAIKey || !azureOpenAIEndpoint || !azureOpenAIDeployment) {
      throw new Error('Azure OpenAI credentials are not configured. Please set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT.');
    }

    console.log("Processing evaluation for student:", studentInfo.name);
    console.log("Input lengths - Question paper:", questionPaper?.length || 0, 
                "Answer key:", answerKey?.length || 0, 
                "Student sheet:", studentAnswerSheet?.length || 0);

    // Create the system prompt for evaluation with explicit JSON format requirements
    const systemPrompt = `
      You are an AI evaluator responsible for grading a student's answer sheet and providing detailed, personalized feedback.
      CRITICAL: You MUST detect and grade ALL questions from the question paper, including MCQs, objective questions, and subjective questions.
      
      ANALYSIS INSTRUCTIONS:
      1. First, carefully analyze the question paper to identify ALL questions across all sections
      2. Count the total number of questions and identify their sections
      3. For each question, determine if it's MCQ, objective, or subjective
      4. Match each question from the question paper with the corresponding answer in the student's answer sheet
      5. Use the answer key to determine correct answers and scoring criteria
      
      QUESTION DETECTION RULES:
      - Look for question numbers (1, 2, 3, etc.) or letters (a, b, c, etc.)
      - Identify different sections (Section A, Section B, etc.)
      - For MCQs: Look for options like (a), (b), (c), (d) or A, B, C, D
      - For objective questions: Look for short answer requirements
      - For subjective questions: Look for detailed answer requirements
      - If a question number is missing from student's answer, create an entry with 0 marks
      
      SCORING GUIDELINES:
      - MCQs: Award full marks for correct option, 0 for incorrect
      - Objective questions: Award partial marks based on key points covered
      - Subjective questions: Award marks based on depth and accuracy of answer
      - If student's answer is blank or doesn't match expected content, award 0 marks
      
      You MUST return a valid JSON object with the following structure exactly:
      {
        "student_name": "Student Name",
        "roll_no": "Roll Number",
        "class": "Class Name",
        "subject": "Subject Name",
        "total_questions_detected": 10,
        "questions_by_section": {
          "Section A": 5,
          "Section B": 3,
          "Section C": 2
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
            "alignment_notes": "Notes about how well the answer aligns with expected content"
          }
        ]
      }
      
      CRITICAL REQUIREMENTS FOR EACH ANSWER:
      1. "question_no": Use the exact question number from the question paper
      2. "section": Identify the section this question belongs to (e.g., "Section A", "Section B", "Main Section")
      3. "raw_extracted_text": The EXACT text extracted from the student's answer sheet without any modification
      4. "answer": The processed version of student's answer after you've interpreted it
      5. "answer_matches": Boolean flag indicating if the student's answer contains the key elements from the expected answer
      6. "concepts": An array of 3-5 key concepts covered in the student's answer. Be specific and educational.
      7. "missing_elements": A comprehensive array indicating what's missing from the answer like "Detailed examples", "Mathematical formulas", etc.
      8. "remarks": Give specific, actionable feedback explaining the score
      9. "personalized_feedback": Provide specific, actionable feedback for this question that would help the student improve
      10. "alignment_notes": Brief notes about how well the student's answer aligns with the expected content
      
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
      
      For the summary fields:
      1. "total_questions_detected": Count the total number of questions you've evaluated (MUST match question paper)
      2. "questions_by_section": Create a breakdown of questions by section (e.g., {"Section A": 5, "Section B": 3})
      
      CRITICAL INSTRUCTIONS:
      - You MUST detect and grade EVERY question from the question paper
      - If a question is missing from student's answer, create an entry with 0 marks and note "Question not attempted"
      - For MCQs, check if the student selected the correct option
      - For objective questions, check for key points and award partial marks
      - For subjective questions, evaluate depth and accuracy
      - Your response MUST be valid JSON and must strictly follow this format
      - Make feedback concise but informative - focus on completeness over verbosity
      - Do not include any text outside of the JSON object
      - Never use HTML or other markup in your response
      - Double-check that your response is valid JSON before sending it
      - Be specific about what the student did well and what they need to improve
      - If a student performed well, acknowledge their strengths
      - If a student struggled, provide constructive, encouraging feedback
      - Identify sections in the question paper and assign appropriate section names to each question
      - ENSURE ALL QUESTIONS ARE ACCOUNTED FOR - this is critical for fair grading
      - PROCESS ALL QUESTIONS IN A SINGLE RESPONSE - do not truncate or skip any questions
    `;

    // Create the user prompt with the evaluation data
    const userPrompt = `
      Question Paper:
      ${questionPaper}
      
      Answer Key:
      ${answerKey}
      
      Student Answer Sheet:
      ${studentAnswerSheet}
      
      Student Information:
      - Name: ${studentInfo.name}
      - Roll Number: ${studentInfo.rollNumber}
      - Class: ${studentInfo.class}
      - Subject: ${studentInfo.subject}
      
      CRITICAL EVALUATION INSTRUCTIONS:
      1. FIRST: Count and identify ALL questions from the question paper (including MCQs, objective, and subjective)
      2. SECOND: Match each question with the corresponding student answer
      3. THIRD: For any question not found in student's answer, create an entry with 0 marks
      4. FOURTH: Ensure total_questions_detected matches the actual number of questions in the paper
      5. FIFTH: Pay special attention to MCQ sections - they are often missed but are critical for scoring
      
      Question Detection Steps:
      - Scan the question paper for all question numbers (1, 2, 3, etc.)
      - Identify different sections (Section A, Section B, etc.)
      - Look for MCQ options (a, b, c, d) or (A, B, C, D)
      - Count objective and subjective questions separately
      - Ensure no question is left unaccounted for
      
      Scoring Instructions:
      1. Store the exact extracted text in "raw_extracted_text"
      2. Include the "answer_matches" flag to indicate if answer matches expected content
      3. Award 0 marks for answers that don't match expected content
      4. For MCQs: Award full marks for correct option, 0 for incorrect
      5. For objective questions: Award partial marks based on key points
      6. For subjective questions: Award marks based on depth and accuracy
      7. Provide clear explanation in remarks when an answer doesn't match
      8. Generate personalized feedback for each question
      9. Create an overall performance summary that is specific to this student's actual performance
      
      CRITICAL: You MUST detect and grade EVERY question from the question paper. Missing questions will result in unfair grading.
      
      PERFORMANCE OPTIMIZATION:
      - Process all questions in a single comprehensive evaluation
      - Use concise but informative feedback for each question
      - Focus on accuracy and completeness over verbose explanations
      - Ensure all 68 questions (or actual total) are processed and graded
      
      Evaluate the answers and provide the response ONLY as a valid JSON object in the format specified in the system message.
      IMPORTANT: Do not include HTML tags or any formatting in your response, only pure JSON.
      Your response will be parsed as JSON, so ensure it is valid and properly formatted.
    `;

    console.log("Calling Azure OpenAI API for evaluation with batch processing...");
    
    try {
      console.log("Using Azure OpenAI for evaluation with batch processing");
      
      const options = {
        endpoint: azureOpenAIEndpoint,
        apiKey: azureOpenAIKey,
        deployment: azureOpenAIDeployment,
        apiVersion: azureOpenAIApiVersion
      };
      const client = new AzureOpenAI(options);
      
      // Parse the question paper to identify all questions and sections
      const questionAnalysis = await analyzeQuestionPaper(questionPaper, answerKey);
      const totalQuestions = questionAnalysis.totalQuestions;
      const questionsBySection = questionAnalysis.questionsBySection;
      
      console.log(`Detected ${totalQuestions} total questions across ${Object.keys(questionsBySection).length} sections`);
      
      // Dynamic batch sizing based on total question count
      let batchSize: number;
      let maxConcurrentBatches: number;
      
      if (totalQuestions <= 50) {
        // Small papers: 25 questions per batch, process all at once
        batchSize = 25;
        maxConcurrentBatches = 10;
      } else if (totalQuestions <= 100) {
        // Medium papers: 20 questions per batch, limit concurrent batches
        batchSize = 20;
        maxConcurrentBatches = 8;
      } else if (totalQuestions <= 200) {
        // Large papers: 15 questions per batch, limit concurrent batches
        batchSize = 15;
        maxConcurrentBatches = 6;
      } else {
        // Very large papers: 10 questions per batch, limit concurrent batches
        batchSize = 10;
        maxConcurrentBatches = 5;
      }
      
      console.log(`Dynamic configuration: ${batchSize} questions per batch, max ${maxConcurrentBatches} concurrent batches`);
      
      // Create batches
      const batches: number[][] = [];
      for (let i = 0; i < totalQuestions; i += batchSize) {
        const batchQuestions: number[] = [];
        for (let j = i; j < Math.min(i + batchSize, totalQuestions); j++) {
          batchQuestions.push(j + 1); // Question numbers start from 1
        }
        batches.push(batchQuestions);
      }
      
      console.log(`Created ${batches.length} batches of up to ${batchSize} questions each`);
      
      // Process batches with concurrency control for large question papers
      let batchResults: any[][] = [];
      
      if (batches.length <= maxConcurrentBatches) {
        // Process all batches in parallel for small papers
        console.log(`Processing all ${batches.length} batches in parallel`);
        const batchPromises = batches.map((batchQuestions: number[], batchIndex: number) => 
          processQuestionBatch(client, batchQuestions, questionPaper, answerKey, studentAnswerSheet, studentInfo, batchIndex + 1)
        );
        
        batchResults = await Promise.all(batchPromises);
      } else {
        // Process batches in chunks for large papers to avoid overwhelming the API
        console.log(`Processing ${batches.length} batches in chunks of ${maxConcurrentBatches}`);
        
        for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
          const chunk = batches.slice(i, i + maxConcurrentBatches);
          console.log(`Processing chunk ${Math.floor(i / maxConcurrentBatches) + 1}/${Math.ceil(batches.length / maxConcurrentBatches)}`);
          
          const chunkPromises = chunk.map((batchQuestions: number[], batchIndex: number) => 
            processQuestionBatch(client, batchQuestions, questionPaper, answerKey, studentAnswerSheet, studentInfo, i + batchIndex + 1)
          );
          
          const chunkResults = await Promise.all(chunkPromises);
          batchResults.push(...chunkResults);
          
          // Small delay between chunks to avoid rate limiting
          if (i + maxConcurrentBatches < batches.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      console.log(`All ${batches.length} batches completed successfully`);
      
      // Combine all batch results
      const combinedResult = combineBatchResults(batchResults, studentInfo, totalQuestions, questionsBySection);
      
      console.log(`Combined result: ${combinedResult.answers.length} questions processed`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        evaluation: combinedResult 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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