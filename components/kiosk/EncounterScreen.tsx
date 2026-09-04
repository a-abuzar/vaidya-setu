"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore, type InterviewStage } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { HoldToSpeak } from "@/components/HoldToSpeak";
import { rpcClient } from "@/lib/api-client";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TriageResponse {
  redFlag: boolean;
  redFlagReason?: string;
  nextQuestion?: string;
  stage?: InterviewStage;
  touchOptions?: Array<{ id: string; label: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function speakText(text: string, langCode: string): void {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang.startsWith(langCode.split("-")[0]!));
  if (match) utterance.voice = match;
  utterance.lang = langCode;
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

const INITIAL_QUESTIONS: Record<string, string> = {
  hi: "नमस्ते। आज आप कैसा महसूस कर रहे हैं? कृपया अपनी मुख्य समस्या बताएं।",
  en: "Hello. How are you feeling today? Please tell me your main problem.",
  ta: "வணக்கம். இன்று நீங்கள் எப்படி உணருகிறீர்கள்? உங்கள் முக்கிய பிரச்சனையை சொல்லுங்கள்.",
};

/**
 * EncounterScreen — the core voice interview.
 *
 * Layout:
 *  - Current question (large, centred)
 *  - HoldToSpeak (160px)
 *  - Caption panel (what we heard + confirm/retry)
 *  - Touch options (if provided by triage)
 *  - Stage indicator
 *  - Collapsible transcript log
 *  - Red-flag full-screen interrupt (when triggered)
 */
export function EncounterScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const sessionId = useSessionStore((s) => s.sessionId);
  const currentQuestion = useSessionStore((s) => s.currentQuestion);
  const captionText = useSessionStore((s) => s.captionText);
  const touchOptions = useSessionStore((s) => s.touchOptions);
  const transcript = useSessionStore((s) => s.transcript);
  const isProcessing = useSessionStore((s) => s.isProcessing);
  const redFlagDetected = useSessionStore((s) => s.redFlagDetected);
  const redFlagReason = useSessionStore((s) => s.redFlagReason);
  const currentStage = useSessionStore((s) => s.currentStage);
  const audioEnabled = useSessionStore((s) => s.audioEnabled);
  const setCurrentQuestion = useSessionStore((s) => s.setCurrentQuestion);
  const setCaptionText = useSessionStore((s) => s.setCaptionText);
  const setTouchOptions = useSessionStore((s) => s.setTouchOptions);
  const addTranscriptEntry = useSessionStore((s) => s.addTranscriptEntry);
  const setProcessing = useSessionStore((s) => s.setProcessing);
  const setRedFlag = useSessionStore((s) => s.setRedFlag);
  const setStage = useSessionStore((s) => s.setStage);
  const queueOfflineMutation = useSessionStore((s) => s.queueOfflineMutation);
  const nextStep = useSessionStore((s) => s.nextStep);

  const [showTranscript, setShowTranscript] = useState(false);
  const [captionConfirmed, setCaptionConfirmed] = useState<boolean | null>(null);
  const [redFlagAcknowledged, setRedFlagAcknowledged] = useState(false);

  const dict = getDictionary(language);
  const langCode =
    language === "hi" ? "hi-IN" : language === "ta" ? "ta-IN" : "en-IN";

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Initialize with first question
  useEffect(() => {
    if (!currentQuestion) {
      const q = INITIAL_QUESTIONS[language] ?? INITIAL_QUESTIONS["en"]!;
      setCurrentQuestion(q);
      addTranscriptEntry({
        role: "system",
        text: q,
        lang: language,
        timestamp: new Date().toISOString(),
      });
      if (audioEnabled) speakText(q, langCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  const processAnswer = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim()) return;

      const entry = {
        role: "patient" as const,
        text,
        lang: language,
        timestamp: new Date().toISOString(),
      };

      addTranscriptEntry(entry);
      setCaptionText(text);
      setCaptionConfirmed(null);
      setProcessing(true);

      const fullHistory = [...transcript, entry]
        .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
        .join("\n");

      try {
        const triageRes = await rpcClient.api.ai.triage.$post({
          json: { transcript: fullHistory, language },
        });

        if (!triageRes.ok) {
          throw new Error("Triage service unavailable.");
        }

        const triageData = await triageRes.json();
        if (!triageData.success) {
          throw new Error("Triage validation failed.");
        }

        const data = triageData.data as TriageResponse;

        if (data.redFlag) {
          setRedFlag(true, data.redFlagReason ?? "Emergency symptom detected");
        }

        if (data.stage) {
          setStage(data.stage);
          if (data.stage === "complete") {
            // Advance to document scan after short delay
            setTimeout(() => nextStep(), 1500);
          }
        }

        if (data.nextQuestion) {
          setCurrentQuestion(data.nextQuestion);
          addTranscriptEntry({
            role: "system",
            text: data.nextQuestion,
            lang: language,
            timestamp: new Date().toISOString(),
          });
          if (audioEnabled) speakText(data.nextQuestion, langCode);
        }

        if (data.touchOptions) {
          setTouchOptions(
            data.touchOptions.map((o) => ({
              id: o.id,
              label: o.label,
              localizedLabel: o.label,
            }))
          );
        } else {
          setTouchOptions(null);
        }

        // Persist to DB
        if (sessionId) {
          const patchPayload = { transcript: [...transcript, entry] };
          if (!navigator.onLine) {
            await queueOfflineMutation({
              sessionId,
              type: "PATCH_TRANSCRIPT",
              payload: patchPayload,
            });
          } else {
            try {
              const patchRes = await rpcClient.api.sessions[":id"].$patch({
                param: { id: sessionId },
                json: patchPayload,
              });
              if (!patchRes.ok) {
                await queueOfflineMutation({
                  sessionId,
                  type: "PATCH_TRANSCRIPT",
                  payload: patchPayload,
                });
              }
            } catch (patchErr: unknown) {
              console.error("DB patch failed, queuing offline:", patchErr);
              await queueOfflineMutation({
                sessionId,
                type: "PATCH_TRANSCRIPT",
                payload: patchPayload,
              });
            }
          }
        }
      } catch (err: unknown) {
        console.error("Triage error:", err);
      } finally {
        setProcessing(false);
      }
    },
    [
      language,
      langCode,
      transcript,
      sessionId,
      audioEnabled,
      addTranscriptEntry,
      setCaptionText,
      setProcessing,
      setRedFlag,
      setStage,
      setCurrentQuestion,
      setTouchOptions,
      queueOfflineMutation,
      nextStep,
    ]
  );

  const handleTranscript = useCallback(
    (text: string): void => {
      processAnswer(text).catch((e: unknown) =>
        console.error("processAnswer error:", e)
      );
    },
    [processAnswer]
  );

  const handleTryAgain = (): void => {
    setCaptionText(null);
    setCaptionConfirmed(null);
  };

  const handleTouchOption = (label: string): void => {
    handleTranscript(label);
  };

  // ─── Red flag interrupt ────────────────────────────────────────────────────
  if (redFlagDetected && !redFlagAcknowledged) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-destructive p-8 text-center"
        role="alert"
        aria-live="assertive"
      >
        <AlertTriangle className="w-24 h-24 text-white mb-6" />
        <h1 className="text-4xl font-bold text-white mb-4">
          {dict.redFlag.title}
        </h1>
        <p className="text-2xl text-white/90 mb-3">{dict.redFlag.staffNotified}</p>
        <p className="text-2xl text-white/90 mb-6">{dict.redFlag.waitHere}</p>
        {redFlagReason && (
          <p className="text-xl text-white/80 mb-8">
            {dict.redFlag.reason} {redFlagReason}
          </p>
        )}
        <button
          onClick={() => setRedFlagAcknowledged(true)}
          className="kiosk-touch px-10 py-5 rounded-2xl bg-white text-destructive text-xl font-bold shadow-lg"
        >
          {language === "hi"
            ? "ठीक है, जारी रखें"
            : language === "ta"
              ? "சரி, தொடரவும்"
              : "OK, Continue"}
        </button>
      </div>
    );
  }

  // ─── Main interview UI ────────────────────────────────────────────────────
  return (
    <main className="flex-1 flex flex-col items-center justify-start p-4 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-6 pb-4">
        {/* Stage indicator */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <ClipboardList className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold text-primary">
              {dict.encounter.stageLabels[currentStage]}
            </span>
          </div>
        </div>

        {/* Current question */}
        <div className="text-center px-2">
          <p className="text-2xl font-semibold text-foreground leading-relaxed">
            {currentQuestion ??
              (language === "hi"
                ? "कृपया प्रतीक्षा करें..."
                : language === "ta"
                  ? "தயவுசெய்து காத்திருங்கள்..."
                  : "Please wait...")}
          </p>
        </div>

        {/* HoldToSpeak */}
        <div className="flex items-center justify-center py-4">
          <HoldToSpeak onTranscript={handleTranscript} language={language} />
        </div>

        {/* Caption panel */}
        {captionText && (
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
            <p className="text-base font-medium text-muted-foreground mb-2">
              {dict.encounter.weHeard}
            </p>
            <p className="text-xl font-semibold text-foreground mb-4">
              &ldquo;{captionText}&rdquo;
            </p>
            {captionConfirmed === null && (
              <div className="flex gap-3">
                <button
                  onClick={() => setCaptionConfirmed(true)}
                  className="kiosk-touch flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  <CheckCircle className="w-5 h-5" />
                  {dict.encounter.correct}
                </button>
                <button
                  onClick={handleTryAgain}
                  className="kiosk-touch flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-foreground font-semibold"
                >
                  <XCircle className="w-5 h-5" />
                  {dict.encounter.tryAgain}
                </button>
              </div>
            )}
            {captionConfirmed === true && (
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{dict.encounter.correct}</span>
              </div>
            )}
          </div>
        )}

        {/* Correction affordance */}
        {!captionText && (
          <div className="flex justify-center">
            <button
              onClick={handleTryAgain}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-base text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              {dict.encounter.thatsNotRight}
            </button>
          </div>
        )}

        {/* Touch options */}
        {touchOptions && touchOptions.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-base font-medium text-muted-foreground text-center">
              {language === "hi"
                ? "या एक विकल्प चुनें:"
                : language === "ta"
                  ? "அல்லது ஒரு விருப்பத்தை தேர்ந்தெடுங்கள்:"
                  : "Or choose an option:"}
            </p>
            {touchOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleTouchOption(opt.localizedLabel)}
                className="kiosk-touch flex items-center justify-between px-5 py-4 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-lg font-medium text-foreground"
              >
                {opt.localizedLabel}
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 py-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
            <span className="text-base text-muted-foreground">
              {dict.encounter.processing}
            </span>
          </div>
        )}

        {/* Collapsible transcript */}
        <div className="border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 bg-secondary text-foreground font-medium text-base"
            aria-expanded={showTranscript}
          >
            <span>
              {language === "hi"
                ? "बातचीत देखें"
                : language === "ta"
                  ? "உரையாடல் பார்க்கவும்"
                  : "View conversation"}
            </span>
            <ChevronRight
              className={`w-5 h-5 transition-transform ${showTranscript ? "rotate-90" : ""}`}
            />
          </button>
          {showTranscript && (
            <div className="max-h-60 overflow-y-auto p-4 flex flex-col gap-3 bg-background">
              {transcript.map((entry, i) => (
                <div
                  key={i}
                  className={`text-sm px-4 py-2 rounded-xl max-w-[90%] ${
                    entry.role === "patient"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-secondary text-foreground"
                  }`}
                >
                  {entry.text}
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
