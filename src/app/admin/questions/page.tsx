import { listAdminQuestionsAction, listAdminLearningModulesAction } from "@/features/admin/actions";
import { QuestionsView } from "@/components/admin/questions-view";

export default async function AdminQuestionsPage() {
    const [questionsRes, modulesRes] = await Promise.all([
        listAdminQuestionsAction(),
        listAdminLearningModulesAction(),
    ]);

    return (
        <QuestionsView
            initialQuestions={questionsRes.success && questionsRes.data ? questionsRes.data : []}
            availableModules={modulesRes.success && modulesRes.data ? modulesRes.data : []}
        />
    );
}
