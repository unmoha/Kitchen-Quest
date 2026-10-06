import { listAdminAchievementsAction } from "@/features/admin/actions";
import { AchievementsView } from "@/components/admin/achievements-view";

export default async function AdminAchievementsPage() {
    const res = await listAdminAchievementsAction();

    return <AchievementsView initialAchievements={res.success && res.data ? res.data : []} />;
}
