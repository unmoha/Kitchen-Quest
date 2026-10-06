"use client";

import { useState, useTransition } from "react";
import type {
    AdminDailyChallengeItem,
    AdminRecipeItem,
    AdminLearningModuleItem,
    AdminIngredientItem,
    ContentStatus,
    DailyChallengeType,
} from "@/features/admin/types";
import { StatusBadge } from "./status-badge";
import {
    createAdminDailyChallengeAction,
    updateAdminDailyChallengeAction,
    setAdminDailyChallengeStatusAction,
} from "@/features/admin/actions";

export function ChallengesView({
    initialChallenges,
    availableRecipes,
    availableModules,
    availableIngredients,
}: {
    initialChallenges: AdminDailyChallengeItem[];
    availableRecipes: AdminRecipeItem[];
    availableModules: AdminLearningModuleItem[];
    availableIngredients: AdminIngredientItem[];
}) {
    const [challenges, setChallenges] = useState<AdminDailyChallengeItem[]>(initialChallenges);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [editingItem, setEditingItem] = useState<AdminDailyChallengeItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Form state
    const [challengeDate, setChallengeDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [challengeType, setChallengeType] = useState<DailyChallengeType>("recipe");
    const [recipeId, setRecipeId] = useState<string>(availableRecipes[0]?.id ?? "");
    const [learningModuleId, setLearningModuleId] = useState<string>(availableModules[0]?.id ?? "");
    const [ingredientId, setIngredientId] = useState<string>(availableIngredients[0]?.id ?? "");
    const [status, setStatus] = useState<ContentStatus>("draft");

    const filtered = challenges.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.challengeDate.includes(search);
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openCreateModal = () => {
        setChallengeDate(new Date().toISOString().slice(0, 10));
        setTitle("");
        setSlug("");
        setDescription("");
        setChallengeType("recipe");
        setRecipeId(availableRecipes[0]?.id ?? "");
        setLearningModuleId(availableModules[0]?.id ?? "");
        setIngredientId(availableIngredients[0]?.id ?? "");
        setStatus("draft");
        setValidationErrors({});
        setErrorMessage(null);
        setIsCreating(true);
        setEditingItem(null);
    };

    const openEditModal = (item: AdminDailyChallengeItem) => {
        setChallengeDate(item.challengeDate);
        setTitle(item.title);
        setSlug(item.slug);
        setDescription(item.description);
        setChallengeType(item.challengeType);
        setRecipeId(item.recipeId ?? availableRecipes[0]?.id ?? "");
        setLearningModuleId(item.learningModuleId ?? availableModules[0]?.id ?? "");
        setIngredientId(item.ingredientId ?? availableIngredients[0]?.id ?? "");
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

        const payload = {
            challengeDate,
            title,
            slug,
            description,
            challengeType,
            recipeId: challengeType === "recipe" ? recipeId : null,
            learningModuleId: challengeType === "learning_module" ? learningModuleId : null,
            ingredientId: challengeType === "ingredient" ? ingredientId : null,
            status,
        };

        startTransition(async () => {
            if (isCreating) {
                const res = await createAdminDailyChallengeAction(payload);
                if (res.success) {
                    setChallenges((prev) => [res.data, ...prev]);
                    setIsCreating(false);
                } else {
                    setErrorMessage(res.error);
                    if (res.validationErrors) setValidationErrors(res.validationErrors);
                }
            } else if (editingItem) {
                const res = await updateAdminDailyChallengeAction(editingItem.id, payload);
                if (res.success) {
                    setChallenges((prev) => prev.map((item) => (item.id === editingItem.id ? res.data : item)));
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
            const res = await setAdminDailyChallengeStatusAction(id, newStatus);
            if (res.success) {
                setChallenges((prev) => prev.map((item) => (item.id === id ? res.data : item)));
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="display-font text-2xl font-bold text-[#25382f]">Daily Challenge Scheduler</h2>
                    <p className="mt-1 text-sm text-[#59675c]">Schedule and publish daily cooking challenges and curriculum quests.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center rounded-xl bg-[#254235] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#1c3328]"
                >
                    + Schedule Challenge
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7e3d9] bg-white p-4 sm:flex-row sm:items-center">
                <input
                    type="text"
                    placeholder="Search by title or date (YYYY-MM-DD)..."
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
                    <div className="p-8 text-center text-sm text-[#59675c]">No daily challenges found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#e7e3d9] text-left text-xs">
                            <thead className="bg-[#f8f6f0] text-[#59675c]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Date</th>
                                    <th className="px-4 py-3 font-semibold">Title / Slug</th>
                                    <th className="px-4 py-3 font-semibold">Type</th>
                                    <th className="px-4 py-3 font-semibold">Target Entity</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0ece1] bg-white">
                                {filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-[#fdfcf9]">
                                        <td className="px-4 py-3 font-mono font-bold text-[#254235]">{item.challengeDate}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#25382f]">{item.title}</div>
                                            <div className="font-mono text-[11px] text-[#59675c]">{item.slug}</div>
                                        </td>
                                        <td className="px-4 py-3 capitalize text-[#59675c]">{item.challengeType.replace("_", " ")}</td>
                                        <td className="px-4 py-3 text-[#59675c]">
                                            {item.recipeTitle ?? item.learningModuleTitle ?? item.ingredientName ?? "—"}
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
                                {isCreating ? "Schedule Daily Challenge" : "Edit Challenge"}
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium text-[#25382f]">Challenge Date *</label>
                                    <input
                                        type="date"
                                        value={challengeDate}
                                        onChange={(e) => setChallengeDate(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                        required
                                    />
                                    {validationErrors.challengeDate && <p className="mt-1 text-red-600">{validationErrors.challengeDate}</p>}
                                </div>
                                <div>
                                    <label className="block font-medium text-[#25382f]">Challenge Type</label>
                                    <select
                                        value={challengeType}
                                        onChange={(e) => setChallengeType(e.target.value as DailyChallengeType)}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    >
                                        <option value="recipe">Recipe</option>
                                        <option value="learning_module">Learning Module</option>
                                        <option value="ingredient">Ingredient</option>
                                        <option value="technique">Technique</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Title *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    required
                                />
                                {validationErrors.title && <p className="mt-1 text-red-600">{validationErrors.title}</p>}
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Slug * (kebab-case)</label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    placeholder="e.g. daily-pasta-perfection"
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

                            {/* Target Selection based on Type */}
                            {challengeType === "recipe" && (
                                <div>
                                    <label className="block font-medium text-[#25382f]">Target Recipe *</label>
                                    <select
                                        value={recipeId}
                                        onChange={(e) => setRecipeId(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    >
                                        {availableRecipes.map((r) => (
                                            <option key={r.id} value={r.id}>{r.title} ({r.status})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {challengeType === "learning_module" && (
                                <div>
                                    <label className="block font-medium text-[#25382f]">Target Learning Module *</label>
                                    <select
                                        value={learningModuleId}
                                        onChange={(e) => setLearningModuleId(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    >
                                        {availableModules.map((m) => (
                                            <option key={m.id} value={m.id}>{m.title} ({m.status})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {challengeType === "ingredient" && (
                                <div>
                                    <label className="block font-medium text-[#25382f]">Target Ingredient *</label>
                                    <select
                                        value={ingredientId}
                                        onChange={(e) => setIngredientId(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    >
                                        {availableIngredients.map((i) => (
                                            <option key={i.id} value={i.id}>{i.name} ({i.status})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

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
                                    {isPending ? "Saving..." : isCreating ? "Schedule Challenge" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
