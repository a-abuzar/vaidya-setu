"use client";

import { useSessionStore } from "@/lib/store/session";
import { WelcomeScreen } from "@/components/kiosk/WelcomeScreen";
import { ConsentScreen } from "@/components/kiosk/ConsentScreen";
import { IdentifyScreen } from "@/components/kiosk/IdentifyScreen";
import { EncounterScreen } from "@/components/kiosk/EncounterScreen";
import { DocumentScanScreen } from "@/components/kiosk/DocumentScanScreen";
import { SummaryReviewScreen } from "@/components/kiosk/SummaryReviewScreen";

/**
 * Kiosk flow orchestrator.
 * Renders exactly one screen component at a time based on the currentStep
 * from the Zustand session store. No logic lives here — it's pure routing.
 */
export default function KioskPage(): React.ReactElement {
  const currentStep = useSessionStore((s) => s.currentStep);

  switch (currentStep) {
    case "language_select":
      return <WelcomeScreen />;
    case "consent":
      return <ConsentScreen />;
    case "identify":
      return <IdentifyScreen />;
    case "encounter":
      return <EncounterScreen />;
    case "document_scan":
      return <DocumentScanScreen />;
    case "summary_review":
      return <SummaryReviewScreen />;
    case "complete":
      return <WelcomeScreen />;
    default: {
      // Exhaustiveness check — TypeScript will catch unhandled KioskStep values
      const _exhaustive: never = currentStep;
      console.error("Unknown kiosk step:", _exhaustive);
      return <WelcomeScreen />;
    }
  }
}
