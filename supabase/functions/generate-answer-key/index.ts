/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paperId } = await req.json();
    if (!paperId) {
      throw new Error("paperId is required");
    }

    // Fetch the question paper from Supabase
    const paperRes = await fetch(`${supabaseUrl}/rest/v1/test_papers?id=eq.${paperId}&select=*`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    const papers = await paperRes.json();
    const paper = papers[0];
    if (!paper) {
      throw new Error("Question paper not found");
    }
    if (!paper.extracted_text) {
      throw new Error("No extracted text found for this question paper");
    }

    // Prepare the OpenAI prompt
    const prompt = `Given the following question paper, generate a detailed answer key. For each question, provide the main points or correct answers, and take into account the marks assigned to each question. For higher-mark questions, provide more detailed answers. Format the answer key clearly, matching the question numbers and marks.\n\nQuestion Paper:\n${paper.extracted_text}`;

    // Call OpenAI API
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert teacher. Generate a clear, concise answer key for the given question paper, taking into account the marks for each question. For higher-mark questions, provide more detailed answers." },
          { role: "user", content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.2
      })
    });
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      throw new Error(`OpenAI error: ${errorText}`);
    }
    const openAIData = await openAIResponse.json();
    const answerKey = openAIData.choices?.[0]?.message?.content || "";

    // Store the generated answer key in Supabase
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/test_papers?id=eq.${paperId}`, {
      method: "PATCH",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ generated_answer_key: answerKey })
    });
    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      throw new Error(`Failed to update answer key in Supabase: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true, answerKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}); 