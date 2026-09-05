/**
 * Accessibility & kiosk-mode store.
 *
 * Holds the user-controlled settings that must persist across every
 * patient-facing screen: text size, high-contrast, audio narration,
 * and the active language. The store is *client-side only* — the
 * settings never leave the browser (per DPDP Act 2023 minimal-data
 * principle).
 */
import { create } from "zustand";
import type { SupportedLanguage } from "@/lib/types";

export type TextScale = "comfortable" | "large" | "xlarge";

interface KioskUiState {
  language: SupportedLanguage;
  textScale: TextScale;
  highContrast: boolean;
  audioEnabled: boolean;
}

interface KioskUiActions {
  setLanguage: (lang: SupportedLanguage) => void;
  setTextScale: (scale: TextScale) => void;
  toggleHighContrast: () => void;
  toggleAudio: () => void;
  hydrateFromStorage: () => void;
}

const STORAGE_KEY = "vaidyasetu-kiosk-ui";

function readPersisted(): Partial<KioskUiState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      language:
        parsed.language === "en" || parsed.language === "hi" || parsed.language === "ta"
          ? (parsed.language as SupportedLanguage)
          : undefined,
      textScale:
        parsed.textScale === "comfortable" ||
        parsed.textScale === "large" ||
        parsed.textScale === "xlarge"
          ? (parsed.textScale as TextScale)
          : undefined,
      highContrast: typeof parsed.highContrast === "boolean" ? parsed.highContrast : undefined,
      audioEnabled: typeof parsed.audioEnabled === "boolean" ? parsed.audioEnabled : undefined,
    };
  } catch (error: unknown) {
    console.warn("[kiosk-ui] Failed to read persisted preferences", error);
    return {};
  }
}

function writePersisted(state: KioskUiState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        language: state.language,
        textScale: state.textScale,
        highContrast: state.highContrast,
        audioEnabled: state.audioEnabled,
      }),
    );
  } catch (error: unknown) {
    console.warn("[kiosk-ui] Failed to persist preferences", error);
  }
}

const initialState: KioskUiState = {
  language: "hi",
  textScale: "large",
  highContrast: false,
  audioEnabled: true,
};

export const useKioskUi = create<KioskUiState & KioskUiActions>()((set, getState) => ({
  ...initialState,

  setLanguage: (language) => {
    set({ language });
    writePersisted({ ...getState(), language });
  },
  setTextScale: (textScale) => {
    set({ textScale });
    writePersisted({ ...getState(), textScale });
  },
  toggleHighContrast: () => {
    const highContrast = !getState().highContrast;
    set({ highContrast });
    writePersisted({ ...getState(), highContrast });
  },
  toggleAudio: () => {
    const audioEnabled = !getState().audioEnabled;
    set({ audioEnabled });
    writePersisted({ ...getState(), audioEnabled });
  },
  hydrateFromStorage: () => {
    const persisted = readPersisted();
    if (Object.keys(persisted).length === 0) return;
    set((s) => ({ ...s, ...persisted }));
  },
}));

/**
 * Returns a stable, reactive selector to read a single slice of state.
 * Use this pattern in components to avoid full-store re-renders.
 */
export const selectLanguage = (s: KioskUiState): SupportedLanguage => s.language;
export const selectTextScale = (s: KioskUiState): TextScale => s.textScale;
export const selectHighContrast = (s: KioskUiState): boolean => s.highContrast;
export const selectAudioEnabled = (s: KioskUiState): boolean => s.audioEnabled;