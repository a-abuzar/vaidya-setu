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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || !gender) {
      toast.error("Please fill all fields");
      return;
    }
    // Set a placeholder for name since we removed it, or leave it empty if allowed.
    // Assuming name is optional in setPatientInfo if it's removed from UI.
    setPatientInfo({ name: "", age, gender });
    router.push("/encounter");
  };

  const onNumpadKey = useCallback((key: string) => {
    if (key === "Backspace") {
      setAge((prev) => prev.slice(0, -1));
    } else {
      setAge((prev) => (prev.length < 3 ? prev + key : prev));
    }
    
    if (ageInputRef.current) {
      ageInputRef.current.focus();
    }
  }, []);

  return (
    <KioskShell step="identify">
      <header className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          Basic Information
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Please provide some basic details before we begin.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-8 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 mt-6">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <Field className="gap-3">
              <FieldLabel htmlFor="patient-age" className="text-lg font-bold">
                Age
              </FieldLabel>
              <input
                ref={ageInputRef}
                id="patient-age"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Your Age"
                className="w-full min-h-14 rounded-xl border-2 border-input bg-background px-4 text-xl font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                value={age}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
                  setAge(val);
                }}
              />
            </Field>
          </div>
          <div className="flex justify-center lg:justify-start shrink-0">
            <VirtualNumpad onKeyPress={onNumpadKey} />
          </div>
        </div>

        <Field className="gap-3">
          <FieldLabel className="text-lg font-bold">
            Gender
          </FieldLabel>
          <RadioGroup
            value={gender}
            onValueChange={setGender}
            className="flex flex-col sm:flex-row gap-4"
          >
            <label
              className={cn(
                "flex flex-1 min-h-16 cursor-pointer items-center justify-center gap-3 rounded-xl border-2 bg-background p-4 text-lg font-bold transition-all hover:bg-muted",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-4 has-[:checked]:ring-primary/20",
              )}
            >
              <RadioGroupItem value="male" className="hidden" />
              <span>Male</span>
            </label>
            <label
              className={cn(
                "flex flex-1 min-h-16 cursor-pointer items-center justify-center gap-3 rounded-xl border-2 bg-background p-4 text-lg font-bold transition-all hover:bg-muted",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-4 has-[:checked]:ring-primary/20",
              )}
            >
              <RadioGroupItem value="female" className="hidden" />
              <span>Female</span>
            </label>
            <label
              className={cn(
                "flex flex-1 min-h-16 cursor-pointer items-center justify-center gap-3 rounded-xl border-2 bg-background p-4 text-lg font-bold transition-all hover:bg-muted",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-4 has-[:checked]:ring-primary/20",
              )}
            >
              <RadioGroupItem value="other" className="hidden" />
              <span>Other</span>
            </label>
          </RadioGroup>
        </Field>

        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:justify-end mt-8 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-14 rounded-xl px-8 text-lg"
            onClick={() => router.push("/identify")}
          >
            {t(language, "nav.back")}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="min-h-14 rounded-xl px-12 text-lg font-bold shadow-md"
          >
            {t(language, "nav.continue")}
          </Button>
        </div>
      </form>
    </KioskShell>
  );
}
