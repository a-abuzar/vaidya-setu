import { create } from "zustand";
import type { SupportedLanguage, SessionId, PatientId } from "@/lib/types";
import { get, set as setDb } from "idb-keyval";
import { rpcClient } from "@/lib/api-client";

// ──────────────────────────────────────────────────────────────────────
// Re-exported types used by UI components
// ──────────────────────────────────────────────────────────────────────

export interface TranscriptEntry {
  role: "patient" | "system";
  text: string;
  lang: SupportedLanguage;
  timestamp: string;
}

export type InterviewStage =
  | "chief_complaint"
  | "hpi"
  | "past_history"
  | "drug_allergy"
  | "family_history"
  | "personal_history"
  | "ros"
  | "ayush_extended"
  | "complete";

/** Steps in the patient kiosk flow. */
export type KioskStep =
  | "language_select"
  | "consent"
  | "identify"
  | "encounter"
  | "document_scan"
  | "summary_review"
  | "complete";

export const KIOSK_STEPS: readonly KioskStep[] = [
  "language_select",
  "consent",
  "identify",
  "encounter",
  "document_scan",
  "summary_review",
  "complete",
] as const;

/** DPDP Act 2023 consent purposes. */
export type ConsentPurpose =
  | "clinical_data_collection"
  | "abdm_health_record_linking"
  | "data_sharing_with_physician"
  | "temporary_storage";

export interface ConsentItem {
  purpose: ConsentPurpose;
  granted: boolean;
  grantedAt: string | null;
}

export interface TouchOption {
  id: string;
  label: string;
  localizedLabel: string;
}

// ──────────────────────────────────────────────────────────────────────
// Offline mutation types — discriminated union, no `any`
// ──────────────────────────────────────────────────────────────────────

interface PatchTranscriptMutation {
  type: "PATCH_TRANSCRIPT";
  sessionId: string;
  payload: { transcript: TranscriptEntry[] };
}

interface FinalizeMutation {
  type: "FINALIZE";
  sessionId: string;
  payload: Record<string, never>;
}

type OfflineMutationData = PatchTranscriptMutation | FinalizeMutation;

interface OfflineMutation extends OfflineMutationData {
  id: string;
  timestamp: number;
}

// ──────────────────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────────────────

interface SessionState {
  // Session identity
  sessionId: SessionId | null;
  patientId: PatientId | null;
  language: SupportedLanguage;

  // Kiosk flow
  currentStep: KioskStep;

  // Interview
  currentStage: InterviewStage;
  transcript: TranscriptEntry[];
  currentQuestion: string | null;
  touchOptions: TouchOption[] | null;
  captionText: string | null;
  isRecording: boolean;
  isProcessing: boolean;

  // Consent (DPDP Act 2023)
  consents: ConsentItem[];

  // Documents
  uploadProgress: number;
  uploadedDocumentIds: string[];

  // Red flag
  redFlagDetected: boolean;
  redFlagReason: string | null;

  // AYUSH
  ayushModeEnabled: boolean;

  // Accessibility
  textSizeMultiplier: number;
  audioEnabled: boolean;
  highContrastMode: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Actions
// ──────────────────────────────────────────────────────────────────────

interface SessionActions {
  // Session lifecycle
  startSession: (sessionId: SessionId, patientId: PatientId, language: SupportedLanguage) => void;
  resetSession: () => void;

  // Kiosk flow
  setStep: (step: KioskStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Interview
  setStage: (stage: InterviewStage) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setCurrentQuestion: (question: string | null) => void;
  setTouchOptions: (options: TouchOption[] | null) => void;
  setCaptionText: (text: string | null) => void;
  setRecording: (recording: boolean) => void;
  setProcessing: (processing: boolean) => void;

  // Consent
  setConsent: (purpose: ConsentPurpose, granted: boolean) => void;

  // Documents
  setUploadProgress: (progress: number) => void;
  addUploadedDocument: (documentId: string) => void;

  // Red flag
  setRedFlag: (detected: boolean, reason: string | null) => void;

  // AYUSH
  setAyushMode: (enabled: boolean) => void;

  // Accessibility
  setTextSize: (multiplier: number) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;

  // Offline sync
  queueOfflineMutation: (mutation: OfflineMutationData) => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
}

// ──────────────────────────────────────────────────────────────────────
// Initial state
// ──────────────────────────────────────────────────────────────────────

const initialConsents: ConsentItem[] = [
  { purpose: "clinical_data_collection", granted: false, grantedAt: null },
  { purpose: "abdm_health_record_linking", granted: false, grantedAt: null },
  { purpose: "data_sharing_with_physician", granted: false, grantedAt: null },
  { purpose: "temporary_storage", granted: false, grantedAt: null },
];

const initialState: SessionState = {
  sessionId: null,
  patientId: null,
  language: "hi",
  currentStep: "language_select",
  currentStage: "chief_complaint",
  transcript: [],
  currentQuestion: null,
  touchOptions: null,
  captionText: null,
  isRecording: false,
  isProcessing: false,
  consents: initialConsents,
  uploadProgress: 0,
  uploadedDocumentIds: [],
  redFlagDetected: false,
  redFlagReason: null,
  ayushModeEnabled: false,
  textSizeMultiplier: 1,
  audioEnabled: true,
  highContrastMode: false,
};

// ──────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState & SessionActions>()((set, _getStore) => ({
  ...initialState,

