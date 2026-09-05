"use client";

/**
 * Common layout shell for every patient-facing screen after the
 * welcome screen. Renders:
 *
 *   - Persistent top bar (Back / Home / Help)
 *   - Step indicator
 *   - The screen body, with reserved space at the bottom for the
 *     AccessibilityBar so content never hides under it
 *
 * The shell is intentionally layout-only — it has no business logic
 * so screens stay pure and easy to diff.
 */
import type { ReactNode } from "react";
import { AccessibilityBar } from "@/components/kiosk/AccessibilityBar";
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
    <div className="flex min-h-screen flex-col bg-background pb-32">
      <KioskTopBar />
      {showStep ? (
        <div className="mx-auto w-full max-w-5xl px-4 pt-4">
          <StepIndicator currentStep={step} />
        </div>
      ) : null}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </main>
      <AccessibilityBar />
    </div>
  );
}