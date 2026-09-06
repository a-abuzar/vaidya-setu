"use client";

/**
 * Identify / ABHA screen.
 *
 * Per ABDM design guidelines, linking ABHA is **optional**. We
 * therefore present two equally-prominent paths:
 *
 *   1. "Link my ABHA number" — full-bleed card on the left
 *   2. "Continue without ABHA" — equally large card on the right
 *
 * Linking opens a second panel with the ABHA number input, a
 * verification-method radio group, and a confirm step. The
 * `verifyAbha` AI-layer function is currently a `NOT_IMPLEMENTED`
 * stub (per docs/MODULE_CONTRACT.md) — we surface that constraint
 * in plain language ("we're waiting on the ABDM gateway") and
 * gracefully fall back to the anonymous path so the patient is
 * never blocked.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IdCard,
  UserRound,
  KeyRound,
  Phone,
  IdCard as IdCardLucide,
  ShieldOff,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { useKioskUi } from "@/lib/store/kiosk-ui";
import { t } from "@/lib/i18n/dict";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type VerifyMethod = "aadhaar_otp" | "mobile_otp" | "demographics";

export default function IdentifyPage(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const [mode, setMode] = useState<"choose" | "linking">("choose");
  const [abha, setAbha] = useState("");
  const [method, setMethod] = useState<VerifyMethod>("aadhaar_otp");
  const [submitting, setSubmitting] = useState(false);

  const onChooseLink = (): void => setMode("linking");

  const onChooseAnon = (): void => {
    toast.success(t(language, "identify.skipSuccess"));
    router.push("/encounter");
  };

  const onSubmitLink = async (): Promise<void> => {
    setSubmitting(true);
    try {
      // Per docs/MODULE_CONTRACT.md, verifyAbha() is a NOT_IMPLEMENTED
      // stub until the live ABDM gateway is reachable. We surface that
      // honestly to the patient and continue without linking so they
      // are never blocked.
      toast.warning(t(language, "identify.notImplemented"), {
        duration: 4000,
      });
      router.push("/encounter");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KioskShell step="identify">
      <header className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          {t(language, "identify.heading")}
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          {t(language, "identify.subheading")}
        </p>
      </header>

      {mode === "choose" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PathCard
            icon={<IdCard className="size-6" aria-hidden="true" />}
            title={t(language, "identify.linkAbha")}
            body={t(language, "identify.linkAbha.desc")}
            onSelect={onChooseLink}
            variant="primary"
          />
          <PathCard
            icon={<ShieldOff className="size-6" aria-hidden="true" />}
            title={t(language, "identify.continueAnon")}
            body={t(language, "identify.continueAnon.desc")}
            onSelect={onChooseAnon}
            variant="secondary"
          />
        </div>
      ) : (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 rounded-xl px-3"
              onClick={() => setMode("choose")}
            >
              ←
            </Button>
            <h2 className="text-xl font-bold">
              {t(language, "identify.linkAbha")}
            </h2>
          </div>
          <Separator />
          <Field className="gap-2">
            <FieldLabel htmlFor="abha-number" className="text-base font-bold">
              {t(language, "identify.abhaLabel")}
            </FieldLabel>
            <FieldDescription className="text-sm">
              {t(language, "identify.abhaHelp")}
            </FieldDescription>
            <input
              id="abha-number"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t(language, "identify.abhaPlaceholder")}
              className="min-h-12 rounded-xl border-2 border-input bg-background text-base font-semibold tracking-wider focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              value={abha}
              onChange={(e) =>
                setAbha(e.target.value.replace(/[^0-9-]/g, "").slice(0, 17))
              }
              aria-describedby="abha-help"
            />
          </Field>
          <Separator />
          <Field className="gap-2">
            <FieldLabel className="text-base font-bold">
              {t(language, "identify.method")}
            </FieldLabel>
            <RadioGroup
              value={method}
              onValueChange={(v) => {
                if (v === "aadhaar_otp" || v === "mobile_otp" || v === "demographics") {
                  setMethod(v);
                }
              }}
              className="gap-2"
            >
              <VerifyOption
                value="aadhaar_otp"
                icon={<IdCardLucide className="size-4" aria-hidden="true" />}
                label={t(language, "verify.aadhaar_otp")}
              />
              <VerifyOption
                value="mobile_otp"
                icon={<Phone className="size-4" aria-hidden="true" />}
                label={t(language, "verify.mobile_otp")}
              />
              <VerifyOption
                value="demographics"
                icon={<UserRound className="size-4" aria-hidden="true" />}
                label={t(language, "verify.demographics")}
              />
            </RadioGroup>
          </Field>
          <Separator />
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-10 rounded-xl px-4 text-sm"
              onClick={onChooseAnon}
            >
              {t(language, "identify.continueAnon")}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={submitting}
              className="min-h-12 rounded-xl px-6 text-base font-bold shadow-sm"
              onClick={onSubmitLink}
            >
              <KeyRound className="mr-2 size-4" aria-hidden="true" />
              {t(language, "identify.submit")}
            </Button>
          </div>
        </section>
      )}
    </KioskShell>
  );
}

function PathCard({
  icon,
  title,
  body,
  onSelect,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onSelect: () => void;
  variant: "primary" | "secondary";
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-48 flex-col gap-3 rounded-2xl border-2 p-6 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        variant === "primary"
          ? "border-primary bg-primary/5 hover:border-primary/60"
          : "border-border bg-card hover:border-primary/40",
      )}
    >
      <span
        className={cn(
          "inline-flex size-12 items-center justify-center rounded-xl",
          variant === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="text-xl font-bold leading-tight">{title}</h2>
      <p className="text-base leading-relaxed text-muted-foreground">{body}</p>
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-primary">
        {title}
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </button>
  );
}

function VerifyOption({
  value,
  icon,
  label,
}: {
  value: VerifyMethod;
  icon: React.ReactNode;
  label: string;
}): React.ReactElement {
  return (
    <label
      className={cn(
        "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 text-base font-medium transition-colors hover:bg-muted",
        "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/30",
      )}
    >
      <RadioGroupItem value={value} />
      <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
        {icon}
      </span>
      <span>{label}</span>
    </label>
  );
}