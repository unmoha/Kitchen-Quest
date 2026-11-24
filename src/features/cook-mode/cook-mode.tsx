"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
    ArrowLeft,
    ArrowRight,
    BellRing,
    ChefHat,
    Check,
    Lightbulb,
    ListChecks,
    Mic,
    MicOff,
    Pause,
    Play,
    Plus,
    RotateCcw,
    Timer,
    Volume2,
    VolumeX,
    X,
} from "lucide-react";
import {
    describeDuration,
    formatClock,
    parseCookCommand,
    remainingSeconds,
    suggestTimerSeconds,
    type CookCommand,
} from "./logic";
import { getRecognitionConstructor, isSpeaking, speak, stopSpeaking, type RecognitionLike } from "./speech";
import type { CookModeProps } from "./types";

interface TimerState {
    step: number;
    total: number;
    endsAt: number | null;
    pausedLeft: number;
    ringing: boolean;
}

type Phase = "prep" | "cook" | "done";

const subscribeNothing = () => () => {};
const voiceSupportedNow = () => getRecognitionConstructor() !== null;
const voiceSupportedOnServer = () => false;

export function CookMode({ slug, recipeName, servings, safetyNotes, ingredients, steps }: CookModeProps) {
    const [phase, setPhase] = useState<Phase>("prep");
    const [index, setIndex] = useState(0);
    const [checked, setChecked] = useState<Record<number, boolean>>({});
    const [showIngredients, setShowIngredients] = useState(false);
    const [showWhy, setShowWhy] = useState(false);
    const [readAloud, setReadAloud] = useState(false);
    const [timer, setTimer] = useState<TimerState | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [listening, setListening] = useState(false);
    const [heard, setHeard] = useState("");
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [awake, setAwake] = useState(false);

    const voiceSupported = useSyncExternalStore(subscribeNothing, voiceSupportedNow, voiceSupportedOnServer);
    const recognitionRef = useRef<RecognitionLike | null>(null);
    const wantVoiceRef = useRef(false);
    const audioRef = useRef<AudioContext | null>(null);
    const commandRef = useRef<(command: CookCommand) => void>(() => {});
    const ingredientsOpenRef = useRef(false);
    const restartDelayRef = useRef(300);
    const startedAtRef = useRef(0);

    const step = steps[index];
    const ringing = timer?.ringing ?? false;
    const suggested = step ? suggestTimerSeconds({ minutes: step.minutes, instruction: step.instruction }) : null;
    const timerLeft = timer ? remainingSeconds(timer, now) : 0;
    const packedCount = Object.values(checked).filter(Boolean).length;
    const progress = phase === "done" ? 100 : phase === "prep" ? 0 : Math.round(((index + 1) / steps.length) * 100);

    function ensureAudio() {
        if (!audioRef.current && typeof window !== "undefined") {
            const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (Ctor) audioRef.current = new Ctor();
        }
        void audioRef.current?.resume();
    }

    function startTimer(seconds: number, forStep: number) {
        ensureAudio();
        const start = Date.now();
        setNow(start);
        setTimer({ step: forStep, total: seconds, endsAt: start + seconds * 1000, pausedLeft: seconds, ringing: false });
    }

    function pauseTimer() {
        if (!timer || timer.endsAt === null) return;
        setTimer({ ...timer, endsAt: null, pausedLeft: remainingSeconds(timer, Date.now()) });
    }

    function resumeTimer() {
        if (!timer || timer.endsAt !== null || timer.ringing) return;
        ensureAudio();
        const start = Date.now();
        setNow(start);
        setTimer({ ...timer, endsAt: start + timer.pausedLeft * 1000 });
    }

    function addMinute() {
        if (!timer) return;
        if (timer.ringing) {
            startTimer(60, timer.step);
            return;
        }
        if (timer.endsAt !== null) {
            setTimer({ ...timer, endsAt: timer.endsAt + 60_000, total: timer.total + 60 });
        } else {
            setTimer({ ...timer, pausedLeft: timer.pausedLeft + 60, total: timer.total + 60 });
        }
    }

    function goTo(target: number) {
        if (target < 0) return;
        setShowWhy(false);
        if (target >= steps.length) {
            stopSpeaking();
            setPhase("done");
            return;
        }
        setIndex(target);
        if (readAloud) speak(steps[target].instruction);
    }

    function beginCooking() {
        ensureAudio();
        setPhase("cook");
        setIndex(0);
        setShowWhy(false);
        if (readAloud && steps[0]) speak(steps[0].instruction);
    }

    function restart() {
        setPhase("prep");
        setIndex(0);
        setChecked({});
        setTimer(null);
        setShowWhy(false);
    }

    function runCommand(command: CookCommand) {
        if (phase === "prep") {
            if (command.type === "next") beginCooking();
            if (command.type === "ingredients") setShowIngredients((open) => !open);
            return;
        }
        if (phase !== "cook" || !step) return;
        switch (command.type) {
            case "next":
                goTo(index + 1);
                break;
            case "back":
                goTo(index - 1);
                break;
            case "repeat":
                speak(step.instruction);
                break;
            case "why":
                setShowWhy(true);
                speak(step.note ?? "There is no extra note for this step.");
                break;
            case "ingredients":
                setShowIngredients((open) => !open);
                break;
            case "timer-set":
                startTimer(command.seconds, index);
                break;
            case "timer-start":
                if (timer && timer.endsAt === null && !timer.ringing) resumeTimer();
                else if (suggested) startTimer(suggested, index);
                break;
            case "timer-pause":
                pauseTimer();
                break;
            case "timer-clear":
                setTimer(null);
                break;
        }
    }

    // Always point the voice/keyboard handlers at the latest render's closure.
    useEffect(() => {
        commandRef.current = runCommand;
        ingredientsOpenRef.current = showIngredients;
    });

    function startVoice() {
        ensureAudio();
        const Recognition = getRecognitionConstructor();
        if (!Recognition) return;
        setVoiceError(null);
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (!result.isFinal || isSpeaking()) continue; // ignore our own read-aloud voice
                const text = result[0].transcript;
                setHeard(text.trim());
                const command = parseCookCommand(text);
                if (command) commandRef.current(command);
            }
        };
        recognition.onend = () => {
            if (!wantVoiceRef.current) {
                setListening(false);
                return;
            }
            // Back off when sessions die immediately (network/permission glitches) instead of spinning.
            const lived = Date.now() - startedAtRef.current;
            const delay = lived > 3000 ? 300 : restartDelayRef.current;
            restartDelayRef.current = lived > 3000 ? 300 : Math.min(delay * 2, 5000);
            window.setTimeout(() => {
                if (!wantVoiceRef.current) return;
                try {
                    startedAtRef.current = Date.now();
                    recognition.start();
                } catch {
                    wantVoiceRef.current = false;
                    setListening(false);
                }
            }, delay);
        };
        recognition.onerror = (event) => {
            if (event.error === "audio-capture") {
                wantVoiceRef.current = false;
                setListening(false);
                setVoiceError("No microphone was found on this device.");
                return;
            }
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                wantVoiceRef.current = false;
                setListening(false);
                setVoiceError("Microphone access was blocked. Allow it in your browser to use voice.");
            }
        };
        wantVoiceRef.current = true;
        recognitionRef.current = recognition;
        try {
            startedAtRef.current = Date.now();
            recognition.start();
            setListening(true);
        } catch {
            wantVoiceRef.current = false;
            setVoiceError("Voice control could not start in this browser.");
        }
    }

    function stopVoice() {
        wantVoiceRef.current = false;
        recognitionRef.current?.stop();
        setListening(false);
    }

    // Tick while a timer is running; flip it to "ringing" at zero.
    useEffect(() => {
        if (!timer || timer.endsAt === null) return;
        const endsAt = timer.endsAt;
        const id = window.setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (current >= endsAt) {
                setTimer((existing) =>
                    existing && existing.endsAt === endsAt
                        ? { ...existing, endsAt: null, pausedLeft: 0, ringing: true }
                        : existing,
                );
            }
        }, 250);
        return () => window.clearInterval(id);
    }, [timer]);

    // Alarm: repeating beep + vibration until dismissed.
    useEffect(() => {
        if (!ringing) return;
        const beep = () => {
            const ctx = audioRef.current;
            if (ctx) {
                const oscillator = ctx.createOscillator();
                const gain = ctx.createGain();
                oscillator.type = "sine";
                oscillator.frequency.value = 880;
                gain.gain.setValueAtTime(0.0001, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
                oscillator.connect(gain).connect(ctx.destination);
                oscillator.start();
                oscillator.stop(ctx.currentTime + 0.55);
            }
            if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        };
        beep();
        const id = window.setInterval(beep, 1500);
        return () => window.clearInterval(id);
    }, [ringing]);

    // Keep the screen awake while cooking.
    useEffect(() => {
        let lock: WakeLockSentinel | null = null;
        let cancelled = false;
        const acquire = async () => {
            try {
                if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
                const sentinel = await navigator.wakeLock.request("screen");
                if (cancelled) {
                    void sentinel.release();
                    return;
                }
                lock = sentinel;
                sentinel.addEventListener("release", () => setAwake(false));
                setAwake(true);
            } catch {
                setAwake(false);
            }
        };
        const onVisibility = () => {
            if (document.visibilityState === "visible") void acquire();
        };
        void acquire();
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", onVisibility);
            void lock?.release().catch(() => {});
        };
    }, []);

    // Keyboard shortcuts for floury hands and laptops on the counter.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            if (ingredientsOpenRef.current) {
                if (event.key === "Escape") commandRef.current({ type: "ingredients" });
                return; // don't change steps behind the ingredients sheet
            }
            if (event.key === "ArrowRight") commandRef.current({ type: "next" });
            if (event.key === "ArrowLeft") commandRef.current({ type: "back" });
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Stop microphone and speech when leaving the page.
    useEffect(() => {
        return () => {
            wantVoiceRef.current = false;
            recognitionRef.current?.stop();
            stopSpeaking();
        };
    }, []);

    const iconButton =
        "grid size-11 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-[#f8f6f0] transition-colors hover:bg-white/15 focus-visible:outline-[#f0c86a] aria-pressed:bg-[#f0c86a] aria-pressed:text-[#1c3328]";
    const bigButton =
        "inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold transition-colors focus-visible:outline-[#f0c86a] disabled:opacity-40";

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#1c3328] text-[#f8f6f0]" role="dialog" aria-label={`Cook mode: ${recipeName}`}>
            <div className="h-1.5 w-full bg-white/10" aria-hidden="true">
                <div className="h-full bg-[#f0c86a] transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>

            <header className="flex items-center gap-3 px-4 py-3 sm:px-8">
                <Link aria-label="Leave cook mode" className={iconButton} href={`/recipes/${slug}`}>
                    <X aria-hidden="true" size={20} />
                </Link>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{recipeName}</p>
                    <p className="text-xs text-[#b9c8bb]">
                        {phase === "prep" && `Mise en place · serves ${servings}`}
                        {phase === "cook" && `Step ${index + 1} of ${steps.length}`}
                        {phase === "done" && "Finished"}
                        {awake ? " · screen stays on" : ""}
                    </p>
                </div>
                {phase !== "done" ? (
                    <div className="flex items-center gap-2">
                        <button aria-label="Show ingredients" aria-pressed={showIngredients} className={iconButton} onClick={() => setShowIngredients((open) => !open)} type="button">
                            <ListChecks aria-hidden="true" size={19} />
                        </button>
                        <button
                            aria-label={readAloud ? "Turn off read aloud" : "Turn on read aloud"}
                            aria-pressed={readAloud}
                            className={iconButton}
                            onClick={() => {
                                if (readAloud) stopSpeaking();
                                else if (phase === "cook" && step) speak(step.instruction);
                                setReadAloud((on) => !on);
                            }}
                            type="button"
                        >
                            {readAloud ? <Volume2 aria-hidden="true" size={19} /> : <VolumeX aria-hidden="true" size={19} />}
                        </button>
                        {voiceSupported ? (
                            <button
                                aria-label={listening ? "Stop voice control" : "Start voice control"}
                                aria-pressed={listening}
                                className={iconButton}
                                onClick={listening ? stopVoice : startVoice}
                                type="button"
                            >
                                {listening ? <Mic aria-hidden="true" size={19} /> : <MicOff aria-hidden="true" size={19} />}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </header>

            {listening ? (
                <p aria-live="polite" className="mx-4 rounded-full bg-white/10 px-4 py-2 text-center text-xs text-[#d7e2d8] sm:mx-8">
                    Listening — say “next”, “back”, “repeat”, “why”, or “set a timer for 5 minutes”.{heard ? ` Heard: “${heard}”` : ""}
                </p>
            ) : null}
            {voiceError ? <p className="mx-4 rounded-full bg-[#b14b30] px-4 py-2 text-center text-xs sm:mx-8" role="alert">{voiceError}</p> : null}

            <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center overflow-y-auto px-5 py-6 sm:px-8">
                {phase === "prep" ? (
                    <section aria-labelledby="prep-title">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f0c86a]">Before you start</p>
                        <h1 className="display-font mt-2 text-4xl sm:text-5xl" id="prep-title">Mise en place</h1>
                        <p className="mt-3 max-w-xl text-[#c9d6cb]">
                            Pros gather and prep everything first, so nothing burns while you hunt for the garlic. Tick items as you set them out.
                        </p>
                        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                            {ingredients.map((ingredient, i) => (
                                <li key={`${ingredient.name}-${i}`}>
                                    <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 has-[:checked]:bg-white/15">
                                        <input
                                            checked={Boolean(checked[i])}
                                            className="size-5 accent-[#f0c86a]"
                                            onChange={(event) => setChecked((current) => ({ ...current, [i]: event.target.checked }))}
                                            type="checkbox"
                                        />
                                        <span className="flex-1 text-sm">
                                            {ingredient.name}
                                            {ingredient.preparationNote ? <span className="block text-xs text-[#b9c8bb]">{ingredient.preparationNote}</span> : null}
                                        </span>
                                        <span className="shrink-0 text-sm text-[#f0c86a]">
                                            {ingredient.quantity} {ingredient.unit}
                                            {ingredient.isOptional ? " · optional" : ""}
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-4 text-xs text-[#b9c8bb]">{packedCount} of {ingredients.length} ready</p>
                        {safetyNotes ? (
                            <p className="mt-4 rounded-2xl border border-[#f0c86a]/30 bg-[#f0c86a]/10 p-4 text-sm leading-6 text-[#f6e3ac]">
                                <strong className="font-semibold">Food safety:</strong> {safetyNotes}
                            </p>
                        ) : null}
                    </section>
                ) : null}

                {phase === "cook" && step ? (
                    <section aria-labelledby="step-title">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f0c86a]" id="step-title">Step {step.number}</p>
                        <p aria-live="polite" className="display-font mt-4 text-3xl leading-tight sm:text-5xl sm:leading-[1.15]">{step.instruction}</p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            {suggested && (!timer || timer.step !== index) ? (
                                <button className={`${bigButton} bg-[#f0c86a] text-[#1c3328] hover:bg-[#f6d684]`} onClick={() => startTimer(suggested, index)} type="button">
                                    <Timer aria-hidden="true" size={20} />
                                    Start {describeDuration(suggested)} timer
                                </button>
                            ) : null}
                            {step.note ? (
                                <button
                                    aria-expanded={showWhy}
                                    className={`${bigButton} border border-white/20 bg-white/5 hover:bg-white/15`}
                                    onClick={() => {
                                        setShowWhy((open) => !open);
                                        if (!showWhy && readAloud) speak(step.note ?? "");
                                    }}
                                    type="button"
                                >
                                    <Lightbulb aria-hidden="true" size={20} />
                                    Why?
                                </button>
                            ) : null}
                        </div>

                        {showWhy && step.note ? (
                            <p className="mt-5 rounded-2xl border border-[#f0c86a]/30 bg-[#f0c86a]/10 p-5 text-lg leading-8 text-[#f6e3ac]">{step.note}</p>
                        ) : null}
                    </section>
                ) : null}

                {phase === "done" ? (
                    <section className="text-center" aria-labelledby="done-title">
                        <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#f0c86a] text-[#1c3328]">
                            <ChefHat aria-hidden="true" size={40} />
                        </span>
                        <h1 className="display-font mt-6 text-4xl sm:text-5xl" id="done-title">You cooked {recipeName}!</h1>
                        <p className="mx-auto mt-3 max-w-lg text-[#c9d6cb]">
                            Taste it, adjust the seasoning, and lock it in: practising the steps in a game is the fastest way to remember them.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Link className={`${bigButton} bg-[#b14b30] text-white hover:bg-[#c55a3d]`} href="/play/cooking-order">Practise in Cooking Order</Link>
                            <Link className={`${bigButton} border border-white/20 bg-white/5 hover:bg-white/15`} href={`/recipes/${slug}`}>Back to recipe</Link>
                            <button className={`${bigButton} border border-white/20 bg-white/5 hover:bg-white/15`} onClick={restart} type="button">
                                <RotateCcw aria-hidden="true" size={18} />
                                Cook again
                            </button>
                        </div>
                    </section>
                ) : null}
            </main>

            {ringing && timer ? (
                <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-[#f0c86a] p-4 text-[#1c3328] sm:mx-8" role="alert">
                    <p className="flex items-center gap-2 font-semibold">
                        <BellRing aria-hidden="true" size={22} />
                        Timer finished · step {steps[timer.step]?.number ?? timer.step + 1}
                    </p>
                    <div className="flex gap-2">
                        <button className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[#1c3328] px-5 text-sm font-semibold text-[#f8f6f0]" onClick={addMinute} type="button">
                            <Plus aria-hidden="true" size={16} /> 1 min
                        </button>
                        <button className="min-h-11 rounded-full bg-white px-5 text-sm font-semibold" onClick={() => setTimer(null)} type="button">Dismiss</button>
                    </div>
                </div>
            ) : null}

            {timer && !ringing ? (
                <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-3xl border border-white/15 bg-white/10 px-5 py-3 sm:mx-8">
                    <div>
                        <p className="text-xs text-[#b9c8bb]">Timer · step {steps[timer.step]?.number ?? timer.step + 1}</p>
                        <p aria-label={`${formatClock(timerLeft)} remaining`} className="display-font text-4xl tabular-nums">{formatClock(timerLeft)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button aria-label="Add one minute" className={iconButton} onClick={addMinute} type="button"><Plus aria-hidden="true" size={19} /></button>
                        {timer.endsAt !== null ? (
                            <button aria-label="Pause timer" className={iconButton} onClick={pauseTimer} type="button"><Pause aria-hidden="true" size={19} /></button>
                        ) : (
                            <button aria-label="Resume timer" className={iconButton} onClick={resumeTimer} type="button"><Play aria-hidden="true" size={19} /></button>
                        )}
                        <button aria-label="Cancel timer" className={iconButton} onClick={() => setTimer(null)} type="button"><X aria-hidden="true" size={19} /></button>
                    </div>
                </div>
            ) : null}

            {phase !== "done" ? (
                <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:px-8">
                    {phase === "cook" ? (
                        <button className={`${bigButton} border border-white/20 bg-white/5 hover:bg-white/15`} onClick={() => goTo(index - 1)} disabled={index === 0} type="button">
                            <ArrowLeft aria-hidden="true" size={20} /> Back
                        </button>
                    ) : <span />}
                    {phase === "prep" ? (
                        <button className={`${bigButton} bg-[#b14b30] text-white hover:bg-[#c55a3d]`} onClick={beginCooking} type="button">
                            Start cooking <ArrowRight aria-hidden="true" size={20} />
                        </button>
                    ) : (
                        <button className={`${bigButton} bg-[#b14b30] text-white hover:bg-[#c55a3d]`} onClick={() => goTo(index + 1)} type="button">
                            {index === steps.length - 1 ? (<>Finish <Check aria-hidden="true" size={20} /></>) : (<>Next <ArrowRight aria-hidden="true" size={20} /></>)}
                        </button>
                    )}
                </footer>
            ) : null}

            {showIngredients ? (
                <div className="absolute inset-0 z-10 flex items-end bg-black/50 sm:items-center sm:justify-center" onClick={() => setShowIngredients(false)}>
                    <div
                        aria-label="Ingredients"
                        className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-[#f8f6f0] p-6 text-[#254235] sm:max-w-lg sm:rounded-3xl"
                        onClick={(event) => event.stopPropagation()}
                        aria-modal="true"
                        role="dialog"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="display-font text-2xl">Ingredients</h2>
                            <button aria-label="Close ingredients" className="grid size-10 place-items-center rounded-full hover:bg-[#e9ede5]" onClick={() => setShowIngredients(false)} type="button"><X aria-hidden="true" size={20} /></button>
                        </div>
                        <ul className="mt-4 divide-y divide-[#e7e3d9]">
                            {ingredients.map((ingredient, i) => (
                                <li className="flex items-baseline justify-between gap-4 py-3 text-sm" key={`${ingredient.name}-${i}`}>
                                    <span className={checked[i] ? "text-[#59675c] line-through" : ""}>{ingredient.name}</span>
                                    <span className="shrink-0 text-[#59675c]">{ingredient.quantity} {ingredient.unit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
