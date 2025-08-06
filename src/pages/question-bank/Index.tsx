
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";
import { useQuestionBank } from "@/hooks/use-question-bank";

export default function QuestionBank() {
  const { questions } = useQuestionBank();
  
  return (
    <div className="space-y-8 animate-page-transition-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
        <Button className="bg-primary">Add Question</Button>
      </div>
      
      {questions.length === 0 ? (
        <Card className="border border-dashed">
          <CardHeader className="text-center">
            <CardTitle>Question Bank Empty</CardTitle>
            <CardDescription>Get started by adding questions to your bank</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileQuestion className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Build your AI-powered question repository with different difficulty levels mapped to learning outcomes and cognitive skills.
            </p>
            <Button className="mt-6 bg-primary">Add Question</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Questions</CardTitle>
            <CardDescription>Manage your question repository</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question) => (
                <Card key={question.id} className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium">{question.question_text.length > 60 
                        ? `${question.question_text.substring(0, 60)}...` 
                        : question.question_text}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {question.subject?.name || "Unassigned"} • {question.question_type} • {question.topic}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
