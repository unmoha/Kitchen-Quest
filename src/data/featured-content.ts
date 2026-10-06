import type { FeaturedContent } from "@/types/content";

export const featuredContent: FeaturedContent[] = [
    {
        id: "recipe-feature",
        type: "Recipe",
        title: "Ethiopian Misir Wat",
        description: "Meet the spice blend behind a deeply savory lentil stew.",
        href: "/recipes",
        image: "/images/misir-wat.jpg",
        imageAlt: "Red lentil stew served with fresh herbs",
        accent: "coral",
    },
    {
        id: "learning-feature",
        type: "Learn",
        title: "The secret life of onions",
        description: "See how heat transforms sharp alliums into deep sweetness.",
        href: "/learn",
        image: "/images/onions.jpg",
        imageAlt: "Golden onions softening in a pan",
        accent: "yellow",
    },
    {
        id: "challenge-feature",
        type: "Challenge",
        title: "Build a better stir-fry",
        description: "A short preview about prep, pan heat, and cooking in batches.",
        href: "/play",
        image: "/images/stir-fry-prep.jpg",
        imageAlt: "Fresh vegetables and ingredients prepared for stir-frying",
        accent: "green",
    },
];