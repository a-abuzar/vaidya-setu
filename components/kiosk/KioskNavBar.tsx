"use client";

import { useSessionStore } from "@/lib/store/session";
import { ArrowLeft, Home, Phone } from "lucide-react";
import { useState } from "react";

/**
 * Persistent bottom navigation bar for kiosk screens.
 * Back, Home (with confirmation), and Call for Help.
 */
export function KioskNavBar(): React.ReactElement {
  const currentStep = useSessionStore((s) => s.currentStep);
  const prevStep = useSessionStore((s) => s.prevStep);
  const resetSession = useSessionStore((s) => s.resetSession);
  const language = useSessionStore((s) => s.language);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [showHelpConfirm, setShowHelpConfirm] = useState(false);

  const isFirstStep = currentStep === "language_select";

  const labels = {
    back: language === "hi" ? "← पीछे" : language === "ta" ? "← பின்" : "← Back",
    home: language === "hi" ? "🏠 शुरू" : language === "ta" ? "🏠 முகப்பு" : "🏠 Home",
    help: language === "hi" ? "📞 मदद चाहिए" : language === "ta" ? "📞 உதவி" : "📞 Call for Help",
    homeConfirmTitle:
      language === "hi"
        ? "क्या आप शुरू से शुरू करना चाहते हैं?"
        : language === "ta"
          ? "ஆரம்பத்திலிருந்து தொடங்க விரும்புகிறீர்களா?"
          : "Start over from the beginning?",
    homeConfirmMessage:
      language === "hi"
        ? "आपकी सारी जानकारी मिट जाएगी।"
        : language === "ta"
          ? "உங்கள் அனைத்து தகவல்களும் அழிக்கப்படும்."
          : "All your information will be cleared.",
    helpMessage:
      language === "hi"
        ? "कर्मचारी को सूचित किया गया है। कृपया प्रतीक्षा करें।"
        : language === "ta"
          ? "ஊழியர் அறிவிக்கப்பட்டார். தயவுசெய்து காத்திருங்கள்."
          : "Staff has been notified. Please wait.",
    yes: language === "hi" ? "हाँ" : language === "ta" ? "ஆம்" : "Yes",
    no: language === "hi" ? "नहीं" : language === "ta" ? "இல்லை" : "No",
    ok: language === "hi" ? "ठीक है" : language === "ta" ? "சரி" : "OK",
  };

  const handleHomeConfirm = (): void => {
    setShowHomeConfirm(false);
    resetSession();
  };

  return (
    <>
      {/* Confirmation overlays */}
      {showHomeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-3xl p-8 mx-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-3">{labels.homeConfirmTitle}</h2>
            <p className="text-lg text-muted-foreground mb-8">{labels.homeConfirmMessage}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowHomeConfirm(false)}
                className="kiosk-touch flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-secondary text-foreground font-semibold text-lg"
              >
                {labels.no}
              </button>
              <button
                onClick={handleHomeConfirm}
                className="kiosk-touch flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-lg"
              >
                {labels.yes}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-3xl p-8 mx-6 max-w-lg w-full shadow-2xl text-center">
            <div className="text-5xl mb-4">📞</div>
            <h2 className="text-2xl font-bold text-foreground mb-3">{labels.helpMessage}</h2>
            <button
              onClick={() => setShowHelpConfirm(false)}
              className="kiosk-touch mt-6 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg"
            >
              {labels.ok}
            </button>
          </div>
        </div>
      )}

      {/* Nav bar */}
      <nav
        className="flex items-center justify-between px-4 py-3 bg-card border-t border-border"
        aria-label="Kiosk navigation"
      >
        <button
          onClick={prevStep}
          disabled={isFirstStep}
          className="kiosk-touch flex items-center gap-2 px-5 py-3 rounded-2xl bg-secondary text-foreground font-semibold disabled:opacity-30 transition-colors hover:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
          <span>{labels.back}</span>
        </button>

        <button
          onClick={() => setShowHomeConfirm(true)}
          className="kiosk-touch flex items-center gap-2 px-5 py-3 rounded-2xl bg-secondary text-foreground font-semibold transition-colors hover:bg-muted"
          aria-label="Go home"
        >
          <Home className="w-6 h-6" />
          <span>{labels.home}</span>
        </button>

        <button
          onClick={() => setShowHelpConfirm(true)}
          className="kiosk-touch flex items-center gap-2 px-5 py-3 rounded-2xl bg-accent text-accent-foreground font-semibold transition-colors"
          aria-label="Call for help"
        >
          <Phone className="w-6 h-6" />
          <span>{labels.help}</span>
        </button>
      </nav>
    </>
  );
}
