import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  analysisId: string;
  paperText: string;
  courseOutcomes: Array<{ id: string; description: string }>;
  title: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { analysisId, paperText, courseOutcomes, title } = await req.json() as AnalysisRequest;

    // Initialize OpenAI
    const openai = new OpenAIApi(new Configuration({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    }));

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract questions from the paper text
    const questionsResponse = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert in analyzing exam questions and classifying them according to Bloom's Taxonomy and difficulty levels."
        },
        {
          role: "user",
          content: `Extract and analyze questions from the following exam paper. For each question:
          1. Identify the question number and text
          2. Determine its difficulty (Easy, Medium, or Hard)
          3. Identify which Bloom's Taxonomy level it belongs to (Remember, Understand, Apply, Analyze, Evaluate, Create)
          4. Map it to the most relevant course outcome from the following list:
          ${courseOutcomes.map(co => `${co.id}: ${co.description}`).join("\n")}

          Paper text:
          ${paperText}`
        }
      ],
      temperature: 0.3
    });

    const questions = JSON.parse(questionsResponse.data.choices[0].message?.content || "[]");

    // Analyze the overall paper
    const analysisResponse = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert in educational assessment and curriculum design."
        },
        {
          role: "user",
          content: `Analyze this exam paper based on the following question analysis:
          ${JSON.stringify(questions, null, 2)}

          Provide:
          1. Distribution of questions across Bloom's Taxonomy levels (percentage for each level)
          2. Distribution of questions across difficulty levels
          3. Distribution of questions mapped to course outcomes
          4. A detailed analysis of:
             - Bloom's Taxonomy coverage and balance
             - Course outcome coverage and alignment
             - Overall difficulty distribution
          5. Specific suggestions for improvement
          6. Recommendations for better assessment design`
        }
      ],
      temperature: 0.3
    });

    const analysis = JSON.parse(analysisResponse.data.choices[0].message?.content || "{}");

    // Calculate statistics
    const totalQuestions = questions.length;
    const bloomsLevels = new Set(questions.map(q => q.bloomsLevel)).size;
    const courseOutcomesUsed = new Set(questions.map(q => q.courseOutcome)).size;

    const result = {
      totalQuestions,
      questions,
      bloomsDistribution: analysis.bloomsDistribution,
      courseOutcomeDistribution: analysis.courseOutcomeDistribution,
      difficultyDistribution: analysis.difficultyDistribution,
      bloomsLevelsCovered: bloomsLevels,
      totalBloomsLevels: 6,
      courseOutcomesCovered: courseOutcomesUsed,
      totalCourseOutcomes: courseOutcomes.length,
      summary: {
        bloomsAnalysis: analysis.bloomsAnalysis,
        courseOutcomeCoverage: analysis.courseOutcomeCoverage,
        difficultyDistribution: analysis.difficultyDistribution
      },
      suggestions: {
        improvements: analysis.improvements,
        recommendations: analysis.recommendations
      }
    };

    // Update analysis record with results
    const { error: updateError } = await supabaseClient
      .from("analysis_history")
      .update({
        status: "completed",
        analysis_data: result,
        completed_at: new Date().toISOString()
      })
      .eq("id", analysisId);

    if (updateError) {
      throw new Error(`Failed to update analysis record: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: result
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
