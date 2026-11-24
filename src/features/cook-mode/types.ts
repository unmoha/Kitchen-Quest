export interface CookIngredient {
    name: string;
    quantity: number;
    unit: string;
    isOptional: boolean;
    preparationNote: string | null;
}

export interface CookStep {
    id: string;
    number: number;
    instruction: string;
    minutes: number | null;
    note: string | null;
}

export interface CookModeProps {
    slug: string;
    recipeName: string;
    servings: number;
    safetyNotes: string;
    ingredients: CookIngredient[];
    steps: CookStep[];
}
