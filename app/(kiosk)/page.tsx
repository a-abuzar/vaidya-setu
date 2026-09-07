"use client";

/**
 * Welcome / language-select screen.
 *
 * Design constraints:
 *   - One primary decision (language) with three large tappable cards.
 *   - Each card: native script at top, subtitle, volume cue on selection.
 *   - Tapping speaks a greeting via browser TTS.
 *   - Compliance trust badges below the cards.
 *   - No back/home yet — this is the first screen.
 *   - The top bar (KioskTopBar) is NOT rendered here; the Welcome screen
 *     has its own header so it doesn't expose a "Back" button before any
 *     navigation has occurred. A11y controls are present via the inline
 *     mini-bar on this screen only.
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  Lock,
  Sparkles,
  Languages,
  Volume2,
  Type,
  Contrast,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKioskUi, type TextScale } from "@/lib/store/kiosk-ui";
import { useSpeech } from "@/components/kiosk/useSpeech";
import { t } from "@/lib/i18n/dict";
import type { SupportedLanguage } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANGUAGE_OPTIONS: Array<{
  id: SupportedLanguage;
  previewKey: "welcome.preview.hi" | "welcome.preview.en" | "welcome.preview.ta";
  subKey: "welcome.preview.sub.hi" | "welcome.preview.sub.en" | "welcome.preview.sub.ta";
  greetingKey: "welcome.greeting.hi" | "welcome.greeting.en" | "welcome.greeting.ta";
}> = [
  {
    id: "hi",
    previewKey: "welcome.preview.hi",
    subKey: "welcome.preview.sub.hi",
    greetingKey: "welcome.greeting.hi",
  },
  {
    id: "en",
    previewKey: "welcome.preview.en",
    subKey: "welcome.preview.sub.en",
    greetingKey: "welcome.greeting.en",
  },
  {
    id: "ta",
    previewKey: "welcome.preview.ta",
    subKey: "welcome.preview.sub.ta",
    greetingKey: "welcome.greeting.ta",
  },
];

const SCALE_ORDER: TextScale[] = ["comfortable", "large", "xlarge"];
const SCALE_LABEL: Record<TextScale, string> = {
  comfortable: "A",
  large: "A+",
  xlarge: "A++",
};

export default function WelcomePage(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const setLanguage = useKioskUi((s) => s.setLanguage);
  const textScale = useKioskUi((s) => s.textScale);
  const highContrast = useKioskUi((s) => s.highContrast);
  const audioEnabled = useKioskUi((s) => s.audioEnabled);
  const setTextScale = useKioskUi((s) => s.setTextScale);
  const toggleHighContrast = useKioskUi((s) => s.toggleHighContrast);
  const toggleAudio = useKioskUi((s) => s.toggleAudio);
  const { speak } = useSpeech();

  const currentScaleIdx = SCALE_ORDER.indexOf(textScale);
  const nextScale: TextScale = SCALE_ORDER[(currentScaleIdx + 1) % SCALE_ORDER.length] ?? "large";

  useEffect(() => {
    speak(t(language, "welcome.greeting." + language));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickLanguage = (id: SupportedLanguage): void => {
    setLanguage(id);
    speak(t(id, "welcome.greeting." + id));
  };

  const onStart = (): void => {
    router.push("/consent");
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
            >
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(language, "app.ministry")}
              </p>
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {t(language, "app.title")}
              </h1>
            </div>
          </div>

          {/* A11y mini-bar (welcome screen only — no KioskTopBar here) */}
          <div
            className="flex items-center gap-1 rounded-2xl border border-border bg-muted/40 px-2 py-1"
            role="group"
            aria-label={t(language, "a11y.textSize")}
          >
            <button
              type="button"
              onClick={() => setTextScale(nextScale)}
              className="flex min-h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-bold text-foreground hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t(language, "a11y.textSize")}
              title={`Text: ${SCALE_LABEL[textScale]}`}
            >
              <Type className="size-4 mr-0.5" aria-hidden="true" />
              <span className="font-extrabold text-xs">{SCALE_LABEL[textScale]}</span>
            </button>
            <button
              type="button"
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              className={cn(
                "flex min-h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                highContrast ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-primary/10"
              )}
              aria-label={t(language, "a11y.highContrast")}
            >
              <Contrast className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={toggleAudio}
              aria-pressed={audioEnabled}
              className={cn(
                "flex min-h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                audioEnabled ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-primary/10"
              )}
              aria-label={audioEnabled ? t(language, "a11y.audio.on") : t(language, "a11y.audio.off")}
            >
              {audioEnabled ? (
                <Volume2 className="size-4" aria-hidden="true" />
              ) : (
                <VolumeX className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {/* Language prompt */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-xlight)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--primary-mid)]">
            <Languages className="size-3" aria-hidden="true" />
            {t(language, "welcome.chooseLanguage")}
          </span>
          <h2 className="max-w-2xl text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            {t(language, "welcome.heading")}
          </h2>
          <p className="max-w-xl text-base text-muted-foreground">
            {t(language, "welcome.subheading")}
          </p>
        </div>

        {/* Language cards */}
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          role="radiogroup"
          aria-label={t(language, "welcome.chooseLanguage")}
        >
          {LANGUAGE_OPTIONS.map((opt) => {
            const selected = language === opt.id;
            return (
              <button
                key={opt.id}
                role="radio"
                aria-checked={selected}
                type="button"
                onClick={() => onPickLanguage(opt.id)}
                className={cn(
                  "group flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border-2 p-5 text-center shadow-sm transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-mid)]/60 focus-visible:ring-offset-2",
                  selected
                    ? "border-[var(--primary-mid)] bg-[var(--primary-xlight)] shadow-md ring-2 ring-[var(--primary-light)]"
                    : "border-border bg-card hover:border-[var(--primary-light)] hover:shadow-md"
                )}
              >
                <span className="text-3xl font-extrabold leading-none text-foreground sm:text-4xl">
                  {t(language, opt.previewKey)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {t(language, opt.subKey)}
                </span>
                {selected ? (
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--primary-mid)] px-3 py-1 text-xs font-bold text-white">
                    <Volume2 className="size-3" aria-hidden="true" />
                    {t(language, "welcome.greeting." + opt.id)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Start button */}
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            size="lg"
            className="min-h-14 min-w-52 rounded-2xl bg-primary px-10 text-lg font-bold text-primary-foreground shadow-md hover:bg-[var(--primary-mid)]"
            onClick={onStart}
          >
            {t(language, "welcome.start")}
          </Button>
        </div>

        {/* Compliance badges */}
        <section aria-label="Compliance" className="pb-6">
          <ul className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <li className="flex items-center gap-1.5 rounded-xl border border-border bg-[var(--primary-xlight)] px-3 py-2 font-semibold text-foreground">
              <Building2 className="size-4 shrink-0 text-[var(--primary-mid)]" aria-hidden="true" />
              {t(language, "welcome.compliance.ministry")}
            </li>
            <li className="flex items-center gap-1.5 rounded-xl border border-border bg-[var(--primary-xlight)] px-3 py-2 font-semibold text-foreground">
              <ShieldCheck className="size-4 shrink-0 text-[var(--primary-mid)]" aria-hidden="true" />
              {t(language, "welcome.compliance.abdm")}
            </li>
            <li className="flex items-center gap-1.5 rounded-xl border border-border bg-[var(--primary-xlight)] px-3 py-2 font-semibold text-foreground">
              <Lock className="size-4 shrink-0 text-[var(--primary-mid)]" aria-hidden="true" />
              {t(language, "welcome.compliance.dpdp")}
            </li>
            <li className="flex items-center gap-1.5 rounded-xl border border-border bg-[var(--primary-xlight)] px-3 py-2 font-semibold text-foreground">
              <Sparkles className="size-4 shrink-0 text-[var(--primary-mid)]" aria-hidden="true" />
              {t(language, "welcome.compliance.iiit")}
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}