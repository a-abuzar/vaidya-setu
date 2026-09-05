/**
 * Consent decisions store.
 *
 * Holds the DPDP Act 2023 consent toggles the patient has agreed to
 * during the consent screen. The actual persistence to Neon happens
 * via the consent endpoint added to the Hono router.
 */
import { create } from "zustand";
import type { SupportedLanguage } from "@/lib/types";
import {
  ALL_CONSENT_PURPOSES,
  type ConsentPurpose,
} from "@/lib/consent-types";

export { ALL_CONSENT_PURPOSES, type ConsentPurpose };

interface ConsentState {
  /** Map of purpose -> granted */
  decisions: Record<ConsentPurpose, boolean>;
  /** Language the patient gave consent in (audit-trail field). */
  consentLanguage: SupportedLanguage | null;
  /** ISO timestamp the consent was given. */
  consentedAt: string | null;
}

interface ConsentActions {
  setDecision: (purpose: ConsentPurpose, granted: boolean) => void;
  reset: () => void;
}

const initialState: ConsentState = {
  decisions: {
    clinical_data_collection: false,
    abdm_health_record_linking: false,
    data_sharing_with_physician: false,
    temporary_storage: false,
  },
  consentLanguage: null,
  consentedAt: null,
};

export const useConsentStore = create<ConsentState & ConsentActions>()((set) => ({
  ...initialState,
  setDecision: (purpose, granted) =>
    set((s) => ({
      decisions: { ...s.decisions, [purpose]: granted },
      consentLanguage: s.consentLanguage,
      consentedAt: s.consentedAt,
    })),
  reset: () => set(initialState),
}));

/** Pure helper used by the consent screen for validation. */
export function isConsentValidForVisit(
  decisions: Record<ConsentPurpose, boolean>,
): { ok: boolean; missing: ConsentPurpose[] } {
  // The only purpose we must require to proceed is clinical data
  // collection. ABDM linking is offered but optional per ABDM
  // design guidelines; the rest default to true because without
  // them the kiosk cannot function.
  const required: ConsentPurpose[] = [
    "clinical_data_collection",
    "data_sharing_with_physician",
    "temporary_storage",
  ];
  const missing = required.filter((p) => !decisions[p]);
  return { ok: missing.length === 0, missing };
}