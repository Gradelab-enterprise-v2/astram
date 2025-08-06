
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Get the API key from environment variables
const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

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
    const { extractedText, courseOutcomes, title, paperId } = await req.json();

    // Validate required parameters
    if (!extractedText) {
      throw new Error("Extracted text is required");
    }

    console.log(`Starting analysis for paper: ${title || paperId}`);
    console.log(`Course outcomes provided: ${courseOutcomes?.length || 0}`);

    // Format course outcomes for the prompt
    let courseOutcomesText = "No course outcomes found for this subject.";
    if (courseOutcomes && courseOutcomes.length > 0) {
      courseOutcomesText = courseOutcomes.map((co: any, index: number) => 
        `CO${index + 1}: ${co.description}`
      ).join("\n");
    }

    // Truncate the extracted text if it's too long
    const maxExtractedTextLength = 8000;
    const truncatedText = extractedText.length > maxExtractedTextLength 
      ? extractedText.substring(0, maxExtractedTextLength) + "...(truncated for length)"
      : extractedText;

    // Create a detailed prompt for OpenAI
    const prompt = `
You are an educational assessment expert analyzing a question paper. 
Below is the text of a question paper and the course outcomes for the subject.

QUESTION PAPER TEXT:
${truncatedText}

COURSE OUTCOMES:
${courseOutcomesText}

Perform a comprehensive analysis of this question paper by:

1. Identifying individual questions and their numbers
2. Analyzing each question's difficulty level (Easy, Medium, Hard)
3. Mapping each question to the most relevant course outcome
4. Categorizing each question according to Bloom's Taxonomy level (Remember, Understand, Apply, Analyze, Evaluate, Create)
5. Calculating the distribution percentages across difficulty levels, course outcomes, and Bloom's levels

Return your analysis in the following JSON format:

{
  "totalQuestions": number,
  "difficultyBreakdown": {
    "easy": number (percentage),
    "medium": number (percentage),
    "hard": number (percentage)
  },
  "bloomsDistribution": {
    "remember": number (percentage),
    "understand": number (percentage),
    "apply": number (percentage),
    "analyze": number (percentage),
    "evaluate": number (percentage),
    "create": number (percentage)
  },
  "courseOutcomeDistribution": {
    "CO1": number (percentage),
    "CO2": number (percentage),
    ...
  },
  "questionAnalysis": [
    {
      "questionNumber": number,
      "questionText": "string (first 50 chars)",
      "difficulty": "easy|medium|hard",
      "courseOutcome": "CO1|CO2|etc",
      "bloomsLevel": "remember|understand|apply|analyze|evaluate|create"
    },
    ...
  ],
  "analysisDetails": {
    "bloomsAnalysis": "string (1-2 paragraphs)",
    "courseOutcomeCoverage": "string (1-2 paragraphs)",
    "difficultyDistribution": "string (1-2 paragraphs)"
  },
  "improvementSuggestions": [
    {
      "title": "string",
      "description": "string (1-2 sentences)"
    },
    ...
  ]
}

Your response should be valid JSON only, with no additional text or explanations.
`;

    console.log("Sending request to OpenAI...");

    // Call OpenAI API
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an educational assessment analysis expert." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 3000
      })
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    const analysisContent = openAIData.choices[0].message.content;
    
    console.log("Analysis received from OpenAI");
    
    let analysisJSON;
    try {
      // Try to parse the response as JSON
      analysisJSON = JSON.parse(analysisContent);
      console.log("Successfully parsed OpenAI response as JSON");
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", parseError);
      console.log("Raw response:", analysisContent);
      
      // Try to extract JSON from the response if it contains non-JSON text
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisJSON = JSON.parse(jsonMatch[0]);
          console.log("Successfully extracted and parsed JSON from the response");
        } catch (extractError) {
          throw new Error("Failed to extract JSON from OpenAI response");
        }
      } else {
        throw new Error("OpenAI response did not contain valid JSON");
      }
    }

    // Return the processed analysis
    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisJSON
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in analyze-paper-enhanced function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
