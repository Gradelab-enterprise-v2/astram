import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRubrics } from "@/hooks/use-rubrics";
import { Rubric, RUBRIC_LEVELS } from "@/types/rubrics";
import { ArrowLeft } from "lucide-react";

const RUBRIC_OPTIONS = [
    { id: "accuracy", label: "Accuracy", description: "How accurately the answer matches the expected response" },
    { id: "relevance", label: "Relevance", description: "How well the answer addresses the question" },
    { id: "clarity", label: "Clarity of Explanation", description: "How clear and understandable the explanation is" },
    { id: "structure", label: "Structure & Organization", description: "How well the answer is structured and organized" },
    { id: "language", label: "Language & Grammar", description: "How well the language and grammar are used" }
];

export default function SetRubrics() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const testId = searchParams.get("test");
    const classId = searchParams.get("class");
    const subjectId = searchParams.get("subject");
    const [showLevelsPopup, setShowLevelsPopup] = useState(true);
    const [selectedRubrics, setSelectedRubrics] = useState<Partial<Rubric>>({
        accuracy: 3,
        relevance: 3,
        clarity: 3,
        structure: 3,
        language: 3
    });

    const { useRubricByTestId, createRubricMutation, updateRubricMutation } = useRubrics();
    const { data: existingRubric, isLoading } = useRubricByTestId(testId || "");

    useEffect(() => {
        if (existingRubric) {
            setSelectedRubrics(existingRubric);
        }
    }, [existingRubric]);

    const handleRubricChange = (id: keyof Rubric, value: number) => {
        setSelectedRubrics(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSave = async () => {
        if (!testId) return;

        try {
            if (existingRubric) {
                await updateRubricMutation.mutateAsync({
                    id: existingRubric.id,
                    rubric: selectedRubrics
                });
            } else {
                await createRubricMutation.mutateAsync({
                    testId,
                    rubric: selectedRubrics
                });
            }
            navigate(`/auto-grade/evaluate?test=${testId}&class=${classId}&subject=${subjectId}`);
        } catch (error) {
            console.error("Error saving rubrics:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <Button
                variant="ghost"
                className="mb-4"
                onClick={() => navigate("/auto-grade")}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Set Evaluation Rubrics</CardTitle>
                    <CardDescription>
                        Select the evaluation criteria and their strictness levels for auto-grading
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {RUBRIC_OPTIONS.map((option) => (
                            <div key={option.id} className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-medium">{option.label}</h3>
                                        <p className="text-sm text-gray-500">{option.description}</p>
                                    </div>
                                    <div className="text-2xl">
                                        {RUBRIC_LEVELS[selectedRubrics[option.id as keyof Rubric] as number - 1]?.emoji}
                                    </div>
                                </div>
                                <Slider
                                    value={[selectedRubrics[option.id as keyof Rubric] as number]}
                                    onValueChange={([value]) => handleRubricChange(option.id as keyof Rubric, value)}
                                    min={1}
                                    max={5}
                                    step={1}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-sm text-gray-500">
                                    {RUBRIC_LEVELS.map((level) => (
                                        <div key={level.value} className="text-center">
                                            <div>{level.emoji}</div>
                                            <div>{level.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-end">
                        <Button onClick={handleSave}>
                            Continue to Auto Grade
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showLevelsPopup} onOpenChange={setShowLevelsPopup}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Understanding Rubric Levels</DialogTitle>
                        <DialogDescription>
                            Each rubric can be set to one of five levels of strictness. Here's what each level means:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {RUBRIC_LEVELS.map((level) => (
                            <div key={level.value} className="flex items-start space-x-3">
                                <div className="text-2xl">{level.emoji}</div>
                                <div>
                                    <h4 className="font-medium">{level.label}</h4>
                                    <p className="text-sm text-gray-500">{level.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 