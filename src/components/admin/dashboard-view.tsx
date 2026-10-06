"use client";

import Link from "next/link";
import type { AdminDashboardSummary } from "@/features/admin/types";

export function DashboardView({ summary }: { summary: AdminDashboardSummary }) {
    const cards = [
        { label: "Ingredients", stats: summary.ingredients, href: "/admin/ingredients" },
        { label: "Recipes", stats: summary.recipes, href: "/admin/recipes" },
        { label: "Learning Modules", stats: summary.learningModules, href: "/admin/learning" },
        { label: "Questions", stats: summary.questions, href: "/admin/questions" },
        { label: "Daily Challenges", stats: summary.dailyChallenges, href: "/admin/challenges" },
        { label: "Achievements", stats: summary.achievements, href: "/admin/achievements" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="display-font text-2xl font-bold text-[#25382f]">Content Management Overview</h2>
                <p className="mt-1 text-sm text-[#59675c]">
                    Server-authoritative educational content repository for Kitchen Quest.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        className="rounded-2xl border border-[#e7e3d9] bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-[#25382f]">{card.label}</h3>
                            <Link
                                href={card.href}
                                className="text-xs font-medium text-[#b14b30] hover:underline"
                            >
                                Manage &rarr;
                            </Link>
                        </div>
                        <div className="mt-3 flex items-baseline space-x-2">
                            <span className="text-3xl font-extrabold text-[#254235]">{card.stats.total}</span>
                            <span className="text-xs text-[#59675c]">total entries</span>
                        </div>
                        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-[#f0ece1] pt-3 text-center text-xs">
                            <div>
                                <div className="font-semibold text-emerald-700">{card.stats.published}</div>
                                <div className="text-[10px] text-[#59675c]">Published</div>
                            </div>
                            <div>
                                <div className="font-semibold text-amber-700">{card.stats.draft}</div>
                                <div className="text-[10px] text-[#59675c]">Draft</div>
                            </div>
                            <div>
                                <div className="font-semibold text-sky-700">{card.stats.review}</div>
                                <div className="text-[10px] text-[#59675c]">Review</div>
                            </div>
                            <div>
                                <div className="font-semibold text-stone-600">{card.stats.archived}</div>
                                <div className="text-[10px] text-[#59675c]">Archived</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Audit Logs */}
            <div className="rounded-2xl border border-[#e7e3d9] bg-white p-6 shadow-xs">
                <h3 className="display-font text-lg font-bold text-[#25382f]">Recent Administrative Activity</h3>
                <p className="mt-1 text-xs text-[#59675c]">
                    Audit trail of authorized content creation, publishing, and lifecycle updates.
                </p>

                {summary.recentAuditLogs.length === 0 ? (
                    <p className="mt-4 text-sm text-[#59675c] italic">No recent administrative actions recorded.</p>
                ) : (
                    <div className="mt-4 overflow-hidden rounded-xl border border-[#e7e3d9]">
                        <table className="min-w-full divide-y divide-[#e7e3d9] text-left text-xs">
                            <thead className="bg-[#f8f6f0] text-[#59675c]">
                                <tr>
                                    <th className="px-4 py-2.5 font-semibold">Action</th>
                                    <th className="px-4 py-2.5 font-semibold">Entity</th>
                                    <th className="px-4 py-2.5 font-semibold">Entity ID</th>
                                    <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0ece1] bg-white">
                                {summary.recentAuditLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[#fdfcf9]">
                                        <td className="px-4 py-2.5 font-mono font-medium text-[#25382f]">{log.action}</td>
                                        <td className="px-4 py-2.5 capitalize text-[#59675c]">{log.entityType.replace("_", " ")}</td>
                                        <td className="px-4 py-2.5 font-mono text-[#59675c]">{log.entityId ? log.entityId.slice(0, 8) + "..." : "—"}</td>
                                        <td className="px-4 py-2.5 text-[#59675c]">{new Date(log.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
