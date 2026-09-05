"use client";

/**
 * Mounted in the root layout. Applies the persisted accessibility
 * settings from {@link useKioskUi} to <html> and to the global
 * language tag, so every screen inherits the patient's preferences
 * without each one re-reading storage.
 */
import { useEffect } from "react";
import { useKioskUi } from "@/lib/store/kiosk-ui";

export function KioskChromeBoot(): null {
  const textScale = useKioskUi((s) => s.textScale);
  const highContrast = useKioskUi((s) => s.highContrast);
  const language = useKioskUi((s) => s.language);
  const hydrate = useKioskUi((s) => s.hydrateFromStorage);

  // Hydrate once on mount so SSR-rendered markup matches the client.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.kioskScale = textScale;
    html.dataset.highContrast = highContrast ? "true" : "false";
    html.lang = language;
  }, [textScale, highContrast, language]);

  return null;
}