"use client";

/**
 * Persistent top bar for every patient-facing kiosk screen.
 *
 * Layout — left cluster: [Back] [Home]
 *         right cluster: [A+] [◑] [🔊] · [EN|HI|TA] · [Help]
 *
 * Accessibility controls (text scale, contrast, audio) have moved
 * from the former fixed-bottom AccessibilityBar into this top bar,
 * per the UX spec: "Bottom of screen reserved for primary nav/actions."
 *
 * Each control carries an icon + visible text label, has a 56px
 * minimum touch target, and exposes a translated aria-label.
 *
 * Note: the "Call staff" confirmation uses a plain <dialog> element to
 * avoid the base-ui production-build form-control validation issue #26.
 */
import { ArrowLeft, Home, HelpCircle, Type, Contrast, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useKioskUi, type TextScale } from "@/lib/store/kiosk-ui";
import { t } from "@/lib/i18n/dict";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SCALE_ORDER: TextScale[] = ["comfortable", "large", "xlarge"];

// Scale cycle label shown on the button (shows what NEXT tap will do)
const SCALE_LABEL: Record<TextScale, string> = {
  comfortable: "A",
  large: "A+",
  xlarge: "A++",
};

export function KioskTopBar(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const setLanguage = useKioskUi((s) => s.setLanguage);
  const textScale = useKioskUi((s) => s.textScale);
  const highContrast = useKioskUi((s) => s.highContrast);
  const audioEnabled = useKioskUi((s) => s.audioEnabled);
  const setTextScale = useKioskUi((s) => s.setTextScale);
  const toggleHighContrast = useKioskUi((s) => s.toggleHighContrast);
  const toggleAudio = useKioskUi((s) => s.toggleAudio);
  const [helpOpen, setHelpOpen] = useState(false);

  const currentScaleIdx = SCALE_ORDER.indexOf(textScale);
  const nextScale: TextScale = SCALE_ORDER[(currentScaleIdx + 1) % SCALE_ORDER.length] ?? "large";

  const handleBack = (): void => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleHelp = (): void => {
    setHelpOpen(true);
    toast.success(t(language, "help.called"), {
      description: t(language, "help.body"),
    });
  };

  return (
    <>
      <div
        className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur"
        role="banner"
      >
        {/* Left — navigation */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-14 gap-2 rounded-2xl px-4 text-base font-semibold"
            onClick={handleBack}
            aria-label={t(language, "nav.back")}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">{t(language, "nav.back")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-14 gap-2 rounded-2xl px-4 text-base font-semibold"
            onClick={() => router.push("/")}
            aria-label={t(language, "nav.home")}
          >
            <Home className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">{t(language, "nav.home")}</span>
          </Button>
        </div>

        {/* Right — a11y controls + language + help */}
        <div className="flex items-center gap-1.5">
          {/* Accessibility controls */}
          <div
            className="flex items-center gap-1 rounded-2xl border border-border bg-muted/40 px-2 py-1"
            role="group"
            aria-label={t(language, "a11y.textSize")}
          >
            {/* Text scale */}
            <button
              type="button"
              onClick={() => setTextScale(nextScale)}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-xl px-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "hover:bg-primary/10 text-foreground"
              )}
              aria-label={`${t(language, "a11y.textSize")}: ${SCALE_LABEL[nextScale]}`}
              title={`${t(language, "a11y.textSize")}: ${t(language, `a11y.textSize.${textScale}`)}`}
            >
              <Type className="size-4 mr-1" aria-hidden="true" />
              <span className="font-extrabold">{SCALE_LABEL[textScale]}</span>
            </button>

            {/* High contrast */}
            <button
              type="button"
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-xl px-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                highContrast
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-primary/10 text-foreground"
              )}
              aria-label={t(language, "a11y.highContrast")}
              title={t(language, "a11y.highContrast")}
            >
              <Contrast className="size-4" aria-hidden="true" />
            </button>

            {/* Audio */}
            <button
              type="button"
              onClick={toggleAudio}
              aria-pressed={audioEnabled}
              className={cn(
                "flex min-h-11 min-w-11 items-center justify-center rounded-xl px-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                audioEnabled
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-primary/10 text-foreground"
              )}
              aria-label={audioEnabled ? t(language, "a11y.audio.on") : t(language, "a11y.audio.off")}
              title={audioEnabled ? t(language, "a11y.audio.on") : t(language, "a11y.audio.off")}
            >
              {audioEnabled ? (
                <Volume2 className="size-4" aria-hidden="true" />
              ) : (
                <VolumeX className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />

          {/* Language switcher */}
          <div
            className="flex overflow-hidden rounded-2xl border border-border shadow-sm"
            role="group"
            aria-label="Language"
          >
            {(["en", "hi", "ta"] as const).map((lang, i) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                aria-pressed={language === lang}
                className={cn(
                  "min-h-11 px-3.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  i > 0 && "border-l border-border",
                  language === lang
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-muted"
                )}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />

          {/* Help */}
          <Button
            type="button"
            variant="default"
            size="lg"
            className="min-h-14 gap-2 rounded-2xl bg-destructive px-4 text-base font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90"
            onClick={handleHelp}
            aria-label={t(language, "nav.help")}
          >
            <HelpCircle className="size-5" aria-hidden="true" />
            <span>{t(language, "nav.help")}</span>
          </Button>
        </div>
      </div>

      {/* Help dialog */}
      {helpOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-card p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="help-dialog-title"
              className="text-2xl font-bold leading-tight"
            >
              {t(language, "help.heading")}
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              {t(language, "help.body")}
            </p>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary px-6 text-base font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
            >
              {t(language, "help.cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}