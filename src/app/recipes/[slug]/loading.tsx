import { LoadingState } from "@/components/ui/page-states";

export default function RecipeDetailLoading() {
    return <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-10"><LoadingState label="Loading recipe details" /></main>;
}