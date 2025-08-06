export interface Rubric {
    id: string;
    test_id: string;
    accuracy: number;
    relevance: number;
    clarity: number;
    structure: number;
    language: number;
    created_at: string;
    updated_at: string;
}

export interface RubricOption {
    id: string;
    label: string;
    description: string;
}

export interface RubricLevel {
    value: number;
    label: string;
    emoji: string;
    description: string;
}

export const RUBRIC_LEVELS: RubricLevel[] = [
    {
        value: 1,
        label: "Lenient",
        emoji: "✨",
        description: "Focus only on major points, minor errors are ignored. Friendly checking."
    },
    {
        value: 2,
        label: "Light",
        emoji: "🙂",
        description: "Accepts slightly incomplete answers, small mistakes are tolerated."
    },
    {
        value: 3,
        label: "Moderate",
        emoji: "⚖️",
        description: "Balanced checking – some errors deducted, but fair."
    },
    {
        value: 4,
        label: "Strict",
        emoji: "🔍",
        description: "Detailed checking, deducts for structure, logic, grammar, formatting, etc."
    },
    {
        value: 5,
        label: "Very Strict",
        emoji: "🧠",
        description: "Highest level of scrutiny. Every detail is evaluated thoroughly."
    }
]; 