  // ── Session lifecycle ──────────────────────────────────────────────
  startSession: (sessionId, patientId, language) =>
    set({
      ...initialState,
      sessionId,
      patientId,
      language,
      currentStep: "consent",
      // Preserve accessibility preferences across sessions
      textSizeMultiplier: _getStore().textSizeMultiplier,
      audioEnabled: _getStore().audioEnabled,
      highContrastMode: _getStore().highContrastMode,
    }),

  resetSession: () =>
    set({
      ...initialState,
      // Preserve accessibility preferences
      textSizeMultiplier: _getStore().textSizeMultiplier,
      audioEnabled: _getStore().audioEnabled,
      highContrastMode: _getStore().highContrastMode,
    }),

  // ── Kiosk flow ─────────────────────────────────────────────────────
  setStep: (step) => set({ currentStep: step }),

  nextStep: () =>
    set((state) => {
      const idx = KIOSK_STEPS.indexOf(state.currentStep);
      if (idx < KIOSK_STEPS.length - 1) {
        return { currentStep: KIOSK_STEPS[idx + 1] };
      }
      return {};
    }),

  prevStep: () =>
    set((state) => {
      const idx = KIOSK_STEPS.indexOf(state.currentStep);
      if (idx > 0) {
        return { currentStep: KIOSK_STEPS[idx - 1] };
      }
      return {};
    }),

  // ── Interview ──────────────────────────────────────────────────────
  setStage: (stage) => set({ currentStage: stage }),
  addTranscriptEntry: (entry) => set((state) => ({ transcript: [...state.transcript, entry] })),
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setTouchOptions: (options) => set({ touchOptions: options }),
  setCaptionText: (text) => set({ captionText: text }),
  setRecording: (recording) => set({ isRecording: recording }),
  setProcessing: (processing) => set({ isProcessing: processing }),

  // ── Consent ────────────────────────────────────────────────────────
  setConsent: (purpose, granted) =>
    set((state) => ({
      consents: state.consents.map((c) =>
        c.purpose === purpose
          ? { ...c, granted, grantedAt: granted ? new Date().toISOString() : null }
          : c
      ),
    })),

  // ── Documents ──────────────────────────────────────────────────────
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  addUploadedDocument: (documentId) =>
    set((state) => ({ uploadedDocumentIds: [...state.uploadedDocumentIds, documentId] })),

  // ── Red flag ───────────────────────────────────────────────────────
  setRedFlag: (detected, reason) => set({ redFlagDetected: detected, redFlagReason: reason }),

  // ── AYUSH ──────────────────────────────────────────────────────────
  setAyushMode: (enabled) => set({ ayushModeEnabled: enabled }),

  // ── Accessibility ──────────────────────────────────────────────────
  setTextSize: (multiplier) => set({ textSizeMultiplier: multiplier }),
  setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
  setHighContrast: (enabled) => set({ highContrastMode: enabled }),

  // ── Offline sync ───────────────────────────────────────────────────
  queueOfflineMutation: async (mutation) => {
    const newMutation: OfflineMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    try {
      const queue = (await get<OfflineMutation[]>("vaidyasetu-sync-queue")) ?? [];
      queue.push(newMutation);
      await setDb("vaidyasetu-sync-queue", queue);
    } catch (e: unknown) {
      console.error("Failed to queue offline mutation:", e);
    }
  },

  syncOfflineQueue: async () => {
    try {
      const queue = (await get<OfflineMutation[]>("vaidyasetu-sync-queue")) ?? [];
      if (queue.length === 0) return;

      const deduped = queue.filter(
        (v, i, a) =>
          a.findIndex((t) => t.sessionId === v.sessionId && t.timestamp === v.timestamp) === i
      );

      const remaining: OfflineMutation[] = [];

      for (const m of deduped) {
        try {
          if (m.type === "PATCH_TRANSCRIPT") {
            const res = await rpcClient.api.sessions[":id"].$patch({
              param: { id: m.sessionId },
              json: m.payload,
            });
            if (!res.ok) throw new Error("Sync failed");
          } else if (m.type === "FINALIZE") {
            const res = await rpcClient.api.sessions[":id"].finalize.$post({
              param: { id: m.sessionId },
            });
            if (!res.ok) throw new Error("Sync failed");
          }
        } catch (syncErr: unknown) {
          console.error("Offline mutation sync failed, retaining in queue:", syncErr);
          remaining.push(m);
        }
      }
      await setDb("vaidyasetu-sync-queue", remaining);
    } catch (e: unknown) {
      console.error("Failed to sync offline queue:", e);
    }
  },
}));
