"use client";

import { useSessionStore } from "@/lib/store/session";
import { WelcomeScreen } from "@/components/kiosk/WelcomeScreen";
import { ConsentScreen } from "@/components/kiosk/ConsentScreen";
import { IdentifyScreen } from "@/components/kiosk/IdentifyScreen";
import { EncounterScreen } from "@/components/kiosk/EncounterScreen";
import { DocumentScanScreen } from "@/components/kiosk/DocumentScanScreen";
import { SummaryReviewScreen } from "@/components/kiosk/SummaryReviewScreen";
import { CompleteScreen } from "@/components/kiosk/CompleteScreen";

/**
 * Main Kiosk Page orchestrator.
 * Renders exactly one step component based on the Zustand store's currentStep.
 */
export default function KioskPage(): React.ReactElement | null {
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
      return <CompleteScreen />;
    default:
      return null;
  }
}
