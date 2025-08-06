
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { toast } from "sonner";

interface Student {
  name: string;
  roll_number?: string;
}

interface Test {
  title?: string;
  class?: {
    name?: string;
  };
  subject?: {
    name?: string;
  };
  date?: string;
}

interface EvaluationAnswer {
  question_no: number;
  question: string;
  expected_answer: string;
  answer: string;
  score: [number, number];
  remarks: string;
  confidence: number;
  concepts?: string[];
}

interface EvaluationData {
  student_name: string;
  roll_no: string | number;
  class: string;
  subject: string;
  answers: EvaluationAnswer[];
}

export function generatePDF(
  evaluationResult: EvaluationData,
  test: Test | null,
  student: Student | null,
  userFeedback: {[key: number]: string} | null
): void {
  try {
    const doc = new jsPDF();
    const totalEarned = evaluationResult.answers.reduce((sum: number, answer: any) => sum + answer.score[0], 0);
    const totalPossible = evaluationResult.answers.reduce((sum: number, answer: any) => sum + answer.score[1], 0);
    const percentageScore = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

    // Add title
    doc.setFontSize(20);
    doc.text("Student Answer Evaluation Report", 105, 20, { align: "center" });
    
    // Add test info
    doc.setFontSize(12);
    doc.text(`Test: ${test?.title || ""}`, 20, 40);
    doc.text(`Date: ${test?.date ? new Date(test.date).toLocaleDateString() : "N/A"}`, 20, 50);
    
    // Add student info
    doc.text(`Student: ${student?.name || evaluationResult.student_name}`, 20, 65);
    doc.text(`Roll Number: ${student?.roll_number || evaluationResult.roll_no || "N/A"}`, 20, 75);
    doc.text(`Class: ${test?.class?.name || evaluationResult.class || "N/A"}`, 20, 85);
    doc.text(`Subject: ${test?.subject?.name || evaluationResult.subject || "N/A"}`, 20, 95);
    
    // Add score
    doc.setFontSize(14);
    doc.text(`Total Score: ${totalEarned} / ${totalPossible} (${percentageScore}%)`, 20, 110);
    
    // Add questions and answers
    doc.setFontSize(12);
    doc.text("Evaluation Details:", 20, 130);
    
    let yPosition = 140;
    
    evaluationResult.answers.forEach((answer: any, index: number) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`Q${answer.question_no}: ${answer.question.substring(0, 80)}${answer.question.length > 80 ? '...' : ''}`, 20, yPosition);
      yPosition += 10;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      
      // Expected answer
      doc.text("Expected Answer:", 25, yPosition);
      yPosition += 7;
      
      const expectedAnswerLines = doc.splitTextToSize(answer.expected_answer, 160);
      doc.text(expectedAnswerLines, 30, yPosition);
      yPosition += expectedAnswerLines.length * 6;
      
      // Student's answer
      doc.text("Student's Answer:", 25, yPosition);
      yPosition += 7;
      
      const studentAnswerLines = doc.splitTextToSize(answer.answer, 160);
      doc.text(studentAnswerLines, 30, yPosition);
      yPosition += studentAnswerLines.length * 6;
      
      // Score and remarks
      doc.text(`Score: ${answer.score[0]}/${answer.score[1]}`, 25, yPosition);
      yPosition += 7;
      
      doc.text(`AI Remarks: ${answer.remarks}`, 25, yPosition);
      yPosition += 7;
      
      // Add user feedback if available
      if (userFeedback && userFeedback[index]) {
        doc.text(`Teacher Feedback: ${userFeedback[index]}`, 25, yPosition);
        yPosition += 7;
      }
      
      // Add concepts if available
      if (answer.concepts && Array.isArray(answer.concepts)) {
        doc.text(`Key Concepts: ${answer.concepts.join(", ")}`, 25, yPosition);
        yPosition += 7;
      }
      
      doc.text(`Confidence: ${Math.round(answer.confidence * 100)}%`, 25, yPosition);
      yPosition += 15;
    });
    
    // Save the PDF
    const fileName = `${student?.name || evaluationResult.student_name}-${test?.title || ""}-evaluation.pdf`;
    doc.save(fileName);
    toast.success("Evaluation report downloaded");
  } catch (error) {
    console.error("Error generating PDF:", error);
    toast.error("Failed to generate PDF");
  }
}
