import { listAdminRecipesAction, listAdminIngredientsAction } from "@/features/admin/actions";
import { RecipesView } from "@/components/admin/recipes-view";

export default async function AdminRecipesPage() {
    const [recipesRes, ingredientsRes] = await Promise.all([
        listAdminRecipesAction(),
        listAdminIngredientsAction(),
    ]);

    return (
        <RecipesView
            initialRecipes={recipesRes.success && recipesRes.data ? recipesRes.data : []}
            availableIngredients={ingredientsRes.success && ingredientsRes.data ? ingredientsRes.data : []}
        />
    );
}
