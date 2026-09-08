"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { VirtualNumpad } from "@/components/kiosk/VirtualNumpad";
import { useSessionStore } from "@/lib/store/session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/dict";
import { useKioskUi } from "@/lib/store/kiosk-ui";

export default function BasicInfoPage(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const setPatientInfo = useSessionStore((s) => s.setPatientInfo);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const ageInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!age || !gender) {
      toast.error(t(language, "error.generic"));
      return;
    }
    setPatientInfo({ age, gender });
    router.push("/encounter");
  };

  const onNumpadKey = useCallback((key: string): void => {
    if (key === "Backspace") {
      setAge((prev) => prev.slice(0, -1));
    } else {
      setAge((prev) => (prev.length < 3 ? prev + key : prev));
    }
  }, []);

  const genderOptions = [
    { value: "male", labelKey: "basic.gender.male" },
    { value: "female", labelKey: "basic.gender.female" },
    { value: "other", labelKey: "basic.gender.other" },
  ] as const;

  return (
    <KioskShell step="identify">
      <header className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          {t(language, "basic.heading")}
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          {t(language, "basic.subheading")}
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8"
      >
        {/* Age field + numpad */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1">
            <Field className="gap-3">
              <FieldLabel
                htmlFor="patient-age"
                className="text-lg font-bold"
              >
                {t(language, "basic.age")}
              </FieldLabel>
              <input
                ref={ageInputRef}
                id="patient-age"
                type="text"
                inputMode="none"
                readOnly
                tabIndex={-1}
                autoComplete="off"
                placeholder={t(language, "basic.agePlaceholder")}
                className="w-full min-h-14 rounded-xl border-2 border-input bg-background px-4 text-2xl font-bold tracking-wider cursor-default select-none focus:border-[var(--primary-mid)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                value={age}
                aria-label={t(language, "basic.age")}
              />
            </Field>
          </div>
          <div className="flex justify-center lg:justify-start lg:pt-10 shrink-0">
            <VirtualNumpad onKeyPress={onNumpadKey} />
          </div>
        </div>

        {/* Gender field */}
        <Field className="gap-3">
          <FieldLabel className="text-lg font-bold">
            {t(language, "basic.gender")}
          </FieldLabel>
          <RadioGroup
            value={gender}
            onValueChange={(v: unknown) => setGender(String(v))}
            className="flex flex-col gap-3 sm:flex-row"
          >
            {genderOptions.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex flex-1 min-h-14 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 bg-background p-4 text-lg font-bold transition-all",
                  "hover:bg-[var(--primary-xlight)] focus-within:ring-2 focus-within:ring-[var(--primary-mid)]/50",
                  gender === opt.value
                    ? "border-[var(--primary-mid)] bg-[var(--primary-xlight)] ring-2 ring-[var(--primary-light)]"
                    : "border-border",
                )}
              >
                <RadioGroupItem value={opt.value} className="hidden" />
                <span>{t(language, opt.labelKey)}</span>
              </label>
            ))}
          </RadioGroup>
        </Field>

        {/* Actions */}
        <div className="flex flex-col items-stretch gap-3 border-t pt-6 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12 rounded-2xl px-8 text-base"
            onClick={() => router.push("/identify")}
          >
            {t(language, "nav.back")}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="min-h-14 rounded-2xl bg-primary px-12 text-lg font-bold text-primary-foreground shadow-md hover:bg-[var(--primary-mid)]"
          >
            {t(language, "nav.continue")}
          </Button>
        </div>
      </form>
    </KioskShell>
  );
}
