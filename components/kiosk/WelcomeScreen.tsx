"use client";

import { useSessionStore } from "@/lib/store/session";
import type { SupportedLanguage } from "@/lib/types";
import { Leaf, ShieldCheck, Heart, Scale } from "lucide-react";

interface LanguageCard {
  id: SupportedLanguage;
  native: string;
  label: string;
  greeting: string;
}

const LANGUAGES: LanguageCard[] = [
  { id: "hi", native: "हिंदी", label: "Hindi / Hinglish", greeting: "नमस्ते! आपका स्वागत है।" },
  { id: "en", native: "English", label: "English", greeting: "Hello! Welcome to VaidyaSetu." },
  { id: "ta", native: "தமிழ்", label: "Tamil / Tanglish", greeting: "வணக்கம்! வரவேற்கிறோம்." },
];

/**
 * Welcome screen with large language cards and trust badges.
 * Each card speaks a greeting on selection.
 */
export function WelcomeScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const setStep = useSessionStore((s) => s.setStep);
  const audioEnabled = useSessionStore((s) => s.audioEnabled);

  const selectLanguage = (lang: SupportedLanguage): void => {
    useSessionStore.setState({ language: lang });

    // Speak greeting
    if (audioEnabled && "speechSynthesis" in window) {
      const card = LANGUAGES.find((l) => l.id === lang);
      if (card) {
        const utterance = new SpeechSynthesisUtterance(card.greeting);
        const voices = window.speechSynthesis.getVoices();
        const voiceMatch = voices.find((v) => v.lang.startsWith(lang === "hi" ? "hi" : lang === "ta" ? "ta" : "en"));
        if (voiceMatch) utterance.voice = voiceMatch;
        utterance.lang = lang === "hi" ? "hi-IN" : lang === "ta" ? "ta-IN" : "en-IN";
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleBegin = (): void => {
    setStep("consent");
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl flex flex-col items-center text-center">
        {/* Logo & branding */}
        <div className="bg-primary/10 p-5 rounded-3xl mb-6">
          <Leaf className="w-14 h-14 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">VaidyaSetu</h1>
        <p className="text-xl text-muted-foreground mb-2">वैद्यसेतु</p>
        <p className="text-lg text-muted-foreground mb-10">
          AYUSH OPD Patient Kiosk
        </p>

        {/* Language cards */}
        <div className="grid grid-cols-1 gap-4 w-full mb-10">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => selectLanguage(lang.id)}
              className={`kiosk-touch flex items-center gap-5 p-6 rounded-2xl border-2 transition-all text-left ${
                language === lang.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/30"
              }`}
              aria-pressed={language === lang.id}
            >
              <span className="text-3xl">🇮🇳</span>
              <div className="flex-1">
                <span className="text-2xl font-bold block">{lang.native}</span>
                <span className="text-base text-muted-foreground">{lang.label}</span>
              </div>
              {language === lang.id && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-lg">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Begin button */}
        <button
          onClick={handleBegin}
          className="kiosk-touch w-full px-8 py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg transition-transform active:scale-[0.98]"
        >
          {language === "hi"
            ? "शुरू करें"
            : language === "ta"
              ? "தொடங்கு"
              : "Begin"}
        </button>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Heart className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Ministry of AYUSH</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">ABDM Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Scale className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">DPDP Act 2023</span>
          </div>
        </div>
      </div>
    </main>
  );
}
