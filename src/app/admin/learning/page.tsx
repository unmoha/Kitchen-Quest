import { listAdminLearningModulesAction } from "@/features/admin/actions";
import { LearningView } from "@/components/admin/learning-view";

export default async function AdminLearningPage() {
    const res = await listAdminLearningModulesAction();

    return <LearningView initialModules={res.success && res.data ? res.data : []} />;
}
