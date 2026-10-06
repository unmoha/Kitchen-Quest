"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { Recipe } from "@/types/content";
import { recipeCategories } from "@/data/recipes";
import { filterRecipes } from "@/lib/recipe-search";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { EmptyState } from "@/components/ui/page-states";
import { Input } from "@/components/ui/input";
import type { UserLearningProgress } from "@/features/learning-progress/types";

const difficulties = ["Any difficulty", "Beginner", "Intermediate", "Advanced"] as const;

const selectClassName =
  "min-h-11 w-full rounded-full border border-[#dcded5] bg-white px-4 text-sm text-[#33463a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c55a3d]";

export function RecipeExplorer({
  recipes,
  progressMap,
}: {
  recipes: Recipe[];
  progressMap?: Record<string, UserLearningProgress>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(recipeCategories[0]);
  const [difficulty, setDifficulty] = useState<string>(difficulties[0]);
  const visibleRecipes = filterRecipes(recipes, { query, category, difficulty });

  return (
    <>
      <div className="grid gap-3 rounded-lg border border-[#e7e3d9] bg-white p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_220px_190px]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#59675c]" size={17} />
          <Input
            className="pl-11"
            id="recipe-search"
            label="Search recipes by name, ingredient, or cuisine"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Try lentils, ginger, or Italian..."
            type="search"
            value={query}
          />
        </div>
        <label className="grid gap-1.5 text-xs font-semibold text-[#59665d]" htmlFor="recipe-category">
          Category
          <select className={selectClassName} id="recipe-category" onChange={(event) => setCategory(event.currentTarget.value)} value={category}>
            {recipeCategories.map((recipeCategory) => <option key={recipeCategory}>{recipeCategory}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#59665d]" htmlFor="recipe-difficulty">
          Difficulty
          <select className={selectClassName} id="recipe-difficulty" onChange={(event) => setDifficulty(event.currentTarget.value)} value={difficulty}>
            {difficulties.map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>
      </div>

      <div aria-live="polite" className="mb-4 mt-7 flex min-h-6 items-center justify-between gap-4 text-sm text-[#59675c]">
        <p>{visibleRecipes.length} published {visibleRecipes.length === 1 ? "recipe" : "recipes"}</p>
        {query || category !== recipeCategories[0] || difficulty !== difficulties[0] ? (
          <button
            className="min-h-11 shrink-0 rounded-full px-3 font-semibold text-[#a8442d] underline-offset-4 hover:underline"
            onClick={() => {
              setQuery("");
              setCategory(recipeCategories[0]);
              setDifficulty(difficulties[0]);
            }}
            type="button"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {visibleRecipes.length > 0 ? (
        <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRecipes.map((recipe, index) => (
            <RecipeCard
              eager={index === 0}
              key={recipe.id}
              progress={progressMap?.[recipe.id] ?? null}
              recipe={recipe}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No recipes found">
          Try a different ingredient or clear one of the filters to see all recipes.
        </EmptyState>
      )}
    </>
  );
}
