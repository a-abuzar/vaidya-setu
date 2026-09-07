"use client";

/**
 * Encounter / conversational history screen.
 *
 * One question at a time, shown at large type, with both a
 * hold-to-speak button and touch options alongside each prompt.
 * After the patient answers, the transcript is shown in a caption
 * panel so they can confirm or correct what the system understood
 * before it propagates.
 *
 * Red-flag detection from the triage LLM is rendered as a
 * full-screen high-contrast interrupt, not a small banner — the
 * patient must acknowledge that staff has been notified.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Activity,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { VirtualKeyboard } from "@/components/kiosk/VirtualKeyboard";
import { useKioskUi } from "@/lib/store/kiosk-ui";
import { useSessionStore, type TranscriptEntry } from "@/lib/store/session";
import { useConsentStore } from "@/lib/store/consent";
import { useSpeech } from "@/components/kiosk/useSpeech";
import { HoldToSpeak } from "@/components/HoldToSpeak";
import { rpcClient } from "@/lib/api-client";
import { t } from "@/lib/i18n/dict";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TouchOption {
  id: string;
  label: string;
}

interface TriageData {
  redFlag: boolean;
  redFlagReason: string | null;
  socratesFieldsMissing: string[];
  nextQuestion: string | null;
  languageUsed?: "en" | "hi" | "ta" | null;
}

const FALLBACK_OPTION_IDS = ["yes", "no", "pain", "fever", "cough", "other"] as const;

function getFallbackOptions(lang: "en" | "hi" | "ta"): TouchOption[] {
  return FALLBACK_OPTION_IDS.map((id) => ({
    id,
    label: t(lang, `encounter.option.${id}`),
  }));
}

const INITIAL_QUESTION: Record<"hi" | "en" | "ta", string> = {
  hi: "नमस्ते। आज आप कैसा महसूस कर रहे हैं?",
  en: "Hello. How are you feeling today?",
  ta: "வணக்கம். இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?",
};

type SessionBootstrap =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; sessionId: string }
  | { status: "error"; message: string };

export default function EncounterPage(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const { speak, cancel: cancelSpeech } = useSpeech();

  const {
    sessionId,
    transcript,
    currentQuestion,
    isProcessing,
    redFlagDetected,
    redFlagReason,
    ayushModeEnabled,
    addTranscriptEntry,
    setCurrentQuestion,
    setProcessing,
    setRedFlag,
    queueOfflineMutation,
    startSession,
  } = useSessionStore();

  const [pendingUtterance, setPendingUtterance] = useState<string | null>(null);
  const [touchOptions, setTouchOptions] = useState<TouchOption[]>(() => getFallbackOptions(language));
  const [bootstrap, setBootstrap] = useState<SessionBootstrap>({ status: "idle" });
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [keyboardValue, setKeyboardValue] = useState("");
  const initLockRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onVirtualKey = useCallback((key: string) => {
    if (!inputRef.current) {
      setKeyboardValue((prev) => key === "Backspace" ? prev.slice(0, -1) : prev + key);
      return;
    }
    const el = inputRef.current;
    const start = el.selectionStart ?? keyboardValue.length;
    const end = el.selectionEnd ?? keyboardValue.length;

    let newVal = keyboardValue;
    let newPos = start;

    if (key === "Backspace") {
      if (start === end && start > 0) {
        newVal = keyboardValue.slice(0, start - 1) + keyboardValue.slice(end);
        newPos = start - 1;
      } else if (start !== end) {
        newVal = keyboardValue.slice(0, start) + keyboardValue.slice(end);
        newPos = start;
      }
    } else {
      newVal = keyboardValue.slice(0, start) + key + keyboardValue.slice(end);
      newPos = start + key.length;
    }

    setKeyboardValue(newVal);
    
    // Defer setting selection to allow React to update the DOM value first
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newPos, newPos);
    }, 0);
  }, [keyboardValue]);

  useEffect(() => {
    setTouchOptions((prev) => {
      const isFallback = prev.length === FALLBACK_OPTION_IDS.length && prev.every((p, i) => p.id === FALLBACK_OPTION_IDS[i]);
      if (isFallback) {
        return getFallbackOptions(language);
      }
      return prev;
    });
  }, [language]);

  useEffect(() => {
    if (initLockRef.current) return;
    if (sessionId !== null) {
      setBootstrap({ status: "ready", sessionId });
      return;
    }
    initLockRef.current = true;
    setBootstrap({ status: "loading" });

    void (async () => {
      try {
        const res = await fetch("/api/sessions/anon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kioskId: "kiosk-001",
            preferredLanguage: language,
            consent: useConsentStore.getState(),
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        const payload = (await res.json()) as
          | { success: true; data: { sessionId: string; patientId: string } }
          | { success: false; error: { code: string; message: string } };
        if (!payload.success) {
          throw new Error(payload.error.message);
        }
        startSession(payload.data.sessionId, payload.data.patientId, language);
        setBootstrap({ status: "ready", sessionId: payload.data.sessionId });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Could not start session.";
        console.error("[encounter] session bootstrap failed", error);
        setBootstrap({ status: "error", message });
      }
    })();
  }, [sessionId, language, startSession]);

  useEffect(() => {
    if (bootstrap.status !== "ready") return;
    if (currentQuestion !== null) return;
    const firstQ = INITIAL_QUESTION[language];
    setCurrentQuestion(firstQ);
    addTranscriptEntry({
      role: "system",
      text: firstQ,
      lang: language,
      timestamp: new Date().toISOString(),
    });
    speak(firstQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap.status, language]);

  useEffect(() => {
    if (!currentQuestion) return;
    // Find the corresponding transcript entry to get its language
    const sysEntry = transcript.slice().reverse().find(e => e.text === currentQuestion && e.role === "system");
    speak(currentQuestion, sysEntry?.lang);
    return () => cancelSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  const sendTurn = useCallback(
    async (entry: TranscriptEntry): Promise<void> => {
      setProcessing(true);
      try {
        const history = [...transcript, entry]
          .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
          .join("\n");

        const triageRes = await rpcClient.api.ai.triage.$post({
          json: { transcript: history, language },
        });

        if (!triageRes.ok) {
          throw new Error(`Triage HTTP ${triageRes.status}`);
        }

        const triageJson = (await triageRes.json()) as
          | { success: true; data: TriageData }
          | { success: false; error: { code: string; message: string } };
        if (!triageJson.success) {
          throw new Error(triageJson.error.message);
        }
        const triage = triageJson.data;

        if (triage.redFlag) {
          setRedFlag(true, triage.redFlagReason ?? "Emergency symptom detected");
          toast.error(triage.redFlagReason ?? "Red flag detected");
          return;
        }

        const nextQ = triage.nextQuestion;
        if (nextQ) {
          setCurrentQuestion(nextQ);
          addTranscriptEntry({
            role: "system",
            text: nextQ,
            lang: triage.languageUsed ?? language,
            timestamp: new Date().toISOString(),
          });
        }
        setTouchOptions(getFallbackOptions(language));

        const sid = useSessionStore.getState().sessionId;
        if (sid) {
          const payload = { transcript: [...transcript, entry] };
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            await queueOfflineMutation({
              sessionId: sid,
              type: "PATCH_TRANSCRIPT",
              payload,
            });
          } else {
            try {
              const patchRes = await rpcClient.api.sessions[":id"].$patch({
                param: { id: sid },
                json: payload,
              });
              if (!patchRes.ok) throw new Error("DB sync failed");
            } catch (error: unknown) {
              console.warn("[encounter] transcript sync failed, queueing offline", error);
              await queueOfflineMutation({
                sessionId: sid,
                type: "PATCH_TRANSCRIPT",
                payload,
              });
            }
          }
        }

        if (!nextQ) {
          toast.success(t(language, "encounter.finish"));
          router.push("/documents");
        }
      } catch (error: unknown) {
        console.error("[encounter] triage failed", error);
        toast.error(t(language, "error.network"));
      } finally {
        setProcessing(false);
      }
    },
    [
      transcript,
      language,
      addTranscriptEntry,
      setCurrentQuestion,
      setProcessing,
      setRedFlag,
      queueOfflineMutation,
      router,
    ],
  );

  const lastSystemEntry = useMemo(
    () => [...transcript].reverse().find((e) => e.role === "system"),
    [transcript],
  );

  const onHoldTranscript = (text: string): void => {
    if (!text.trim()) {
      toast.error(t(language, "encounter.audioFailed"));
      return;
    }
    setPendingUtterance(text.trim());
  };

  const onPickOption = (option: TouchOption): void => {
    setPendingUtterance(option.label);
  };

  const onConfirmUtterance = (): void => {
    if (!pendingUtterance) return;
    const entry: TranscriptEntry = {
      role: "patient",
      text: pendingUtterance,
      lang: language,
      timestamp: new Date().toISOString(),
    };
    addTranscriptEntry(entry);
    setPendingUtterance(null);
    void sendTurn(entry);
  };

  const onDismissUtterance = (): void => {
    setPendingUtterance(null);
    if (currentQuestion) {
      const sysEntry = transcript.slice().reverse().find(e => e.text === currentQuestion && e.role === "system");
      speak(currentQuestion, sysEntry?.lang);
    }
  };

  // ---------- Early returns AFTER all hooks -----------------------
  if (redFlagDetected) {
    return (
      <RedFlagInterrupt
        reason={redFlagReason}
        onAcknowledge={() => {
          toast.success(t(language, "redflag.notify"));
        }}
        onContinueAnyway={() => setRedFlag(false, null)}
      />
    );
  }

  if (bootstrap.status === "loading") {
    return (
      <KioskShell step="encounter">
        <StatusPlaceholder
          icon={<Loader2 className="size-12 animate-spin" />}
          title={t(language, "encounter.processing")}
        />
      </KioskShell>
    );
  }
  if (bootstrap.status === "error") {
    return (
      <KioskShell step="encounter">
        <StatusPlaceholder
          variant="error"
          icon={<AlertTriangle className="size-12" />}
          title={t(language, "error.generic")}
          description={bootstrap.message}
          actionLabel={t(language, "nav.retry")}
          onAction={() => {
            initLockRef.current = false;
            setBootstrap({ status: "idle" });
          }}
        />
      </KioskShell>
    );
  }

  return (
    <KioskShell step="encounter">
      <header className="flex flex-col gap-2 text-center sm:text-left">
        <div className="flex flex-wrap items-center gap-1.5 self-center sm:self-start">
          <Badge variant="secondary" className="px-2 py-0.5 text-xs">
            <Activity className="mr-1 size-3" aria-hidden="true" />
            {ayushModeEnabled ? "AYUSH mode" : "Standard mode"}
          </Badge>
          {sessionId ? (
            <Badge variant="outline" className="px-2 py-0.5 text-xs">
              Session {sessionId.slice(0, 8)}
            </Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          {t(language, "encounter.heading")}
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          {t(language, "encounter.subheading")}
        </p>
      </header>

      <section
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
      >
        <h2 className="max-w-3xl text-2xl font-extrabold leading-snug sm:text-3xl">
          {currentQuestion ?? t(language, "encounter.placeholder")}
        </h2>
        {isProcessing ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t(language, "encounter.processing")}
          </div>
        ) : null}
      </section>

      {pendingUtterance !== null ? (
        <section
          aria-live="polite"
          className="flex flex-col gap-3 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 shadow-sm"
        >
          <h3 className="text-lg font-bold sm:text-xl">
            {t(language, "encounter.correctTitle")}
          </h3>
          <p className="rounded-xl bg-background p-3 text-lg font-semibold leading-relaxed sm:text-xl">
            “{pendingUtterance}”
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-10 rounded-xl px-4 text-sm"
              onClick={onDismissUtterance}
            >
              {t(language, "encounter.wrong")}
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-h-10 rounded-xl px-6 text-sm font-bold shadow-sm"
              onClick={onConfirmUtterance}
              disabled={isProcessing}
            >
              <CheckCircle2 className="mr-2 size-4" aria-hidden="true" />
              {t(language, "encounter.correct.yes")}
            </Button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <HoldToSpeak
            onTranscript={onHoldTranscript}
            disabled={isProcessing}
          />
          <Separator />
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {isKeyboardMode ? t(language, "encounter.keyboardTitle") : t(language, "encounter.optionsTitle")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs uppercase text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsKeyboardMode(!isKeyboardMode);
                  setKeyboardValue("");
                }}
              >
                {isKeyboardMode ? t(language, "nav.cancel") : (
                  <>
                    <Keyboard className="mr-2 size-4" />
                    {t(language, "encounter.typeAnswer")}
                  </>
                )}
              </Button>
            </div>
            {isKeyboardMode ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="none"
                    value={keyboardValue}
                    onChange={(e) => setKeyboardValue(e.target.value)}
                    autoFocus
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={t(language, "encounter.placeholder")}
                  />
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 rounded-xl px-8"
                    disabled={keyboardValue.trim().length === 0 || isProcessing}
                    onClick={() => {
                      if (keyboardValue.trim()) {
                        setPendingUtterance(keyboardValue.trim());
                        setKeyboardValue("");
                        setIsKeyboardMode(false);
                      }
                    }}
                  >
                    {t(language, "encounter.submit")}
                  </Button>
                </div>
                <VirtualKeyboard onKeyPress={onVirtualKey} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {touchOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onPickOption(opt)}
                    className="min-h-12 rounded-xl border border-border bg-background px-3 py-2 text-base font-medium transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        <p className="mb-1 text-sm font-bold uppercase tracking-wider text-foreground">
          {t(language, "encounter.lastHeard")}
        </p>
        {lastSystemEntry ? (
          <p className="text-sm leading-relaxed">
            <span className="font-bold text-foreground">Dr: </span>
            {lastSystemEntry.text}
          </p>
        ) : (
          <p>{t(language, "encounter.placeholder")}</p>
        )}
        {transcript.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1.5">
            {[...transcript]
              .slice(-3)
              .reverse()
              .map((e, i) =>
                e.role === "patient" ? (
                  <li
                    key={i}
                    className="rounded-xl bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
                  >
                    {e.text}
                  </li>
                ) : null,
              )}
          </ul>
        ) : null}
      </section>
    </KioskShell>
  );
}

function RedFlagInterrupt({
  reason,
  onAcknowledge,
  onContinueAnyway,
}: {
  reason: string | null;
  onAcknowledge: () => void;
  onContinueAnyway: () => void;
}): React.ReactElement {
  const language = useKioskUi((s) => s.language);
  const { speak } = useSpeech();

  useEffect(() => {
    speak(t(language, "redflag.body"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-destructive p-6">
      <div className="max-w-xl rounded-2xl bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-xl bg-destructive text-destructive-foreground sm:size-16"
          >
            <AlertTriangle className="size-8 sm:size-10" />
          </span>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-destructive sm:text-3xl">
            {t(language, "redflag.heading")}
          </h1>
        </div>
        {reason ? (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-bold uppercase tracking-wider text-destructive">
              {t(language, "redflag.reason")}
            </p>
            <p className="mt-1 text-lg font-semibold leading-snug text-foreground sm:text-xl">
              {reason}
            </p>
          </div>
        ) : null}
        <p className="text-lg leading-relaxed text-foreground sm:text-xl">
          {t(language, "redflag.body")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-10 rounded-xl px-4 text-sm font-semibold"
            onClick={onContinueAnyway}
          >
            {t(language, "redflag.continueAnyway")}
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-h-12 rounded-xl px-6 text-lg font-bold shadow-sm"
            onClick={onAcknowledge}
          >
            <CheckCircle2 className="mr-2 size-5" aria-hidden="true" />
            {t(language, "redflag.confirm")}
          </Button>
        </div>
      </div>
    </main>
  );
}

function StatusPlaceholder({
  icon,
  title,
  description,
  variant = "neutral",
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  variant?: "neutral" | "error";
  actionLabel?: string;
  onAction?: () => void;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center",
        variant === "error"
          ? "border-destructive bg-destructive/5"
          : "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-xl",
          variant === "error" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      {description ? (
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          type="button"
          size="lg"
          className="min-h-12 rounded-xl px-4 text-base"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}