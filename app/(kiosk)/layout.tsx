"use client";

import { useSessionStore } from "@/lib/store/session";
import { AccessibilityBar } from "@/components/kiosk/AccessibilityBar";
import { StepProgress } from "@/components/kiosk/StepProgress";
import { KioskNavBar } from "@/components/kiosk/KioskNavBar";
import { SyncStatusBadge } from "@/components/kiosk/SyncStatusBadge";
import { useEffect } from "react";

/**
 * Kiosk layout — wraps all patient-facing routes.
 * Provides persistent accessibility controls, step progress, and navigation.
 */
export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const currentStep = useSessionStore((s) => s.currentStep);
  const textSizeMultiplier = useSessionStore((s) => s.textSizeMultiplier);
  const highContrastMode = useSessionStore((s) => s.highContrastMode);

  const showChrome = currentStep !== "language_select";

  // Apply font scale to CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty("--kiosk-font-scale", String(textSizeMultiplier));
  }, [textSizeMultiplier]);

  // Apply high contrast class
  useEffect(() => {
    if (highContrastMode) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrastMode]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top chrome: sync status + accessibility + step progress */}
      {showChrome && (
        <header className="flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">🌿 VaidyaSetu</span>
            </div>
            <SyncStatusBadge />
          </div>
          <AccessibilityBar />
          <StepProgress />
        </header>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>

      {/* Bottom navigation */}
      {showChrome && <KioskNavBar />}
    </div>
  );
}
