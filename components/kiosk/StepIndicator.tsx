"use client";

/**
 * "Step X of Y" indicator used on every kiosk screen except the welcome
 * screen. The five patient-flow steps are:
 *
 *   1. Welcome (language select)  — index 0
 *   2. Consent                    — index 1
 *   3. Identify                   — index 2
 *   4. Encounter                  — index 3
 *   5. Documents                  — index 4
 *   6. Summary                    — index 5
 *
 * `currentStep` is the 0-indexed step; the displayed text uses
 * 1-indexed counts for patients.
 */
import { Check } from "lucide-react";
import { useKioskUi } from "@/lib/store/kiosk-ui";
import { t } from "@/lib/i18n/dict";

export const KIOSK_STEPS = [
  { key: "welcome", labelKey: "step.welcome" },
  { key: "consent", labelKey: "step.consent" },
  { key: "identify", labelKey: "step.identify" },
  { key: "encounter", labelKey: "step.encounter" },
  { key: "documents", labelKey: "step.documents" },
  { key: "summary", labelKey: "step.summary" },
] as const;

export type KioskStepKey = (typeof KIOSK_STEPS)[number]["key"];

export function StepIndicator({
  currentStep,
  className,
}: {
  currentStep: KioskStepKey;
  className?: string;
}): React.ReactElement {
  const language = useKioskUi((s) => s.language);
  const total = KIOSK_STEPS.length;
  const currentIndex = KIOSK_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <nav
      aria-label={t(language, "step.of", { current: currentIndex + 1, total })}
      className={`flex w-full flex-col gap-3 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <span>
          {t(language, "step.of", { current: currentIndex + 1, total })}
        </span>
        <span className="text-primary">
          {t(language, `step.${currentStep}`)}
        </span>
      </div>
      <ol className="flex w-full items-center gap-2">
        {KIOSK_STEPS.map((step, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex;
          return (
            <li
              key={step.key}
              aria-current={active ? "step" : undefined}
              className="flex flex-1 items-center gap-2"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-background text-primary"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : idx + 1}
              </span>
              {idx < total - 1 ? (
                <span
                  className={`h-1 flex-1 rounded-full ${done ? "bg-primary" : "bg-border"}`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}