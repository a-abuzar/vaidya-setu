import { create } from "zustand";
import type { SupportedLanguage, SessionId, PatientId } from "@/lib/types";
import { get, set as setDb } from "idb-keyval";
import { rpcClient } from "@/lib/api-client";

export interface TranscriptEntry {
  role: "patient" | "system";
  text: string;
  lang: SupportedLanguage;
  timestamp: string;
}

type InterviewStage = "chief_complaint" | "hpi" | "past_history" | "drug_allergy" | "family_history" | "personal_history" | "ros" | "ayush_extended" | "complete";

interface SessionState {
  sessionId: SessionId | null;
  patientId: PatientId | null;
  patientInfo: { name: string; age: string; gender: string } | null;
  language: SupportedLanguage;
  currentStage: InterviewStage;
  transcript: TranscriptEntry[];
  currentQuestion: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  uploadProgress: number;
  uploadedDocumentIds: string[];
  redFlagDetected: boolean;
  redFlagReason: string | null;
  ayushModeEnabled: boolean;
}

interface OfflineMutation {
  id: string;
  sessionId: string;
  type: "PATCH_TRANSCRIPT" | "FINALIZE";
  payload: any;
  timestamp: number;
}

interface SessionActions {
  startSession: (sessionId: SessionId, patientId: PatientId | null, language: SupportedLanguage) => void;
  resetSession: () => void;
  setStage: (stage: InterviewStage) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setCurrentQuestion: (question: string | null) => void;
  setRecording: (recording: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setUploadProgress: (progress: number) => void;
  addUploadedDocument: (documentId: string) => void;
  setRedFlag: (detected: boolean, reason: string | null) => void;
  setAyushMode: (enabled: boolean) => void;
  setPatientInfo: (info: { name: string; age: string; gender: string } | null) => void;
  queueOfflineMutation: (mutation: Omit<OfflineMutation, "id" | "timestamp">) => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
}

const initialState: SessionState = {
  sessionId: null,
  patientId: null,
  patientInfo: null,
  language: "hi",
  currentStage: "chief_complaint",
  transcript: [],
  currentQuestion: null,
  isRecording: false,
  isProcessing: false,
  uploadProgress: 0,
  uploadedDocumentIds: [],
  redFlagDetected: false,
  redFlagReason: null,
  ayushModeEnabled: false,
};

export const useSessionStore = create<SessionState & SessionActions>()((set, getStore) => ({
  ...initialState,
  startSession: (sessionId, patientId, language) => set({ ...initialState, sessionId, patientId, language }),
  resetSession: () => set(initialState),
  setStage: (stage) => set({ currentStage: stage }),
  addTranscriptEntry: (entry) => set((state) => ({ transcript: [...state.transcript, entry] })),
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setRecording: (recording) => set({ isRecording: recording }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  addUploadedDocument: (documentId) => set((state) => ({ uploadedDocumentIds: [...state.uploadedDocumentIds, documentId] })),
  setRedFlag: (detected, reason) => set({ redFlagDetected: detected, redFlagReason: reason }),
  setAyushMode: (enabled) => set({ ayushModeEnabled: enabled }),
  setPatientInfo: (info) => set({ patientInfo: info }),
  queueOfflineMutation: async (mutation) => {
    const newMutation: OfflineMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    try {
      const queue = (await get<OfflineMutation[]>("vaidyasetu-sync-queue")) || [];
      queue.push(newMutation);
      await setDb("vaidyasetu-sync-queue", queue);
    } catch (e) {
      console.warn("Failed to queue offline mutation", e);
    }
  },
  syncOfflineQueue: async () => {
    try {
      const queue = (await get<OfflineMutation[]>("vaidyasetu-sync-queue")) || [];
      if (queue.length === 0) return;

      // Deduplicate by sessionId + timestamp
      const deduped = queue.filter((v, i, a) => a.findIndex(t => (t.sessionId === v.sessionId && t.timestamp === v.timestamp)) === i);
      
      const remaining: OfflineMutation[] = [];
      
      for (const m of deduped) {
        try {
          if (m.type === "PATCH_TRANSCRIPT") {
            const res = await rpcClient.api.sessions[":id"].$patch({
              param: { id: m.sessionId },
              json: m.payload
            });
            if (!res.ok) throw new Error("Sync failed");
          } else if (m.type === "FINALIZE") {
            const res = await rpcClient.api.sessions[":id"].finalize.$post({
              param: { id: m.sessionId }
            });
            if (!res.ok) throw new Error("Sync failed");
          }
        } catch (e) {
          // If network fails, keep it in the queue
          remaining.push(m);
        }
      }
      await setDb("vaidyasetu-sync-queue", remaining);
    } catch (e) {
      console.warn("Failed to sync offline queue", e);
    }
  }
}));
