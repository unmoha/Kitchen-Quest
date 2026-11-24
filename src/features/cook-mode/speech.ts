/** Minimal typings for the browser Web Speech API, which is not in lib.dom. */
export interface RecognitionResultLike {
    isFinal: boolean;
    0: { transcript: string };
}

export interface RecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<RecognitionResultLike>;
}

export interface RecognitionLike {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: RecognitionEventLike) => void) | null;
    onend: (() => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    start(): void;
    stop(): void;
}

type RecognitionConstructor = new () => RecognitionLike;

export function getRecognitionConstructor(): RecognitionConstructor | null {
    if (typeof window === "undefined") return null;
    const w = window as unknown as {
        SpeechRecognition?: RecognitionConstructor;
        webkitSpeechRecognition?: RecognitionConstructor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Tracks our own read-aloud voice so the microphone can ignore it (otherwise
// a step that says "when the pan is ready" would trigger the "ready" command).
const ECHO_TAIL_MS = 900;
let utteranceId = 0;
let speaking = false;
let lastSpokeAt = 0;

/** True while speaking and for a short tail afterwards, when late transcripts of our own voice can still arrive. */
export function isSpeaking(): boolean {
    return speaking || Date.now() - lastSpokeAt < ECHO_TAIL_MS;
}

export function speak(text: string, onDone?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        onDone?.();
        return;
    }
    window.speechSynthesis.cancel();
    const id = ++utteranceId;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    const finish = () => {
        if (id !== utteranceId) return; // a newer utterance replaced this one
        speaking = false;
        lastSpokeAt = Date.now();
        onDone?.();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    speaking = true;
    window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
    utteranceId++;
    speaking = false;
    lastSpokeAt = Date.now();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
