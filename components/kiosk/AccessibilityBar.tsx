"use client";

/**
 * Persistent control bar pinned to the bottom of every kiosk screen.
 *
 * Renders:
 * - Text-size toggle (comfortable / large / extra-large)
 * - High-contrast toggle
 * - Audio narration on/off
 *
 * The bar is always visible, never hover-dependent, and every control
 * carries both an icon and a text label per the design constraints.
 */
import { Volume2, VolumeX, Contrast, Type, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKioskUi, type TextScale } from "@/lib/store/kiosk-ui";
import { t } from "@/lib/i18n/dict";

const SCALE_ORDER: TextScale[] = ["comfortable", "large", "xlarge"];

export function AccessibilityBar(): React.ReactElement {
  const language = useKioskUi((s) => s.language);
  const textScale = useKioskUi((s) => s.textScale);
  const highContrast = useKioskUi((s) => s.highContrast);
  const audioEnabled = useKioskUi((s) => s.audioEnabled);
  const setTextScale = useKioskUi((s) => s.setTextScale);
  const toggleHighContrast = useKioskUi((s) => s.toggleHighContrast);
  const toggleAudio = useKioskUi((s) => s.toggleAudio);

  const nextScale: TextScale =
    SCALE_ORDER[(SCALE_ORDER.indexOf(textScale) + 1) % SCALE_ORDER.length] ?? "large";

  return (
    <div
      role="region"
      aria-label={t(language, "a11y.textSize")}
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 sm:gap-6">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-14 gap-3 rounded-2xl border-border bg-background px-5 text-base font-semibold"
          onClick={() => setTextScale(nextScale)}
          aria-label={`${t(language, "a11y.textSize")}: ${t(language, `a11y.textSize.${textScale}`)}`}
        >
          <Maximize2 className="size-5" aria-hidden="true" />
          <Type className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">
            {t(language, `a11y.textSize.${nextScale}`)}
          </span>
        </Button>

        <Button
          type="button"
          variant={highContrast ? "default" : "outline"}
          size="lg"
          className="min-h-14 gap-3 rounded-2xl px-5 text-base font-semibold"
          onClick={toggleHighContrast}
          aria-pressed={highContrast}
          aria-label={t(language, "a11y.highContrast")}
        >
          <Contrast className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">
            {t(language, "a11y.highContrast")}
          </span>
        </Button>

        <Button
          type="button"
          variant={audioEnabled ? "default" : "outline"}
          size="lg"
          className="min-h-14 gap-3 rounded-2xl px-5 text-base font-semibold"
          onClick={toggleAudio}
          aria-pressed={audioEnabled}
          aria-label={
            audioEnabled ? t(language, "a11y.audio.on") : t(language, "a11y.audio.off")
          }
        >
          {audioEnabled ? (
            <Volume2 className="size-5" aria-hidden="true" />
          ) : (
            <VolumeX className="size-5" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {audioEnabled ? t(language, "a11y.audio.on") : t(language, "a11y.audio.off")}
          </span>
        </Button>
      </div>
    </div>
  );
}