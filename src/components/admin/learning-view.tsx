"use client";

import { useState, useTransition } from "react";
import type { AdminLearningModuleItem, ContentStatus, DifficultyLevel, LearningModuleCategory, Json } from "@/features/admin/types";
import { StatusBadge } from "./status-badge";
import {
    createAdminLearningModuleAction,
    updateAdminLearningModuleAction,
    setAdminLearningModuleStatusAction,
} from "@/features/admin/actions";

const CATEGORIES: LearningModuleCategory[] = [
    "ingredients",
    "techniques",
    "tools",
    "food_safety",
    "nutrition",
    "world_cuisine",
];

export function LearningView({ initialModules }: { initialModules: AdminLearningModuleItem[] }) {
    const [modules, setModules] = useState<AdminLearningModuleItem[]>(initialModules);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [editingItem, setEditingItem] = useState<AdminLearningModuleItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        description: "",
        category: "techniques" as LearningModuleCategory,
        difficulty: "beginner" as DifficultyLevel,
        contentJsonText: JSON.stringify({ overview: "Overview text here", sections: [] }, null, 2),
        status: "draft" as ContentStatus,
    });

    const filtered = modules.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.slug.includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
    });

    const openCreateModal = () => {
        setFormData({
            title: "",
            slug: "",
            description: "",
            category: "techniques",
            difficulty: "beginner",
            contentJsonText: JSON.stringify({ overview: "Module overview", sections: [] }, null, 2),
            status: "draft",
        });
        setValidationErrors({});
        setErrorMessage(null);
        setIsCreating(true);
        setEditingItem(null);
    };

    const openEditModal = (item: AdminLearningModuleItem) => {
        setFormData({
            title: item.title,
            slug: item.slug,
            description: item.description,
            category: item.category,
            difficulty: item.difficulty,
            contentJsonText: JSON.stringify(item.content, null, 2),
            status: item.status,
        });
        setValidationErrors({});
        setErrorMessage(null);
        setEditingItem(item);
        setIsCreating(false);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setValidationErrors({});

        let parsedContent: Json;
        try {
            parsedContent = JSON.parse(formData.contentJsonText) as Json;
        } catch {
            setErrorMessage("Content must be valid JSON.");
            return;
        }

        const payload = {
            title: formData.title,
            slug: formData.slug,
            description: formData.description,
            category: formData.category,
            difficulty: formData.difficulty,
            content: parsedContent,
            status: formData.status,
        };

        startTransition(async () => {
            if (isCreating) {
                const res = await createAdminLearningModuleAction(payload);
                if (res.success) {
                    setModules((prev) => [...prev, res.data]);
                    setIsCreating(false);
                } else {
                    setErrorMessage(res.error);
                    if (res.validationErrors) setValidationErrors(res.validationErrors);
                }
            } else if (editingItem) {
                const res = await updateAdminLearningModuleAction(editingItem.id, payload);
                if (res.success) {
                    setModules((prev) => prev.map((item) => (item.id === editingItem.id ? res.data : item)));
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
            const res = await setAdminLearningModuleStatusAction(id, newStatus);
            if (res.success) {
                setModules((prev) => prev.map((item) => (item.id === id ? res.data : item)));
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="display-font text-2xl font-bold text-[#25382f]">Learning Curriculum</h2>
                    <p className="mt-1 text-sm text-[#59675c]">Manage Kitchen Quest educational modules, culinary techniques, and food science curriculum.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center rounded-xl bg-[#254235] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#1c3328]"
                >
                    + New Module
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7e3d9] bg-white p-4 sm:flex-row sm:items-center">
                <input
                    type="text"
                    placeholder="Search modules..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 rounded-lg border border-[#e7e3d9] bg-[#fdfcf9] px-3.5 py-2 text-sm text-[#25382f] placeholder-[#59675c] focus:border-[#254235] focus:outline-none"
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-lg border border-[#e7e3d9] bg-[#fdfcf9] px-3 py-2 text-sm text-[#25382f] focus:border-[#254235] focus:outline-none"
                >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.replace("_", " ")}</option>
                    ))}
                </select>
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
                    <div className="p-8 text-center text-sm text-[#59675c]">No learning modules found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#e7e3d9] text-left text-xs">
                            <thead className="bg-[#f8f6f0] text-[#59675c]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Title / Slug</th>
                                    <th className="px-4 py-3 font-semibold">Category</th>
                                    <th className="px-4 py-3 font-semibold">Difficulty</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Updated</th>
                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0ece1] bg-white">
                                {filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-[#fdfcf9]">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#25382f]">{item.title}</div>
                                            <div className="font-mono text-[11px] text-[#59675c]">{item.slug}</div>
                                        </td>
                                        <td className="px-4 py-3 capitalize text-[#59675c]">{item.category.replace("_", " ")}</td>
                                        <td className="px-4 py-3 capitalize text-[#59675c]">{item.difficulty}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={item.status} />
                                        </td>
                                        <td className="px-4 py-3 text-[#59675c]">{new Date(item.updatedAt).toLocaleDateString()}</td>
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
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-[#e7e3d9] pb-3">
                            <h3 className="display-font text-lg font-bold text-[#25382f]">
                                {isCreating ? "Create Learning Module" : `Edit "${editingItem?.title}"`}
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
                                <label className="block font-medium text-[#25382f]">Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    required
                                />
                                {validationErrors.title && <p className="mt-1 text-red-600">{validationErrors.title}</p>}
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Slug * (kebab-case)</label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    required
                                />
                                {validationErrors.slug && <p className="mt-1 text-red-600">{validationErrors.slug}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium text-[#25382f]">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as LearningModuleCategory })}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c}>{c.replace("_", " ")}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-medium text-[#25382f]">Difficulty</label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as DifficultyLevel })}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Description *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    required
                                />
                                {validationErrors.description && <p className="mt-1 text-red-600">{validationErrors.description}</p>}
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Content JSON *</label>
                                <textarea
                                    value={formData.contentJsonText}
                                    onChange={(e) => setFormData({ ...formData, contentJsonText: e.target.value })}
                                    rows={6}
                                    className="mt-1 w-full font-mono rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none text-[11px]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ContentStatus })}
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
                                    {isPending ? "Saving..." : isCreating ? "Create Module" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
