"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic } from "lucide-react";
import { rpcClient } from "@/lib/api-client";
import type { SupportedLanguage } from "@/lib/types";

// ─── Typed Web Speech API wrappers ───────────────────────────────────────────
// The Web Speech API is not yet in the TypeScript DOM lib, so we define
// minimal typed interfaces rather than casting to `any`.

interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative;
  readonly length: number;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
  readonly length: number;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// Browser-prefixed constructor
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    (
      window as Window &
        typeof globalThis & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
    ).SpeechRecognition ??
    (
      window as Window &
        typeof globalThis & {
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        }
    ).webkitSpeechRecognition ??
    null
  );
}

// ─── Component props ──────────────────────────────────────────────────────────

export interface HoldToSpeakProps {
  onTranscript: (text: string) => void;
  language?: SupportedLanguage;
  /** Whether animations should be suppressed (prefers-reduced-motion). */
  reducedMotion?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Hold-to-speak voice capture button.
 * Primary: Sarvam STT via /api/ai/transcribe.
 * Fallback: Web Speech API (browser built-in).
 * Size: 160px diameter for kiosk touch targets.
 */
export function HoldToSpeak({
  onTranscript,
  language = "en",
  reducedMotion = false,
}: HoldToSpeakProps): React.ReactElement {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  // Detect reduced-motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(reducedMotion);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches || reducedMotion);
    const handler = (e: MediaQueryListEvent): void =>
      setPrefersReducedMotion(e.matches || reducedMotion);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [reducedMotion]);

  const langCode =
    language === "hi" ? "hi-IN" : language === "ta" ? "ta-IN" : "en-IN";

  const fallbackToWebSpeech = useCallback((): void => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      console.error("Web Speech API not supported in this browser.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = langCode;
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent): void => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onTranscript(transcript);
    };

    recognitionRef.current.onerror = (
      event: SpeechRecognitionErrorEvent
    ): void => {
      console.error("Web Speech API error:", event.error);
    };

    recognitionRef.current.onend = (): void => {
      setIsProcessing(false);
    };

    recognitionRef.current.start();
  }, [langCode, onTranscript]);

  const startRecording = useCallback(
    async (e: React.SyntheticEvent): Promise<void> => {
      e.preventDefault();
      if (isRecording || isProcessing) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        console.error("getUserMedia not available.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event: BlobEvent): void => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        // Volume visualizer
        if (!prefersReducedMotion) {
          const AudioContextCtor =
            window.AudioContext ??
            (
              window as Window &
                typeof globalThis & {
                  webkitAudioContext?: typeof AudioContext;
                }
            ).webkitAudioContext;

          if (AudioContextCtor) {
            const audioCtx = new AudioContextCtor();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 256;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateVolume = (): void => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]!;
              const average = sum / dataArray.length;
              const scale = 1 + average / 128;
              if (pulseRef.current) {
                pulseRef.current.style.transform = `scale(${scale})`;
                pulseRef.current.style.opacity = String(
                  Math.min(0.8, average / 100)
                );
              }
              animationFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
          }
        }

        recorder.start();
        setIsRecording(true);
      } catch (err: unknown) {
        console.error("Failed to start recording:", err);
      }
    },
    [isRecording, isProcessing, prefersReducedMotion]
  );

  const stopRecording = useCallback(
    async (e?: React.SyntheticEvent): Promise<void> => {
      if (e) e.preventDefault();
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive")
        return;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (pulseRef.current) pulseRef.current.style.transform = "scale(1)";

      await new Promise<void>((resolve) => {
        const recorder = mediaRecorderRef.current!;
        recorder.onstop = async (): Promise<void> => {
          setIsRecording(false);
          setIsProcessing(true);
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          try {
            const file = new File([audioBlob], "audio.webm", {
              type: "audio/webm",
            });
            const res = await rpcClient.api.ai.transcribe.$post({
              form: { file },
            });

            if (!res.ok) {
              console.warn("Sarvam STT unavailable, using Web Speech fallback.");
              fallbackToWebSpeech();
            } else {
              const data = await res.json();
              if (data.success) {
                onTranscript(data.data);
                setIsProcessing(false);
              } else {
                console.warn("Sarvam STT failed, using Web Speech fallback.");
                fallbackToWebSpeech();
              }
            }
          } catch (err: unknown) {
            console.warn("Network error during STT, using Web Speech fallback.", err);
            fallbackToWebSpeech();
          }

          recorder.stream.getTracks().forEach((track) => track.stop());
          resolve();
        };
        recorder.stop();
      });
    },
    [fallbackToWebSpeech, onTranscript]
  );

  const label = isProcessing
    ? language === "hi"
      ? "सोच रहे हैं..."
      : language === "ta"
        ? "சிந்திக்கிறது..."
        : "Thinking..."
    : isRecording
      ? language === "hi"
        ? "सुन रहे हैं..."
        : language === "ta"
          ? "கேட்கிறது..."
          : "Listening..."
      : language === "hi"
        ? "बोलने के लिए दबाएं"
        : language === "ta"
          ? "பேச அழுத்தவும்"
          : "Hold to Speak";

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Waveform pulse — only when recording and motion allowed */}
      {isRecording && !prefersReducedMotion && (
        <>
          <div
            ref={pulseRef}
            className="absolute inset-0 rounded-full bg-destructive opacity-30 pointer-events-none transition-transform duration-75"
          />
          <div className="absolute -inset-5 rounded-full bg-destructive/20 animate-pulse pointer-events-none" />
          <div
            className="absolute -inset-10 rounded-full bg-destructive/10 animate-pulse pointer-events-none"
            style={{ animationDelay: "200ms" }}
          />
        </>
      )}

      {/* Main button — 160px diameter */}
      <button
        className={`relative z-10 w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 touch-none select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 ${
          isRecording
            ? "bg-destructive scale-110 shadow-destructive/40"
            : isProcessing
              ? "bg-muted cursor-wait"
              : "bg-primary hover:bg-primary/90 active:scale-95 shadow-primary/30"
        }`}
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onPointerCancel={stopRecording}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={label}
        aria-pressed={isRecording}
        disabled={isProcessing}
      >
        <Mic
          className={`w-16 h-16 text-white ${isRecording && !prefersReducedMotion ? "animate-pulse" : ""}`}
        />
        {isRecording && !prefersReducedMotion && (
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-3 bg-white rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </button>

      {/* Always-visible label */}
      <span
        className={`mt-5 text-xl font-bold transition-colors duration-300 ${
          isRecording
            ? "text-destructive"
            : isProcessing
              ? "text-muted-foreground"
              : "text-primary"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
