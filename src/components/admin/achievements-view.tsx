"use client";

import { useState, useTransition } from "react";
import type { AdminAchievementItem, ContentStatus } from "@/features/admin/types";
import { StatusBadge } from "./status-badge";
import {
    createAdminAchievementAction,
    updateAdminAchievementAction,
    setAdminAchievementStatusAction,
} from "@/features/admin/actions";

export function AchievementsView({ initialAchievements }: { initialAchievements: AdminAchievementItem[] }) {
    const [achievements, setAchievements] = useState<AdminAchievementItem[]>(initialAchievements);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [editingItem, setEditingItem] = useState<AdminAchievementItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [icon, setIcon] = useState("trophy");
    const [requirementJsonText, setRequirementJsonText] = useState(JSON.stringify({ type: "recipe_mastery", threshold: 5 }, null, 2));
    const [status, setStatus] = useState<ContentStatus>("published");

    const filtered = achievements.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.slug.includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openCreateModal = () => {
        setName("");
        setSlug("");
        setDescription("");
        setIcon("trophy");
        setRequirementJsonText(JSON.stringify({ type: "recipe_mastery", threshold: 5 }, null, 2));
        setStatus("published");
        setValidationErrors({});
        setErrorMessage(null);
        setIsCreating(true);
        setEditingItem(null);
    };

    const openEditModal = (item: AdminAchievementItem) => {
        setName(item.name);
        setSlug(item.slug);
        setDescription(item.description);
        setIcon(item.icon);
        setRequirementJsonText(JSON.stringify(item.requirement, null, 2));
        setStatus(item.status);
        setValidationErrors({});
        setErrorMessage(null);
        setEditingItem(item);
        setIsCreating(false);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setValidationErrors({});

        let parsedReq: Record<string, unknown>;
        try {
            parsedReq = JSON.parse(requirementJsonText);
        } catch {
            setErrorMessage("Requirement must be valid JSON.");
            return;
        }

        const payload = {
            name,
            slug,
            description,
            icon,
            requirement: parsedReq,
            status,
        };

        startTransition(async () => {
            if (isCreating) {
                const res = await createAdminAchievementAction(payload);
                if (res.success) {
                    setAchievements((prev) => [...prev, res.data]);
                    setIsCreating(false);
                } else {
                    setErrorMessage(res.error);
                    if (res.validationErrors) setValidationErrors(res.validationErrors);
                }
            } else if (editingItem) {
                const res = await updateAdminAchievementAction(editingItem.id, payload);
                if (res.success) {
                    setAchievements((prev) => prev.map((item) => (item.id === editingItem.id ? res.data : item)));
                    setEditingItem(null);
                } else {
                    setErrorMessage(res.error);
                    if (res.validationErrors) setValidationErrors(res.validationErrors);
                }
            }
        });
    };

    const handleStatusChange = (id: string, newStatus: ContentStatus) => {
        startTransition(async () => {
            const res = await setAdminAchievementStatusAction(id, newStatus);
            if (res.success) {
                setAchievements((prev) => prev.map((item) => (item.id === id ? res.data : item)));
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="display-font text-2xl font-bold text-[#25382f]">Achievement Definitions</h2>
                    <p className="mt-1 text-sm text-[#59675c]">View and manage Kitchen Quest achievement triggers and requirements.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center rounded-xl bg-[#254235] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#1c3328]"
                >
                    + New Achievement
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7e3d9] bg-white p-4 sm:flex-row sm:items-center">
                <input
                    type="text"
                    placeholder="Search achievements..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 rounded-lg border border-[#e7e3d9] bg-[#fdfcf9] px-3.5 py-2 text-sm text-[#25382f] placeholder-[#59675c] focus:border-[#254235] focus:outline-none"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-[#e7e3d9] bg-[#fdfcf9] px-3 py-2 text-sm text-[#25382f] focus:border-[#254235] focus:outline-none"
                >
                    <option value="all">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-[#e7e3d9] bg-white shadow-xs">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#59675c]">No achievements found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#e7e3d9] text-left text-xs">
                            <thead className="bg-[#f8f6f0] text-[#59675c]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Icon / Name</th>
                                    <th className="px-4 py-3 font-semibold">Description</th>
                                    <th className="px-4 py-3 font-semibold">Requirement</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0ece1] bg-white">
                                {filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-[#fdfcf9]">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-base font-bold text-[#b14b30]">🏆</span>
                                                <div>
                                                    <div className="font-semibold text-[#25382f]">{item.name}</div>
                                                    <div className="font-mono text-[11px] text-[#59675c]">{item.slug}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="max-w-xs px-4 py-3 text-[#59675c]">{item.description}</td>
                                        <td className="max-w-xs font-mono text-[11px] text-[#59675c] truncate">
                                            {JSON.stringify(item.requirement)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={item.status} />
                                        </td>
                                        <td className="space-x-2 px-4 py-3 text-right">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="rounded-md border border-[#e7e3d9] bg-[#f8f6f0] px-2.5 py-1 text-xs font-medium text-[#25382f] hover:bg-[#f0ece1]"
                                            >
                                                Edit
                                            </button>
                                            {item.status !== "published" && (
                                                <button
                                                    onClick={() => handleStatusChange(item.id, "published")}
                                                    disabled={isPending}
                                                    className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                                                >
                                                    Publish
                                                </button>
                                            )}
                                            {item.status === "published" && (
                                                <button
                                                    onClick={() => handleStatusChange(item.id, "archived")}
                                                    disabled={isPending}
                                                    className="rounded-md bg-stone-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                                                >
                                                    Archive
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {(isCreating || editingItem) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-[#e7e3d9] pb-3">
                            <h3 className="display-font text-lg font-bold text-[#25382f]">
                                {isCreating ? "Create Achievement" : "Edit Achievement"}
                            </h3>
                            <button
                                onClick={() => { setIsCreating(false); setEditingItem(null); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                &times;
                            </button>
                        </div>

                        {errorMessage && (
                            <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                                {errorMessage}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
                            <div>
                                <label className="block font-medium text-[#25382f]">Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    required
                                />
                                {validationErrors.name && <p className="mt-1 text-red-600">{validationErrors.name}</p>}
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Slug * (kebab-case)</label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    required
                                />
                                {validationErrors.slug && <p className="mt-1 text-red-600">{validationErrors.slug}</p>}
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Description *</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Icon Identifier *</label>
                                <input
                                    type="text"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    placeholder="e.g. trophy, knife, flame"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Requirement JSON *</label>
                                <textarea
                                    value={requirementJsonText}
                                    onChange={(e) => setRequirementJsonText(e.target.value)}
                                    rows={4}
                                    className="mt-1 w-full font-mono rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none text-[11px]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as ContentStatus)}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="review">Review</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className="flex justify-end space-x-2 pt-4 border-t border-[#e7e3d9]">
                                <button
                                    type="button"
                                    onClick={() => { setIsCreating(false); setEditingItem(null); }}
                                    className="rounded-lg border border-[#e7e3d9] px-4 py-2 text-xs font-semibold text-[#59675c] hover:bg-[#f0ece1]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="rounded-lg bg-[#254235] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1c3328] disabled:opacity-50"
                                >
                                    {isPending ? "Saving..." : isCreating ? "Create Achievement" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
