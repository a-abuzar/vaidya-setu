"use client";

/**
 * DPDP Act 2023-compliant consent screen.
 *
 * Each ConsentPurpose is presented as a card with:
 *   - Plain-language title and one-sentence explanation
 *   - An explicit audio playback button (reads the description aloud)
 *   - A large switch (64px+) to grant or refuse
 *
 * The patient can change any toggle any number of times before
 * continuing. `clinical_data_collection` is the only required
 * toggle to proceed — ABDM linking is genuinely optional.
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Volume2, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { useSpeech } from "@/components/kiosk/useSpeech";
import { useKioskUi } from "@/lib/store/kiosk-ui";
import {
  useConsentStore,
  ALL_CONSENT_PURPOSES,
  isConsentValidForVisit,
  type ConsentPurpose,
} from "@/lib/store/consent";
import { t } from "@/lib/i18n/dict";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CONSENT_PURPOSE_KEY: Record<
  ConsentPurpose,
  { titleKey: string; descKey: string; required: boolean }
> = {
  clinical_data_collection: {
    titleKey: "consent.purpose.clinical",
    descKey: "consent.purpose.clinical.desc",
    required: true,
  },
  abdm_health_record_linking: {
    titleKey: "consent.purpose.abdm",
    descKey: "consent.purpose.abdm.desc",
    required: false,
  },
  data_sharing_with_physician: {
    titleKey: "consent.purpose.physician",
    descKey: "consent.purpose.physician.desc",
    required: true,
  },
  temporary_storage: {
    titleKey: "consent.purpose.storage",
    descKey: "consent.purpose.storage.desc",
    required: true,
  },
};

export default function ConsentPage(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const decisions = useConsentStore((s) => s.decisions);
  const setDecision = useConsentStore((s) => s.setDecision);
  const consentLanguage = useConsentStore((s) => s.consentLanguage);
  const consentedAt = useConsentStore((s) => s.consentedAt);
  const { speak } = useSpeech();

  useEffect(() => {
    if (consentLanguage === null) {
      useConsentStore.setState({ consentLanguage: language });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (purpose: ConsentPurpose, next: boolean): void => {
    setDecision(purpose, next);
  };

  const handlePlay = (purpose: ConsentPurpose): void => {
    const title = t(language, CONSENT_PURPOSE_KEY[purpose].titleKey);
    const desc = t(language, CONSENT_PURPOSE_KEY[purpose].descKey);
    speak(`${title}. ${desc}`);
  };

  const handleContinue = (): void => {
    const validation = isConsentValidForVisit(decisions);
    if (!validation.ok) {
      toast.error(t(language, "consent.requiredError"));
      return;
    }
    useConsentStore.setState({
      consentLanguage: language,
      consentedAt: new Date().toISOString(),
    });
    router.push("/identify");
  };

  return (
    <KioskShell step="consent">
      <header className="flex flex-col gap-3 text-center sm:text-left">
        <div className="flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-secondary-foreground sm:justify-start sm:self-start">
          <Lock className="size-4" aria-hidden="true" />
          {t(language, "step.consent")}
        </div>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {t(language, "consent.heading")}
        </h1>
        <p className="text-lg text-muted-foreground sm:text-xl">
          {t(language, "consent.subheading")}
        </p>
      </header>

      <Separator />

      <ul className="flex flex-col gap-4">
        {ALL_CONSENT_PURPOSES.map((purpose) => {
          const meta = CONSENT_PURPOSE_KEY[purpose];
          const granted = decisions[purpose];
          return (
            <li
              key={purpose}
              className={cn(
                "flex flex-col gap-4 rounded-3xl border-2 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:gap-6",
                granted
                  ? "border-primary/40 ring-2 ring-primary/20"
                  : "border-border",
              )}
            >
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold leading-tight sm:text-2xl">
                    {t(language, meta.titleKey)}
                  </h2>
                  {meta.required ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning px-3 py-1 text-xs font-bold uppercase tracking-wider text-warning-foreground">
                      <AlertCircle className="size-3" aria-hidden="true" />
                      {t(language, "consent.required")}
                    </span>
                  ) : null}
                </div>
                <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {t(language, meta.descKey)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 min-h-12 w-fit gap-2 rounded-2xl px-4 text-base font-semibold"
                  onClick={() => handlePlay(purpose)}
                >
                  <Volume2 className="size-4" aria-hidden="true" />
                  {t(language, "consent.playAudio")}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <span
                  className={cn(
                    "text-base font-bold",
                    granted ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {granted
                    ? t(language, "consent.toggle")
                    : t(language, "nav.skip")}
                </span>
                <Switch
                  checked={granted}
                  onCheckedChange={(next: boolean) =>
                    handleToggle(purpose, next)
                  }
                  aria-label={t(language, meta.titleKey)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <Separator />

      <footer className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        {consentedAt ? (
          <p className="text-sm text-muted-foreground">
            {new Date(consentedAt).toLocaleString()}
          </p>
        ) : null}
        <Button
          type="button"
          size="lg"
          className="min-h-16 rounded-2xl px-10 text-xl font-bold shadow-lg"
          onClick={handleContinue}
        >
          {t(language, "consent.review")}
        </Button>
      </footer>
    </KioskShell>
  );
}