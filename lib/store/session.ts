import { create } from "zustand";
import type { SupportedLanguage, SessionId, PatientId } from "@/lib/types";

interface TranscriptEntry {
  role: "patient" | "system";
  text: string;
  lang: SupportedLanguage;
  timestamp: string;
}

type InterviewStage = "chief_complaint" | "hpi" | "past_history" | "drug_allergy" | "family_history" | "personal_history" | "ros" | "ayush_extended" | "complete";

interface SessionState {
  sessionId: SessionId | null;
  patientId: PatientId | null;
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

interface SessionActions {
  startSession: (sessionId: SessionId, patientId: PatientId, language: SupportedLanguage) => void;
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
}

const initialState: SessionState = {
  sessionId: null,
  patientId: null,
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

export const useSessionStore = create<SessionState & SessionActions>()((set) => ({
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
}));
