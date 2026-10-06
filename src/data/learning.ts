import type { LearningCategory } from "@/types/content";

export const learningCategories: LearningCategory[] = [
    {
        id: "ingredients",
        name: "Ingredients",
        description: "Get to know flavor, seasonality, storage, and smart substitutions.",
        exampleTopics: ["How to choose ripe tomatoes", "Building flavor with aromatics"],
        color: "green",
    },
    {
        id: "techniques",
        name: "Cooking techniques",
        description: "Build confidence with knife skills, heat, seasoning, and timing.",
        exampleTopics: ["Why preheating matters", "Browning for deeper flavor"],
        color: "yellow",
    },
    {
        id: "tools",
        name: "Kitchen tools",
        description: "Choose, use, and care for the tools that make cooking easier.",
        exampleTopics: ["Choosing a chef's knife", "Using a food thermometer"],
        color: "coral",
    },
    {
        id: "safety",
        name: "Food safety",
        description: "Practice clean, careful habits for storing and preparing food.",
        exampleTopics: ["Separating raw poultry and ready-to-eat food", "Checking doneness with a thermometer"],
        color: "blue",
    },
    {
        id: "nutrition",
        name: "Nutrition fundamentals",
        description: "Explore balanced eating, nutrients, and how ingredients nourish us.",
        exampleTopics: ["What fiber contributes", "Pairing grains and legumes"],
        color: "green",
    },
    {
        id: "cuisines",
        name: "World cuisines",
        description: "Discover dishes through their ingredients, techniques, and context.",
        exampleTopics: ["Berbere in Ethiopian cooking", "The many traditions of rice and beans"],
        color: "yellow",
    },
];