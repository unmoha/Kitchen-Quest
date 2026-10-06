import { listAdminIngredientsAction } from "@/features/admin/actions";
import { IngredientsView } from "@/components/admin/ingredients-view";

export default async function AdminIngredientsPage() {
    const res = await listAdminIngredientsAction();

    return <IngredientsView initialIngredients={res.success && res.data ? res.data : []} />;
}
