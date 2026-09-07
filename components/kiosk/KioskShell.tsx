"use client";

/**
 * Common layout shell for every patient-facing screen after the
 * welcome screen.
 *
 * Renders:
 *   - Persistent top bar (Back / Home / A11y controls / Language / Help)
 *   - Step indicator
 *   - Screen body
 *
 * Accessibility controls (text size, contrast, audio) now live inside
 * KioskTopBar. The former fixed-bottom AccessibilityBar has been removed.
 * Bottom of screen is reserved for the screen's own primary action buttons.
 */
import type { ReactNode } from "react";
import { KioskTopBar } from "@/components/kiosk/KioskTopBar";
import { StepIndicator, type KioskStepKey } from "@/components/kiosk/StepIndicator";

export function KioskShell({
  step,
  children,
  showStep = true,
}: {
  step: KioskStepKey;
  children: ReactNode;
  showStep?: boolean;
}): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-8">
      <KioskTopBar />
      {showStep ? (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <StepIndicator currentStep={step} />
        </div>
      ) : null}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </main>
    </div>
  );
}