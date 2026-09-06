"use client";

/**
 * Welcome / language-select screen.
 *
 * Design constraints applied here:
 *   - One primary decision (language) with exactly three large,
 *     tappable language cards arranged horizontally.
 *   - Each card shows the native script at top, an English/Tanglish
 *     subtitle, and an icon cue.
 *   - Tapping a card speaks a short greeting in that language using
 *     browser TTS (audio narration is on by default per design).
 *   - Visible trust markers (AYUSH / ABDM / DPDP).
 *   - Help button is intentionally absent on this screen — there is
 *     no back/home yet, and we don't want help to be the first thing
 *     a confused elderly patient hits. We surface the help affordance
 *     from the next screen onwards.
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKioskUi } from "@/lib/store/kiosk-ui";
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

export default function WelcomePage(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const setLanguage = useKioskUi((s) => s.setLanguage);
  const { speak } = useSpeech();

  // Once on mount, speak a short welcome in whichever language is the
  // initial persisted preference. This anchors the patient that audio
  // narration is on.
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
    <main className="min-h-screen bg-background pb-20">
      <header className="border-b border-border bg-card/50 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6">
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
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {t(language, "app.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(language, "app.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
            <Languages className="size-3" aria-hidden="true" />
            {t(language, "welcome.chooseLanguage")}
          </span>
          <h2 className="max-w-3xl text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            {t(language, "welcome.heading")}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t(language, "welcome.subheading")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="radiogroup" aria-label={t(language, "welcome.chooseLanguage")}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const selected = language === opt.id;
            return (
              <button
                key={opt.id}
                role="radio"
                aria-checked={selected}
                type="button"
                onClick={() => onPickLanguage(opt.id)}
                onDoubleClick={() => speak(t(opt.id, "welcome.greeting." + opt.id))}
                className={cn(
                  "group flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border-2 bg-card p-4 text-center shadow-sm transition-all",
                  "hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                    : "border-border",
                )}
              >
                <span className="text-3xl font-bold leading-none text-foreground sm:text-4xl">
                  {t(language, opt.previewKey)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {t(language, opt.subKey)}
                </span>
                {selected ? (
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Volume2 className="size-3" aria-hidden="true" />
                    {t(language, "welcome.greeting." + opt.id)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center pt-2">
          <Button
            type="button"
            size="lg"
            className="h-12 min-w-48 rounded-xl px-8 text-base font-semibold shadow-sm"
            onClick={onStart}
          >
            {t(language, "welcome.start")}
          </Button>
        </div>
      </section>

      <section
        aria-label="Compliance"
        className="mx-auto max-w-6xl px-6 pb-12"
      >
        <ul className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <li className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-medium text-foreground">
            <Building2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t(language, "welcome.compliance.ministry")}
          </li>
          <li className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-medium text-foreground">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t(language, "welcome.compliance.abdm")}
          </li>
          <li className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-medium text-foreground">
            <Lock className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t(language, "welcome.compliance.dpdp")}
          </li>
          <li className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 font-medium text-foreground">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
            {t(language, "welcome.compliance.iiit")}
          </li>
        </ul>
      </section>
    </main>
  );
}