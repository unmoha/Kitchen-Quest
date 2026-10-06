import {
    listAdminDailyChallengesAction,
    listAdminRecipesAction,
    listAdminLearningModulesAction,
    listAdminIngredientsAction,
} from "@/features/admin/actions";
import { ChallengesView } from "@/components/admin/challenges-view";

export default async function AdminChallengesPage() {
    const [challengesRes, recipesRes, modulesRes, ingredientsRes] = await Promise.all([
        listAdminDailyChallengesAction(),
        listAdminRecipesAction(),
        listAdminLearningModulesAction(),
        listAdminIngredientsAction(),
    ]);

    return (
        <ChallengesView
            initialChallenges={challengesRes.success && challengesRes.data ? challengesRes.data : []}
            availableRecipes={recipesRes.success && recipesRes.data ? recipesRes.data : []}
            availableModules={modulesRes.success && modulesRes.data ? modulesRes.data : []}
            availableIngredients={ingredientsRes.success && ingredientsRes.data ? ingredientsRes.data : []}
        />
    );
}
