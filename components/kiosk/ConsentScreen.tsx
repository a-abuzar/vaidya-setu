"use client";

import { useSessionStore } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Volume2 } from "lucide-react";
import type { ConsentPurpose } from "@/lib/store/session";

/**
 * DPDP Act 2023 Consent Screen
 */
export function ConsentScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const audioEnabled = useSessionStore((s) => s.audioEnabled);
  const consents = useSessionStore((s) => s.consents);
  const setConsent = useSessionStore((s) => s.setConsent);
  const nextStep = useSessionStore((s) => s.nextStep);

  const dict = getDictionary(language).consent;

  const playAudio = (text: string): void => {
    if (!audioEnabled || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voiceMatch = voices.find((v) =>
      v.lang.startsWith(language === "hi" ? "hi" : language === "ta" ? "ta" : "en")
    );
    if (voiceMatch) utterance.voice = voiceMatch;
    utterance.lang = language === "hi" ? "hi-IN" : language === "ta" ? "ta-IN" : "en-IN";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const isGranted = (purpose: ConsentPurpose): boolean => {
    return consents.find((c) => c.purpose === purpose)?.granted ?? false;
  };

  const allRequiredGranted =
    isGranted("clinical_data_collection") &&
    isGranted("temporary_storage") &&
    isGranted("data_sharing_with_physician");

  const purposes: { id: ConsentPurpose; required: boolean }[] = [
    { id: "clinical_data_collection", required: true },
    { id: "abdm_health_record_linking", required: false },
    { id: "data_sharing_with_physician", required: true },
    { id: "temporary_storage", required: true },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-3">{dict.title}</h1>
          <p className="text-lg text-muted-foreground">{dict.subtitle}</p>
        </div>

        <div className="space-y-4">
          {purposes.map((p) => {
            const purposeDict = dict.purposes[p.id];
            const granted = isGranted(p.id);

            return (
              <div
                key={p.id}
                className={`flex gap-6 p-6 rounded-2xl border-2 transition-colors ${
                  granted ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-foreground">{purposeDict.label}</h2>
                    {p.required && (
                      <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-wider">
                        {dict.requiredLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-lg mb-4">{purposeDict.description}</p>

                  <button
                    onClick={() => playAudio(purposeDict.description)}
                    className="kiosk-touch flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-muted text-foreground transition-colors"
                    aria-label={`Listen to ${purposeDict.label}`}
                  >
                    <Volume2 className="w-5 h-5" />
                    <span className="font-medium text-sm">Listen</span>
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center gap-3 border-l border-border pl-6">
                  <Switch
                    checked={granted}
                    onCheckedChange={(checked) => setConsent(p.id, checked)}
                    className="scale-150 data-[state=checked]:bg-primary"
                    aria-label={`Toggle consent for ${purposeDict.label}`}
                  />
                  <span
                    className={`text-sm font-bold ${
                      granted ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {granted ? "Agreed" : "Not agreed"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-8 flex justify-center">
          <button
            onClick={nextStep}
            disabled={!allRequiredGranted}
            className="kiosk-touch min-w-[280px] px-8 py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 disabled:pointer-events-none"
          >
            {dict.continueButton}
          </button>
        </div>
      </div>
    </div>
  );
}
