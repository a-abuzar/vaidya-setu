"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { HoldToSpeak } from "@/components/HoldToSpeak";
import { useSessionStore } from "@/lib/store/session";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/dict";
import { useKioskUi } from "@/lib/store/kiosk-ui";

export default function BasicInfoPage(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const setPatientInfo = useSessionStore((s) => s.setPatientInfo);
  
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !gender) {
      toast.error("Please fill all fields");
      return;
    }
    setPatientInfo({ name, age, gender });
    router.push("/encounter");
  };

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

      <form onSubmit={onSubmit} className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 mt-6">
        <Field className="gap-2">
          <FieldLabel htmlFor="patient-name" className="text-base font-bold">
            Name
          </FieldLabel>
          <div className="flex gap-2">
            <input
              id="patient-name"
              type="text"
              autoComplete="off"
              placeholder="Your Name"
              className="flex-1 min-h-12 rounded-xl border-2 border-input bg-background px-4 text-base font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <HoldToSpeak 
              onTranscript={(text) => setName(text.trim())} 
              className="w-12 h-12" 
              iconSize={20}
            />
          </div>
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="patient-age" className="text-base font-bold">
            Age
          </FieldLabel>
          <div className="flex gap-2">
            <input
              id="patient-age"
              type="number"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Your Age"
              className="flex-1 min-h-12 rounded-xl border-2 border-input bg-background px-4 text-base font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
            <HoldToSpeak 
              onTranscript={(text) => {
                const num = text.replace(/[^0-9]/g, "");
                if (num) setAge(num);
              }} 
              className="w-12 h-12" 
              iconSize={20}
            />
          </div>
        </Field>

        <Field className="gap-2">
          <FieldLabel className="text-base font-bold">
            Gender
          </FieldLabel>
          <RadioGroup
            value={gender}
            onValueChange={setGender}
            className="flex flex-col sm:flex-row gap-4"
          >
            <label
              className={cn(
                "flex flex-1 min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 text-base font-medium transition-colors hover:bg-muted",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/30",
              )}
            >
              <RadioGroupItem value="male" />
              <span>Male</span>
            </label>
            <label
              className={cn(
                "flex flex-1 min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 text-base font-medium transition-colors hover:bg-muted",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/30",
              )}
            >
              <RadioGroupItem value="female" />
              <span>Female</span>
            </label>
            <label
              className={cn(
                "flex flex-1 min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 text-base font-medium transition-colors hover:bg-muted",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/30",
              )}
            >
              <RadioGroupItem value="other" />
              <span>Other</span>
            </label>
          </RadioGroup>
        </Field>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end mt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12 rounded-xl px-6 text-base"
            onClick={() => router.push("/identify")}
          >
            {t(language, "nav.back")}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="min-h-12 rounded-xl px-8 text-base font-bold shadow-sm"
          >
            {t(language, "nav.continue")}
          </Button>
        </div>
      </form>
    </KioskShell>
  );
}
