"use client";

/**
 * Lightweight browser-TTS narration hook. Wraps the SpeechSynthesis API
 * with cancellation on unmount, language hint matching, and an
 * enabled/disabled switch that other components can flip from the
 * accessibility bar.
 */
import { useCallback, useEffect, useRef } from "react";
import { useKioskUi } from "@/lib/store/kiosk-ui";

const LANG_BCP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
};

export interface SpeechHandle {
  /**
   * Speak the given text. Cancels any in-flight utterance. If audio
   * is muted at the kiosk level or unavailable in the browser, this
   * is a silent no-op.
   */
  speak: (text: string, langOverride?: string) => void;
  cancel: () => void;
}

export function useSpeech(): SpeechHandle {
  const audioEnabled = useKioskUi((s) => s.audioEnabled);
  const language = useKioskUi((s) => s.language);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cancel = useCallback((): void => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speak = useCallback(
    (text: string, langOverride?: string): void => {
      if (typeof window === "undefined") return;
      if (!("speechSynthesis" in window)) return;
      if (!audioEnabled) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(trimmed);
      const targetLang = langOverride ?? LANG_BCP[language] ?? "en-IN";
      utterance.lang = targetLang;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((v) => v.lang === targetLang) ??
        voices.find((v) => v.lang.startsWith(targetLang.split("-")[0] ?? "en")) ??
        voices.find((v) => v.default);
      if (voice) utterance.voice = voice;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [audioEnabled, language],
  );

  return { speak, cancel };
}