"use client";

import { useSessionStore, type ConsentPurpose } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Volume2 } from "lucide-react";

/** Consent purposes in display order. */
const CONSENT_ORDER: ConsentPurpose[] = [
  "clinical_data_collection",
  "temporary_storage",
  "data_sharing_with_physician",
  "abdm_health_record_linking",
];

/** Purposes that must be granted before continuing. */
const REQUIRED_PURPOSES = new Set<ConsentPurpose>([
  "clinical_data_collection",
  "temporary_storage",
]);

function speakText(text: string, lang: string): void {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang.startsWith(lang));
  if (match) utterance.voice = match;
  utterance.lang =
    lang === "hi" ? "hi-IN" : lang === "ta" ? "ta-IN" : "en-IN";
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/**
 * Consent Screen — DPDP Act 2023 granular consent.
 * Required consents: clinical_data_collection, temporary_storage.
 * Optional: abdm_health_record_linking, data_sharing_with_physician.
 */
export function ConsentScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const consents = useSessionStore((s) => s.consents);
  const setConsent = useSessionStore((s) => s.setConsent);
  const nextStep = useSessionStore((s) => s.nextStep);
  const audioEnabled = useSessionStore((s) => s.audioEnabled);

  const dict = getDictionary(language);

  const langCode = language === "hi" ? "hi" : language === "ta" ? "ta" : "en";

  const requiredGranted = Array.from(REQUIRED_PURPOSES).every(
    (p) => consents.find((c) => c.purpose === p)?.granted === true
  );

  const handleToggle = (purpose: ConsentPurpose, granted: boolean): void => {
    setConsent(purpose, granted);
  };

  const handlePlayDescription = (description: string): void => {
    if (!audioEnabled) return;
    speakText(description, langCode);
  };

  const handleContinue = (): void => {
    nextStep();
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center pt-4 pb-2">
          <div className="bg-primary/10 p-4 rounded-2xl mb-4">
            <ShieldCheck className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {dict.consent.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {dict.consent.subtitle}
          </p>
        </div>

        {/* Consent items */}
        <div className="flex flex-col gap-4">
          {CONSENT_ORDER.map((purpose) => {
            const consentItem = consents.find((c) => c.purpose === purpose);
            const isGranted = consentItem?.granted ?? false;
            const isRequired = REQUIRED_PURPOSES.has(purpose);
            const purposeDict =
              dict.consent.purposes[
                purpose as keyof typeof dict.consent.purposes
              ];

            return (
              <div
                key={purpose}
                className={`rounded-2xl border-2 p-5 transition-colors ${
                  isGranted
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Toggle */}
                  <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
                    <Switch
                      checked={isGranted}
                      onCheckedChange={(checked) =>
                        handleToggle(purpose, checked)
                      }
                      aria-label={purposeDict.label}
                      className="scale-125"
                    />
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg font-semibold text-foreground">
                        {purposeDict.label}
                      </span>
                      {isRequired && (
                        <Badge variant="secondary" className="text-xs font-medium">
                          {dict.consent.requiredLabel}
                        </Badge>
                      )}
                      {isGranted && (
                        <Badge className="text-xs font-medium bg-primary text-primary-foreground">
                          ✓{" "}
                          {language === "hi"
                            ? "सहमत"
                            : language === "ta"
                              ? "ஏற்கிறேன்"
                              : "Agreed"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {purposeDict.description}
                    </p>
                  </div>

                  {/* Audio button */}
                  <button
                    onClick={() =>
                      handlePlayDescription(purposeDict.description)
                    }
                    className="kiosk-touch flex items-center justify-center p-3 rounded-xl bg-secondary hover:bg-muted transition-colors flex-shrink-0"
                    aria-label={`Read aloud: ${purposeDict.label}`}
                  >
                    <Volume2 className="w-6 h-6 text-primary" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!requiredGranted}
          className="kiosk-touch w-full px-8 py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          aria-disabled={!requiredGranted}
        >
          {dict.consent.continueButton}
        </button>

        {!requiredGranted && (
          <p className="text-center text-base text-muted-foreground -mt-2">
            {language === "hi"
              ? "आगे बढ़ने के लिए पहले दो विकल्पों को चालू करें।"
              : language === "ta"
                ? "தொடர முதல் இரண்டு விருப்பங்களை இயக்கவும்."
                : "Please turn on the first two options to continue."}
          </p>
        )}
      </div>
    </main>
  );
}
