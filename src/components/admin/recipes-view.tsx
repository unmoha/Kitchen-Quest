"use client";

import { useState, useTransition } from "react";
import type { AdminRecipeItem, AdminIngredientItem, ContentStatus, DifficultyLevel } from "@/features/admin/types";
import { StatusBadge } from "./status-badge";
import {
    createAdminRecipeAction,
    updateAdminRecipeAction,
    setAdminRecipeStatusAction,
    getAdminRecipeAction,
} from "@/features/admin/actions";

export function RecipesView({
    initialRecipes,
    availableIngredients,
}: {
    initialRecipes: AdminRecipeItem[];
    availableIngredients: AdminIngredientItem[];
}) {
    const [recipes, setRecipes] = useState<AdminRecipeItem[]>(initialRecipes);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Recipe Form State
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [cuisine, setCuisine] = useState("Italian");
    const [category, setCategory] = useState("Main Course");
    const [difficulty, setDifficulty] = useState<DifficultyLevel>("beginner");
    const [prepTime, setPrepTime] = useState<number>(15);
    const [cookTime, setCookTime] = useState<number>(30);
    const [servings, setServings] = useState<number>(4);
    const [educationalInfo, setEducationalInfo] = useState("");
    const [safetyNotes, setSafetyNotes] = useState("");
    const [status, setStatus] = useState<ContentStatus>("draft");

    // Dynamic Lists for Ingredients and Steps
    const [recipeIngredients, setRecipeIngredients] = useState<Array<{
        ingredientId: string;
        quantity: number;
        unit: string;
        isOptional: boolean;
        preparationNote: string;
    }>>([]);

    const [recipeSteps, setRecipeSteps] = useState<Array<{
        stepNumber: number;
        instruction: string;
        timeMinutes: number | "";
        educationalNote: string;
    }>>([]);

    const filtered = recipes.filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.cuisine.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openCreateModal = () => {
        setTitle("");
        setSlug("");
        setDescription("");
        setCuisine("Italian");
        setCategory("Main Course");
        setDifficulty("beginner");
        setPrepTime(15);
        setCookTime(30);
        setServings(4);
        setEducationalInfo("");
        setSafetyNotes("");
        setStatus("draft");
        setRecipeIngredients([]);
        setRecipeSteps([{ stepNumber: 1, instruction: "", timeMinutes: "", educationalNote: "" }]);
        setValidationErrors({});
        setErrorMessage(null);
        setIsCreating(true);
        setEditingRecipeId(null);
    };

    const openEditModal = async (recipeSummary: AdminRecipeItem) => {
        setErrorMessage(null);
        setValidationErrors({});
        const res = await getAdminRecipeAction(recipeSummary.id);
        if (!res.success) {
            alert(res.error);
            return;
        }

        const full = res.data;
        setTitle(full.title);
        setSlug(full.slug);
        setDescription(full.description);
        setCuisine(full.cuisine);
        setCategory(full.category);
        setDifficulty(full.difficulty);
        setPrepTime(full.prepTimeMinutes);
        setCookTime(full.cookTimeMinutes);
        setServings(full.servings);
        setEducationalInfo(full.educationalInfo);
        setSafetyNotes(full.safetyNotes);
        setStatus(full.status);

        setRecipeIngredients(
            (full.ingredients || []).map((ing: { ingredientId: string; quantity: number; unit: string; isOptional: boolean; preparationNote: string | null }) => ({
                ingredientId: ing.ingredientId,
                quantity: ing.quantity,
                unit: ing.unit,
                isOptional: ing.isOptional,
                preparationNote: ing.preparationNote ?? "",
            })),
        );

        setRecipeSteps(
            (full.steps || []).map((st: { stepNumber: number; instruction: string; timeMinutes: number | null; educationalNote: string | null }) => ({
                stepNumber: st.stepNumber,
                instruction: st.instruction,
                timeMinutes: st.timeMinutes ?? "",
                educationalNote: st.educationalNote ?? "",
            })),
        );

        setEditingRecipeId(full.id);
        setIsCreating(false);
    };

    const addIngredientRow = () => {
        const firstIngId = availableIngredients[0]?.id ?? "";
        setRecipeIngredients((prev) => [
            ...prev,
            { ingredientId: firstIngId, quantity: 1, unit: "g", isOptional: false, preparationNote: "" },
        ]);
    };

    const removeIngredientRow = (index: number) => {
        setRecipeIngredients((prev) => prev.filter((_, i) => i !== index));
    };

    const addStepRow = () => {
        setRecipeSteps((prev) => [
            ...prev,
            { stepNumber: prev.length + 1, instruction: "", timeMinutes: "", educationalNote: "" },
        ]);
    };

    const removeStepRow = (index: number) => {
        setRecipeSteps((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            return updated.map((st, i) => ({ ...st, stepNumber: i + 1 }));
        });
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setValidationErrors({});

        const payload = {
            title,
            slug,
            description,
            cuisine,
            category,
            difficulty,
            prepTimeMinutes: Number(prepTime),
            cookTimeMinutes: Number(cookTime),
            servings: Number(servings),
            educationalInfo,
            safetyNotes,
            status,
            ingredients: recipeIngredients.map((ing) => ({
                ingredientId: ing.ingredientId,
                quantity: Number(ing.quantity),
                unit: ing.unit,
                isOptional: ing.isOptional,
                preparationNote: ing.preparationNote ? ing.preparationNote : null,
            })),
            steps: recipeSteps.map((st, index) => ({
                stepNumber: index + 1,
                instruction: st.instruction,
                timeMinutes: st.timeMinutes === "" ? null : Number(st.timeMinutes),
                educationalNote: st.educationalNote ? st.educationalNote : null,
            })),
        };

        startTransition(async () => {
            if (isCreating) {
                const res = await createAdminRecipeAction(payload);
                if (res.success) {
                    setRecipes((prev) => [...prev, res.data]);
                    setIsCreating(false);
                } else {
                    setErrorMessage(res.error);
                    if (res.validationErrors) setValidationErrors(res.validationErrors);
                }
            } else if (editingRecipeId) {
                const res = await updateAdminRecipeAction(editingRecipeId, payload);
                if (res.success) {
                    setRecipes((prev) => prev.map((item) => (item.id === editingRecipeId ? res.data : item)));
                    setEditingRecipeId(null);
                } else {
                    setErrorMessage(res.error);
                    if (res.validationErrors) setValidationErrors(res.validationErrors);
                }
            }
        });
    };

    const handleStatusChange = (id: string, newStatus: ContentStatus) => {
        startTransition(async () => {
            const res = await setAdminRecipeStatusAction(id, newStatus);
            if (res.success) {
                setRecipes((prev) => prev.map((item) => (item.id === id ? res.data : item)));
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="display-font text-2xl font-bold text-[#25382f]">Recipe Management</h2>
                    <p className="mt-1 text-sm text-[#59675c]">Manage recipes, ingredient requirements, cooking steps, and culinary techniques.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center rounded-xl bg-[#254235] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#1c3328]"
                >
                    + New Recipe
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7e3d9] bg-white p-4 sm:flex-row sm:items-center">
                <input
                    type="text"
                    placeholder="Search recipes by title or cuisine..."
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
                    <div className="p-8 text-center text-sm text-[#59675c]">No recipes found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#e7e3d9] text-left text-xs">
                            <thead className="bg-[#f8f6f0] text-[#59675c]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Title / Slug</th>
                                    <th className="px-4 py-3 font-semibold">Cuisine / Category</th>
                                    <th className="px-4 py-3 font-semibold">Difficulty</th>
                                    <th className="px-4 py-3 font-semibold">Time / Servings</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
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
                                        <td className="px-4 py-3 text-[#59675c]">
                                            <div>{item.cuisine}</div>
                                            <div className="text-[11px] text-[#59675c]">{item.category}</div>
                                        </td>
                                        <td className="px-4 py-3 capitalize text-[#59675c]">{item.difficulty}</td>
                                        <td className="px-4 py-3 text-[#59675c]">
                                            {item.prepTimeMinutes + item.cookTimeMinutes}m ({item.servings} serv)
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

            {/* Recipe Modal Editor */}
            {(isCreating || editingRecipeId) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-[#e7e3d9] pb-3">
                            <h3 className="display-font text-lg font-bold text-[#25382f]">
                                {isCreating ? "Create New Recipe" : `Edit "${title}"`}
                            </h3>
                            <button
                                onClick={() => { setIsCreating(false); setEditingRecipeId(null); }}
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
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                        required
                                    />
                                    {validationErrors.slug && <p className="mt-1 text-red-600">{validationErrors.slug}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block font-medium text-[#25382f]">Cuisine *</label>
                                    <input
                                        type="text"
                                        value={cuisine}
                                        onChange={(e) => setCuisine(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-[#25382f]">Category *</label>
                                    <input
                                        type="text"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-[#25382f]">Difficulty</label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label className="block font-medium text-[#25382f]">Prep Time (min)</label>
                                    <input
                                        type="number"
                                        value={prepTime}
                                        onChange={(e) => setPrepTime(Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                        min={0}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-[#25382f]">Cook Time (min)</label>
                                    <input
                                        type="number"
                                        value={cookTime}
                                        onChange={(e) => setCookTime(Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                        min={0}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-[#25382f]">Servings</label>
                                    <input
                                        type="number"
                                        value={servings}
                                        onChange={(e) => setServings(Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                        min={1}
                                        required
                                    />
                                </div>
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

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block font-medium text-[#25382f]">Educational Info *</label>
                                    <textarea
                                        value={educationalInfo}
                                        onChange={(e) => setEducationalInfo(e.target.value)}
                                        rows={2}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                        placeholder="Explain the culinary technique or science behind this dish."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-medium text-[#25382f]">Safety Notes *</label>
                                    <textarea
                                        value={safetyNotes}
                                        onChange={(e) => setSafetyNotes(e.target.value)}
                                        rows={2}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                        placeholder="Temperatures, knife safety, cross contamination precautions."
                                        required
                                    />
                                </div>
                            </div>

                            {/* Ingredients Section */}
                            <div className="rounded-xl border border-[#e7e3d9] bg-[#fcfbf7] p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-[#25382f]">Recipe Ingredients</h4>
                                    <button
                                        type="button"
                                        onClick={addIngredientRow}
                                        className="rounded-md bg-[#254235] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1c3328]"
                                    >
                                        + Add Ingredient
                                    </button>
                                </div>
                                {recipeIngredients.map((ing, idx) => (
                                    <div key={idx} className="flex flex-wrap items-center gap-2 border-b border-[#e7e3d9] pb-2 text-xs">
                                        <select
                                            value={ing.ingredientId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRecipeIngredients((prev) => prev.map((item, i) => (i === idx ? { ...item, ingredientId: val } : item)));
                                            }}
                                            className="flex-1 rounded-md border border-[#e7e3d9] bg-white p-1.5 focus:outline-none"
                                        >
                                            {availableIngredients.map((avail) => (
                                                <option key={avail.id} value={avail.id}>
                                                    {avail.name} ({avail.status})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={ing.quantity}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setRecipeIngredients((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: val } : item)));
                                            }}
                                            placeholder="Qty"
                                            className="w-16 rounded-md border border-[#e7e3d9] bg-white p-1.5 focus:outline-none"
                                            step="any"
                                            min="0.01"
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={ing.unit}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRecipeIngredients((prev) => prev.map((item, i) => (i === idx ? { ...item, unit: val } : item)));
                                            }}
                                            placeholder="Unit (e.g. g, tbsp)"
                                            className="w-24 rounded-md border border-[#e7e3d9] bg-white p-1.5 focus:outline-none"
                                            required
                                        />
                                        <label className="flex items-center space-x-1 text-[11px] text-[#59675c]">
                                            <input
                                                type="checkbox"
                                                checked={ing.isOptional}
                                                onChange={(e) => {
                                                    const val = e.target.checked;
                                                    setRecipeIngredients((prev) => prev.map((item, i) => (i === idx ? { ...item, isOptional: val } : item)));
                                                }}
                                            />
                                            <span>Optional</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeIngredientRow(idx)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Steps Section */}
                            <div className="rounded-xl border border-[#e7e3d9] bg-[#fcfbf7] p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-[#25382f]">Recipe Steps (Sequential)</h4>
                                    <button
                                        type="button"
                                        onClick={addStepRow}
                                        className="rounded-md bg-[#254235] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1c3328]"
                                    >
                                        + Add Step
                                    </button>
                                </div>
                                {recipeSteps.map((st, idx) => (
                                    <div key={idx} className="flex items-start gap-2 border-b border-[#e7e3d9] pb-2 text-xs">
                                        <span className="mt-2 font-bold text-[#254235]">#{idx + 1}</span>
                                        <textarea
                                            value={st.instruction}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setRecipeSteps((prev) => prev.map((item, i) => (i === idx ? { ...item, instruction: val } : item)));
                                            }}
                                            placeholder="Instruction for this cooking step..."
                                            rows={2}
                                            className="flex-1 rounded-md border border-[#e7e3d9] bg-white p-1.5 focus:outline-none"
                                            required
                                        />
                                        <input
                                            type="number"
                                            value={st.timeMinutes}
                                            onChange={(e) => {
                                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                                setRecipeSteps((prev) => prev.map((item, i) => (i === idx ? { ...item, timeMinutes: val } : item)));
                                            }}
                                            placeholder="Mins"
                                            className="w-16 rounded-md border border-[#e7e3d9] bg-white p-1.5 focus:outline-none"
                                            min={0}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeStepRow(idx)}
                                            className="mt-2 text-red-600 hover:text-red-800"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
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
                                    onClick={() => { setIsCreating(false); setEditingRecipeId(null); }}
                                    className="rounded-lg border border-[#e7e3d9] px-4 py-2 text-xs font-semibold text-[#59675c] hover:bg-[#f0ece1]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="rounded-lg bg-[#254235] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1c3328] disabled:opacity-50"
                                >
                                    {isPending ? "Saving..." : isCreating ? "Create Recipe" : "Save Recipe"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
