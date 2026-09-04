"use client";

import { useSessionStore, KIOSK_STEPS, type KioskStep } from "@/lib/store/session";

const STEP_LABELS: Record<KioskStep, Record<"en" | "hi" | "ta", string>> = {
  language_select: { en: "Language", hi: "भाषा", ta: "மொழி" },
  consent: { en: "Consent", hi: "सहमति", ta: "ஒப்புதல்" },
  identify: { en: "Identity", hi: "पहचान", ta: "அடையாளம்" },
  encounter: { en: "Health Talk", hi: "स्वास्थ्य बात", ta: "உடல்நல பேச்சு" },
  document_scan: { en: "Documents", hi: "दस्तावेज़", ta: "ஆவணங்கள்" },
  summary_review: { en: "Review", hi: "समीक्षा", ta: "மதிப்பாய்வு" },
  complete: { en: "Done", hi: "पूर्ण", ta: "முடிந்தது" },
};

/** Visible steps (exclude complete from the progress display). */
const VISIBLE_STEPS = KIOSK_STEPS.filter((s) => s !== "complete");

/**
 * Step X of Y progress indicator — always visible at top of kiosk.
 */
export function StepProgress(): React.ReactElement {
  const currentStep = useSessionStore((s) => s.currentStep);
  const language = useSessionStore((s) => s.language);

  const currentIdx = VISIBLE_STEPS.indexOf(currentStep as (typeof VISIBLE_STEPS)[number]);
  const displayIdx = currentStep === "complete" ? VISIBLE_STEPS.length : currentIdx + 1;
  const total = VISIBLE_STEPS.length;

  return (
    <div className="px-6 py-3 bg-card border-b border-border">
      {/* Step X of Y text */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-muted-foreground">
          {language === "hi"
            ? `चरण ${displayIdx} / ${total}`
            : language === "ta"
              ? `படி ${displayIdx} / ${total}`
              : `Step ${displayIdx} of ${total}`}
        </span>
        <span className="text-sm font-semibold text-primary">
          {currentStep !== "complete"
            ? STEP_LABELS[currentStep][language]
            : STEP_LABELS.complete[language]}
        </span>
      </div>

      {/* Segmented progress bar */}
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={displayIdx} aria-valuemax={total}>
        {VISIBLE_STEPS.map((step, i) => {
          const isComplete = i < currentIdx || currentStep === "complete";
          const isCurrent = step === currentStep;

          return (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-colors ${
                isComplete
                  ? "bg-primary"
                  : isCurrent
                    ? "bg-primary/60"
                    : "bg-border"
              }`}
              aria-label={STEP_LABELS[step][language]}
            />
          );
        })}
      </div>
    </div>
  );
}
