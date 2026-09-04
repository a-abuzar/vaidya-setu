"use client";

import { useState } from "react";
import { useSessionStore } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { rpcClient } from "@/lib/api-client";
import { Fingerprint, UserCheck, Loader2, AlertCircle } from "lucide-react";
import type { SessionId, PatientId } from "@/lib/types";

type IdentifyPath = "abha" | "guest";

/**
 * IdentifyScreen — ABHA linking or guest path.
 * Both paths are equally prominent. ABHA path calls the session API to
 * create a patient + session record. Guest path creates a minimal record.
 *
 * TODO (Phase 12): Collect full demographics (DOB, gender) for guest path.
 * Currently uses placeholder values because `patients` table requires NOT NULL fields.
 */
export function IdentifyScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const consents = useSessionStore((s) => s.consents);
  const startSession = useSessionStore((s) => s.startSession);
  const nextStep = useSessionStore((s) => s.nextStep);

  const dict = getDictionary(language);

  const [selectedPath, setSelectedPath] = useState<IdentifyPath | null>(null);
  const [abhaNumber, setAbhaNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If ABDM consent was declined, ABHA path is locked
  const abdmConsentGranted =
    consents.find((c) => c.purpose === "abdm_health_record_linking")
      ?.granted ?? false;

  const abhaPathDisabled = !abdmConsentGranted;

  const canProceedAbha = abhaNumber.trim().length >= 14; // ABHA numbers are 14 digits
  const canProceedGuest =
    guestName.trim().length >= 2 && guestPhone.trim().length >= 10;

  const handleAbhaVerify = async (): Promise<void> => {
    if (!canProceedAbha) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await rpcClient.api.sessions.$post({
        json: {
          kiosk_id: "kiosk-1",
          patient: {
            full_name: "ABHA Verified Patient",
            // TODO (Phase 12): Parse real demographics from ABHA profile
            date_of_birth: new Date("1980-01-01"),
            gender: "other",
            phone: abhaNumber,
            preferred_language: language,
            abha_id: abhaNumber,
          },
        },
      });

      if (!res.ok) {
        throw new Error(
          language === "hi"
            ? "सत्यापन सेवा उपलब्ध नहीं है। मेहमान के रूप में जारी रखें।"
            : language === "ta"
              ? "சரிபார்ப்பு சேவை கிடைக்கவில்லை. விருந்தினராக தொடரவும்."
              : "Verification service unavailable. Continue as guest."
        );
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(
          language === "hi"
            ? "आभा (ABHA) सत्यापन विफल। कृपया पुनः प्रयास करें।"
            : language === "ta"
              ? "ABHA சரிபார்ப்பு தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்."
              : "ABHA verification failed. Please try again."
        );
      }

      const session = data.data;
      startSession(
        session.id as SessionId,
        session.patient_id as PatientId,
        language
      );
      nextStep();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : dict.errors.generic;
      setErrorMsg(message);
      console.error("ABHA verify failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestContinue = async (): Promise<void> => {
    if (!canProceedGuest) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await rpcClient.api.sessions.$post({
        json: {
          kiosk_id: "kiosk-1",
          patient: {
            full_name: guestName.trim(),
            // TODO (Phase 12): Collect real DOB and gender via form
            date_of_birth: new Date("1980-01-01"),
            gender: "other",
            phone: guestPhone.trim(),
            preferred_language: language,
            abha_id: null,
          },
        },
      });

      if (!res.ok) {
        throw new Error(dict.errors.networkError);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(dict.errors.generic);
      }

      const session = data.data;
      startSession(
        session.id as SessionId,
        session.patient_id as PatientId,
        language
      );
      nextStep();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : dict.errors.generic;
      setErrorMsg(message);
      console.error("Guest session creation failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /** Skip ABHA verification — creates a session with unverified ABHA data and proceeds. */
  const handleSkipAbha = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await rpcClient.api.sessions.$post({
        json: {
          kiosk_id: "kiosk-1",
          patient: {
            full_name: "ABHA Patient (Unverified)",
            date_of_birth: new Date("1980-01-01"),
            gender: "other",
            phone: abhaNumber.trim() || "0000000000",
            preferred_language: language,
            abha_id: abhaNumber.trim() || null,
          },
        },
      });
      if (!res.ok) throw new Error(dict.errors.networkError);
      const data = await res.json();
      if (!data.success) throw new Error(dict.errors.generic);
      const session = data.data;
      startSession(
        session.id as SessionId,
        session.patient_id as PatientId,
        language
      );
      nextStep();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : dict.errors.generic;
      setErrorMsg(message);
      console.error("Skip ABHA session creation failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center pt-4 pb-2">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {dict.identify.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {dict.identify.subtitle}
          </p>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-semibold text-destructive">
                {language === "hi"
                  ? "कुछ गलत हुआ"
                  : language === "ta"
                    ? "ஏதோ தவறு நடந்தது"
                    : "Something went wrong"}
              </p>
              <p className="text-sm text-destructive/80 mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Path A: ABHA */}
        <div
          className={`rounded-2xl border-2 p-6 transition-colors cursor-pointer ${
            abhaPathDisabled
              ? "border-border bg-muted opacity-60"
              : selectedPath === "abha"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
          }`}
          onClick={() => !abhaPathDisabled && setSelectedPath("abha")}
          role="button"
          tabIndex={abhaPathDisabled ? -1 : 0}
          aria-pressed={selectedPath === "abha"}
          aria-disabled={abhaPathDisabled}
          onKeyDown={(e) => {
            if (!abhaPathDisabled && (e.key === "Enter" || e.key === " ")) {
              setSelectedPath("abha");
            }
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Fingerprint className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {dict.identify.abhaPath.title}
              </h2>
              {abhaPathDisabled && (
                <p className="text-sm text-muted-foreground mt-1">
                  {language === "hi"
                    ? "ABDM सहमति की आवश्यकता है।"
                    : language === "ta"
                      ? "ABDM ஒப்புதல் தேவை."
                      : "ABDM consent required."}
                </p>
              )}
            </div>
          </div>

          {selectedPath === "abha" && !abhaPathDisabled && (
            <div className="flex flex-col gap-3 mt-2">
              <input
                type="tel"
                inputMode="numeric"
                value={abhaNumber}
                onChange={(e) => setAbhaNumber(e.target.value)}
                placeholder={dict.identify.abhaPath.placeholder}
                className="w-full px-4 py-4 rounded-xl border-2 border-border bg-background text-foreground text-lg focus:border-primary focus:outline-none"
                maxLength={17}
                aria-label={dict.identify.abhaPath.placeholder}
              />
              <button
                onClick={handleAbhaVerify}
                disabled={!canProceedAbha || isLoading}
                className="kiosk-touch w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-primary text-primary-foreground text-lg font-bold disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : null}
                {dict.identify.abhaPath.verifyButton}
              </button>
              {/* Skip verification — for demo / testing purposes */}
              <button
                onClick={() =>
                  handleSkipAbha().catch((e: unknown) =>
                    console.error("Skip ABHA error:", e)
                  )
                }
                disabled={isLoading}
                className="kiosk-touch w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground text-base font-medium hover:border-primary/40 hover:text-foreground disabled:opacity-40 transition-all"
              >
                {language === "hi"
                  ? "सत्यापन छोड़ें"
                  : language === "ta"
                    ? "சரிபார்ப்பை தவிர்க்கவும்"
                    : "Skip verification"}
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-base text-muted-foreground font-medium px-2">
            {language === "hi"
              ? "या"
              : language === "ta"
                ? "அல்லது"
                : "OR"}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Path B: Guest */}
        <div
          className={`rounded-2xl border-2 p-6 transition-colors cursor-pointer ${
            selectedPath === "guest"
              ? "border-accent bg-accent/5"
              : "border-border bg-card hover:border-accent/40"
          }`}
          onClick={() => setSelectedPath("guest")}
          role="button"
          tabIndex={0}
          aria-pressed={selectedPath === "guest"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setSelectedPath("guest");
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-accent/10 p-3 rounded-xl">
              <UserCheck className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {dict.identify.guestPath.title}
              </h2>
              <p className="text-base text-muted-foreground mt-1">
                {dict.identify.guestPath.description}
              </p>
            </div>
          </div>

          {selectedPath === "guest" && (
            <div className="flex flex-col gap-4 mt-2">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={
                  language === "hi"
                    ? "आपका नाम"
                    : language === "ta"
                      ? "உங்கள் பெயர்"
                      : "Your Name"
                }
                className="w-full px-4 py-4 rounded-xl border-2 border-border bg-background text-foreground text-lg focus:border-primary focus:outline-none"
                aria-label="Name"
              />
              <input
                type="tel"
                inputMode="numeric"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder={
                  language === "hi"
                    ? "मोबाइल नंबर"
                    : language === "ta"
                      ? "மொபைல் எண்"
                      : "Mobile Number"
                }
                className="w-full px-4 py-4 rounded-xl border-2 border-border bg-background text-foreground text-lg focus:border-primary focus:outline-none"
                maxLength={15}
                aria-label="Phone"
              />
              <button
                onClick={handleGuestContinue}
                disabled={!canProceedGuest || isLoading}
                className="kiosk-touch w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-accent text-accent-foreground text-lg font-bold disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : null}
                {dict.identify.guestPath.continueButton}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
