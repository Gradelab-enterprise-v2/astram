import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdf from "https://deno.land/x/pdfkit@v0.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateReportRequest {
  analysisId: string;
  analysis: any;
  paperTitle: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { analysisId, analysis, paperTitle } = await req.json() as GenerateReportRequest;

    // Create a new PDF document
    const doc = new pdf.default();
    const chunks: Uint8Array[] = [];

    // Collect PDF chunks
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

    // Generate the PDF content
    generatePDFContent(doc, analysis, paperTitle);

    // End the document and collect the final PDF
    doc.end();
    const pdfBytes = Buffer.concat(chunks);
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    return new Response(
      JSON.stringify({
        success: true,
        pdf: base64PDF
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

function generatePDFContent(doc: any, analysis: any, paperTitle: string) {
  // Set document metadata
  doc.info.Title = `Analysis Report - ${paperTitle}`;
  doc.info.Author = 'GradeLab AI';

  // Add title
  doc.fontSize(24)
     .text('Paper Analysis Report', { align: 'center' })
     .moveDown();

  doc.fontSize(14)
     .text(paperTitle, { align: 'center' })
     .moveDown(2);

  // Add summary statistics
  doc.fontSize(16)
     .text('Summary Statistics')
     .moveDown();

  doc.fontSize(12);
  doc.text(`Total Questions: ${analysis.totalQuestions}`);
  doc.text(`Bloom's Taxonomy Levels Covered: ${analysis.bloomsLevelsCovered}/${analysis.totalBloomsLevels}`);
  doc.text(`Course Outcomes Mapped: ${analysis.courseOutcomesCovered}/${analysis.totalCourseOutcomes}`);
  doc.moveDown();

  // Add Bloom's Taxonomy Distribution
  doc.fontSize(16)
     .text("Bloom's Taxonomy Distribution")
     .moveDown();

  doc.fontSize(12);
  Object.entries(analysis.bloomsDistribution).forEach(([level, percentage]) => {
    doc.text(`${level}: ${percentage}%`);
  });
  doc.moveDown();

  // Add Course Outcome Distribution
  doc.fontSize(16)
     .text('Course Outcome Distribution')
     .moveDown();

  doc.fontSize(12);
  Object.entries(analysis.courseOutcomeDistribution).forEach(([co, percentage]) => {
    doc.text(`${co}: ${percentage}%`);
  });
  doc.moveDown();

  // Add Question Analysis
  doc.fontSize(16)
     .text('Question Analysis')
     .moveDown();

  doc.fontSize(12);
  analysis.questions.forEach((q: any) => {
    doc.text(`Question ${q.number}:`)
       .text(q.text)
       .text(`Difficulty: ${q.difficulty}`)
       .text(`Bloom's Level: ${q.bloomsLevel}`)
       .text(`Course Outcome: ${q.courseOutcome}`)
       .moveDown();
  });

  // Add Summary Analysis
  doc.addPage();
  doc.fontSize(16)
     .text('Analysis Details')
     .moveDown();

  doc.fontSize(12);
  doc.text("Bloom's Taxonomy Analysis:", { underline: true })
     .text(analysis.summary.bloomsAnalysis)
     .moveDown();

  doc.text('Course Outcome Coverage:', { underline: true })
     .text(analysis.summary.courseOutcomeCoverage)
     .moveDown();

  doc.text('Difficulty Distribution:', { underline: true })
     .text(analysis.summary.difficultyDistribution)
     .moveDown(2);

  // Add Suggestions
  doc.fontSize(16)
     .text('Improvement Suggestions')
     .moveDown();

  doc.fontSize(12);
  analysis.suggestions.improvements.forEach((improvement: string, index: number) => {
    doc.text(`${index + 1}. ${improvement}`).moveDown();
  });

  doc.moveDown();
  doc.fontSize(16)
     .text('Recommendations')
     .moveDown();

  doc.fontSize(12);
  analysis.suggestions.recommendations.forEach((recommendation: string, index: number) => {
    doc.text(`${index + 1}. ${recommendation}`).moveDown();
  });
} 