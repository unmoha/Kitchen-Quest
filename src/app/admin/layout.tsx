import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthenticatedUser, getAuthenticatedUserProfile } from "@/lib/auth/current-user";
import { AdminNav } from "@/components/admin/admin-nav";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const user = await getAuthenticatedUser();
    if (!user) {
        redirect("/auth/login?redirect=/admin");
    }

    const profile = await getAuthenticatedUserProfile();
    if (!profile || profile.role !== "admin") {
        return (
            <main className="flex-1 px-4 py-16">
                <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-xs">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 text-xl font-bold">
                        !
                    </div>
                    <h1 className="display-font mt-4 text-xl font-bold text-[#25382f]">Access Restricted</h1>
                    <p className="mt-2 text-sm text-[#59675c]">
                        You do not have administrator privileges to access the Kitchen Quest content management area.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/"
                            className="inline-flex rounded-xl bg-[#254235] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#1c3328]"
                        >
                            Return to Home
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <div className="flex flex-1 flex-col bg-[#f8f6f0]">
            <header className="border-b border-[#e7e3d9] bg-white px-4 py-4 sm:px-8">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="text-xl">🛡️</span>
                        <div>
                            <h1 className="display-font text-lg font-bold text-[#25382f]">Kitchen Quest Admin</h1>
                            <p className="text-xs text-[#59675c]">Server-Authoritative Educational Content Management</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300">
                            Admin Role
                        </span>
                        <span className="text-xs font-medium text-[#25382f]">{profile.displayName}</span>
                    </div>
                </div>
            </header>

            <AdminNav />

            <main className="flex-1 px-4 py-8 sm:px-8">
                <div className="mx-auto max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
