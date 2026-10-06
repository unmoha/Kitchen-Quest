"use client";

import { useState, useTransition } from "react";
import type { AdminQuestionItem, AdminLearningModuleItem, ContentStatus, DifficultyLevel, QuestionType } from "@/features/admin/types";
import { StatusBadge } from "./status-badge";
import {
    createAdminQuestionAction,
    updateAdminQuestionAction,
    setAdminQuestionStatusAction,
    getAdminQuestionAction,
} from "@/features/admin/actions";

export function QuestionsView({
    initialQuestions,
    availableModules,
}: {
    initialQuestions: AdminQuestionItem[];
    availableModules: AdminLearningModuleItem[];
}) {
    const [questions, setQuestions] = useState<AdminQuestionItem[]>(initialQuestions);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [moduleFilter, setModuleFilter] = useState<string>("all");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Question form state
    const [slug, setSlug] = useState("");
    const [learningModuleId, setLearningModuleId] = useState<string>(availableModules[0]?.id ?? "");
    const [questionText, setQuestionText] = useState("");
    const [questionType, setQuestionType] = useState<QuestionType>("multiple_choice");
    const [explanation, setExplanation] = useState("");
    const [difficulty, setDifficulty] = useState<DifficultyLevel>("beginner");
    const [status, setStatus] = useState<ContentStatus>("draft");

    const [options, setOptions] = useState<Array<{
        optionText: string;
        optionOrder: number;
        isCorrect: boolean;
    }>>([
        { optionText: "", optionOrder: 1, isCorrect: true },
        { optionText: "", optionOrder: 2, isCorrect: false },
    ]);

    const filtered = questions.filter((item) => {
        const matchesSearch = item.questionText.toLowerCase().includes(search.toLowerCase()) || item.slug.includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesModule = moduleFilter === "all" || item.learningModuleId === moduleFilter;
        return matchesSearch && matchesStatus && matchesModule;
    });

    const openCreateModal = () => {
        setSlug("");
        setLearningModuleId(availableModules[0]?.id ?? "");
        setQuestionText("");
        setQuestionType("multiple_choice");
        setExplanation("");
        setDifficulty("beginner");
        setStatus("draft");
        setOptions([
            { optionText: "", optionOrder: 1, isCorrect: true },
            { optionText: "", optionOrder: 2, isCorrect: false },
        ]);
        setValidationErrors({});
        setErrorMessage(null);
        setIsCreating(true);
        setEditingId(null);
    };

    const openEditModal = async (question: AdminQuestionItem) => {
        setErrorMessage(null);
        setValidationErrors({});
        const res = await getAdminQuestionAction(question.id);
        if (!res.success) {
            alert(res.error);
            return;
        }

        const full = res.data;
        setSlug(full.slug);
        setLearningModuleId(full.learningModuleId ?? availableModules[0]?.id ?? "");
        setQuestionText(full.questionText);
        setQuestionType(full.questionType);
        setExplanation(full.explanation);
        setDifficulty(full.difficulty);
        setStatus(full.status);

        if (full.options && full.options.length > 0) {
            setOptions(
                full.options.map((o) => ({
                    optionText: o.optionText,
                    optionOrder: o.optionOrder,
                    isCorrect: o.isCorrect,
                })),
            );
        } else {
            setOptions([
                { optionText: "", optionOrder: 1, isCorrect: true },
                { optionText: "", optionOrder: 2, isCorrect: false },
            ]);
        }

        setEditingId(full.id);
        setIsCreating(false);
    };

    const addOption = () => {
        setOptions((prev) => [
            ...prev,
            { optionText: "", optionOrder: prev.length + 1, isCorrect: false },
        ]);
    };

    const removeOption = (index: number) => {
        setOptions((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            return updated.map((opt, i) => ({ ...opt, optionOrder: i + 1 }));
        });
    };

    const setCorrectOptionIndex = (index: number) => {
        setOptions((prev) =>
            prev.map((opt, i) => ({
                ...opt,
                isCorrect: i === index,
            })),
        );
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setValidationErrors({});

        const payload = {
            slug,
            learningModuleId: learningModuleId || null,
            questionText,
            questionType,
            explanation,
            difficulty,
            status,
            options: options.map((opt, i) => ({
                optionText: opt.optionText,
                optionOrder: i + 1,
                isCorrect: opt.isCorrect,
            })),
        };

        startTransition(async () => {
            if (isCreating) {
                const res = await createAdminQuestionAction(payload);
                if (res.success) {
                    setQuestions((prev) => [res.data, ...prev]);
                    setIsCreating(false);
                } else {
                    setErrorMessage(res.error);
                    if (res.validationErrors) setValidationErrors(res.validationErrors);
                }
            } else if (editingId) {
                const res = await updateAdminQuestionAction(editingId, payload);
                if (res.success) {
                    setQuestions((prev) => prev.map((item) => (item.id === editingId ? res.data : item)));
                    setEditingId(null);
                } else {
                    setErrorMessage(res.error);
                    if (res.validationErrors) setValidationErrors(res.validationErrors);
                }
            }
        });
    };

    const handleStatusChange = (id: string, newStatus: ContentStatus) => {
        startTransition(async () => {
            const res = await setAdminQuestionStatusAction(id, newStatus);
            if (res.success) {
                setQuestions((prev) => prev.map((item) => (item.id === id ? res.data : item)));
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="display-font text-2xl font-bold text-[#25382f]">Question Bank</h2>
                    <p className="mt-1 text-sm text-[#59675c]">Manage quiz questions, learning module associations, and multiple choice options.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center rounded-xl bg-[#254235] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#1c3328]"
                >
                    + New Question
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-[#e7e3d9] bg-white p-4 sm:flex-row sm:items-center">
                <input
                    type="text"
                    placeholder="Search question text or slug..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 rounded-lg border border-[#e7e3d9] bg-[#fdfcf9] px-3.5 py-2 text-sm text-[#25382f] placeholder-[#59675c] focus:border-[#254235] focus:outline-none"
                />
                <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="rounded-lg border border-[#e7e3d9] bg-[#fdfcf9] px-3 py-2 text-sm text-[#25382f] focus:border-[#254235] focus:outline-none"
                >
                    <option value="all">All Modules</option>
                    {availableModules.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
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

            {/* Content Table */}
            <div className="overflow-hidden rounded-2xl border border-[#e7e3d9] bg-white shadow-xs">
                {filtered.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#59675c]">No questions found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[#e7e3d9] text-left text-xs">
                            <thead className="bg-[#f8f6f0] text-[#59675c]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Question / Slug</th>
                                    <th className="px-4 py-3 font-semibold">Module</th>
                                    <th className="px-4 py-3 font-semibold">Type / Difficulty</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0ece1] bg-white">
                                {filtered.map((item) => (
                                    <tr key={item.id} className="hover:bg-[#fdfcf9]">
                                        <td className="max-w-md px-4 py-3">
                                            <div className="font-semibold text-[#25382f] line-clamp-2">{item.questionText}</div>
                                            <div className="font-mono text-[11px] text-[#59675c]">{item.slug}</div>
                                        </td>
                                        <td className="px-4 py-3 text-[#59675c]">{item.learningModuleTitle ?? "—"}</td>
                                        <td className="px-4 py-3 text-[#59675c]">
                                            <div className="capitalize">{item.questionType.replace("_", " ")}</div>
                                            <div className="text-[11px] capitalize text-[#59675c]">{item.difficulty}</div>
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
            {(isCreating || editingId) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between border-b border-[#e7e3d9] pb-3">
                            <h3 className="display-font text-lg font-bold text-[#25382f]">
                                {isCreating ? "Create Question" : "Edit Question"}
                            </h3>
                            <button
                                onClick={() => { setIsCreating(false); setEditingId(null); }}
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
                                <label className="block font-medium text-[#25382f]">Slug * (kebab-case)</label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    placeholder="e.g. knife-safety-question-1"
                                    required
                                />
                                {validationErrors.slug && <p className="mt-1 text-red-600">{validationErrors.slug}</p>}
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Associated Learning Module</label>
                                <select
                                    value={learningModuleId}
                                    onChange={(e) => setLearningModuleId(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                >
                                    <option value="">None / Unlinked</option>
                                    {availableModules.map((m) => (
                                        <option key={m.id} value={m.id}>{m.title} ({m.status})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-[#25382f]">Question Text *</label>
                                <textarea
                                    value={questionText}
                                    onChange={(e) => setQuestionText(e.target.value)}
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium text-[#25382f]">Question Type</label>
                                    <select
                                        value={questionType}
                                        onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                                        className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    >
                                        <option value="multiple_choice">Multiple Choice</option>
                                        <option value="true_false">True / False</option>
                                        <option value="ordering">Ordering</option>
                                    </select>
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

                            <div>
                                <label className="block font-medium text-[#25382f]">Explanation *</label>
                                <textarea
                                    value={explanation}
                                    onChange={(e) => setExplanation(e.target.value)}
                                    rows={2}
                                    className="mt-1 w-full rounded-lg border border-[#e7e3d9] p-2 focus:border-[#254235] focus:outline-none"
                                    placeholder="Explanation displayed to the user after answering."
                                    required
                                />
                            </div>

                            {/* Options Section */}
                            <div className="rounded-xl border border-[#e7e3d9] bg-[#fcfbf7] p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-[#25382f]">Answer Options (Select exactly one correct)</h4>
                                    <button
                                        type="button"
                                        onClick={addOption}
                                        className="rounded-md bg-[#254235] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1c3328]"
                                    >
                                        + Add Option
                                    </button>
                                </div>

                                {options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2 border-b border-[#e7e3d9] pb-2 text-xs">
                                        <input
                                            type="radio"
                                            name="correctOption"
                                            checked={opt.isCorrect}
                                            onChange={() => setCorrectOptionIndex(idx)}
                                            title="Mark as correct answer"
                                            className="h-4 w-4 text-[#254235]"
                                        />
                                        <input
                                            type="text"
                                            value={opt.optionText}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setOptions((prev) => prev.map((item, i) => (i === idx ? { ...item, optionText: val } : item)));
                                            }}
                                            placeholder={`Option ${idx + 1} text...`}
                                            className="flex-1 rounded-md border border-[#e7e3d9] bg-white p-1.5 focus:outline-none"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeOption(idx)}
                                            className="text-red-600 hover:text-red-800"
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
                                    onClick={() => { setIsCreating(false); setEditingId(null); }}
                                    className="rounded-lg border border-[#e7e3d9] px-4 py-2 text-xs font-semibold text-[#59675c] hover:bg-[#f0ece1]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="rounded-lg bg-[#254235] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1c3328] disabled:opacity-50"
                                >
                                    {isPending ? "Saving..." : isCreating ? "Create Question" : "Save Question"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
