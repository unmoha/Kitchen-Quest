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

export function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
