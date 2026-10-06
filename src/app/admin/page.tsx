import { getAdminDashboardAction } from "@/features/admin/actions";
import { DashboardView } from "@/components/admin/dashboard-view";

export default async function AdminDashboardPage() {
    const res = await getAdminDashboardAction();

    if (!res.success) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                Failed to load admin dashboard summary: {res.error}
            </div>
        );
    }

    return <DashboardView summary={res.data} />;
}
