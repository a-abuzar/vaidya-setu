"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { rpcClient } from "@/lib/api-client";
import {
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Loader2,
  QrCode,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  id: string;
  chief_complaint: string;
  hpi: string;
  past_history: unknown;
  drug_allergy_history: unknown;
  family_history: string;
  personal_history: string;
  ros: unknown;
  prior_investigations: unknown;
  ayush_assessment: unknown;
}

// ─── Simple QR placeholder using canvas ──────────────────────────────────────

/**
 * Renders a simple canvas-based QR placeholder.
 * TODO (Phase 11): Replace with real QR generation (e.g. qrcode-generator or server-side).
 * A proper QR library would be added as a dependency — flagged for review.
 */
function QrPlaceholder({ sessionId }: { sessionId: string }): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 120;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#0d6e5b";

    // Simple visual hash pattern derived from session ID
    const chars = sessionId.replace(/-/g, "").slice(0, 16);
    const cellSize = size / 8;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const charCode = chars.charCodeAt((row * 8 + col) % chars.length);
        if (charCode % 2 === 0) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }
    // QR-style corner finders
    [
      [0, 0],
      [0, 5],
      [5, 0],
    ].forEach(([r, c]) => {
      if (r === undefined || c === undefined) return;
      ctx.strokeStyle = "#0d6e5b";
      ctx.lineWidth = 2;
      ctx.strokeRect(c * cellSize, r * cellSize, 3 * cellSize, 3 * cellSize);
      ctx.fillRect(
        c * cellSize + cellSize * 0.5,
        r * cellSize + cellSize * 0.5,
        2 * cellSize,
        2 * cellSize
      );
    });
  }, [sessionId]);

  return <canvas ref={canvasRef} className="rounded-lg border border-border" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * SummaryReviewScreen — patient-facing readback of clinical summary.
 *
 * States:
 * - loading: fetching summary from API
 * - error: summary fetch failed
 * - review: show summary with correct/wrong CTA
 * - submitting: finalizing session
 * - thankyou: auto-reset countdown
 *
 * TODO (Phase 11): Translate summary into patient language.
 * Currently shows English (translateToPatientLanguage is a stub).
 */
export function SummaryReviewScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const sessionId = useSessionStore((s) => s.sessionId);
  const audioEnabled = useSessionStore((s) => s.audioEnabled);
  const prevStep = useSessionStore((s) => s.prevStep);
  const resetSession = useSessionStore((s) => s.resetSession);
  const setStep = useSessionStore((s) => s.setStep);

  const dict = getDictionary(language);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "error" | "review" | "submitting" | "thankyou"
  >("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSummary = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      setErrorMsg(dict.errors.generic);
      setLoadState("error");
      return;
    }

    try {
      const res = await rpcClient.api.sessions[":id"].summary.$get({
        param: { id: sessionId },
      });

      if (!res.ok) {
        if (res.status === 404) {
          // No summary yet — auto-finalize to generate one
          await rpcClient.api.sessions[":id"].finalize.$post({
            param: { id: sessionId },
          });
          // Retry fetch
          const retryRes = await rpcClient.api.sessions[":id"].summary.$get({
            param: { id: sessionId },
          });
          if (!retryRes.ok) throw new Error("Summary not available");
          const retryData = await retryRes.json();
          if (!retryData.success) throw new Error("Summary unavailable");
          setSummary(retryData.data as Summary);
          setLoadState("review");
          return;
        }
        throw new Error("Failed to load summary");
      }

      const data = await res.json();
      if (!data.success) throw new Error("Summary response invalid");
      setSummary(data.data as Summary);
      setLoadState("review");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : dict.errors.generic;
      setErrorMsg(message);
      setLoadState("error");
      console.error("Summary fetch error:", err);
    }
  }, [sessionId, dict.errors.generic]);

  useEffect(() => {
    fetchSummary().catch((e: unknown) =>
      console.error("fetchSummary error:", e)
    );
  }, [fetchSummary]);

  // Auto-reset countdown when on thank-you screen
  useEffect(() => {
    if (loadState !== "thankyou") return;
    setCountdown(60);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          resetSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadState, resetSession]);

  const speakSummary = (): void => {
    if (!summary || !("speechSynthesis" in window)) return;
    const text = [
      `${dict.summary.title}.`,
      summary.chief_complaint,
      summary.hpi,
      summary.family_history,
    ].join(". ");
    const utterance = new SpeechSynthesisUtterance(text);
    const langCode =
      language === "hi" ? "hi-IN" : language === "ta" ? "ta-IN" : "en-IN";
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(langCode.split("-")[0]!));
    if (match) utterance.voice = match;
    utterance.lang = langCode;
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = (): void => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!sessionId) return;
    setLoadState("submitting");
    try {
      const res = await rpcClient.api.sessions[":id"].finalize.$post({
        param: { id: sessionId },
      });
      if (!res.ok) throw new Error("Finalize failed");
      setLoadState("thankyou");
    } catch (err: unknown) {
      console.error("Finalize error:", err);
      setErrorMsg(dict.errors.generic);
      setLoadState("error");
    }
  };

  const handleGoBack = (): void => {
    prevStep();
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loadState === "loading") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-xl text-muted-foreground">{dict.common.loading}</p>
      </main>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (loadState === "error") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <div className="flex items-start gap-3 p-6 rounded-2xl bg-destructive/10 border border-destructive/30 max-w-lg w-full">
          <AlertCircle className="w-8 h-8 text-destructive flex-shrink-0" />
          <div>
            <p className="text-xl font-semibold text-destructive">
              {language === "hi"
                ? "सारांश लोड नहीं हो सका"
                : language === "ta"
                  ? "சுருக்கத்தை ஏற்ற முடியவில்லை"
                  : "Could not load summary"}
            </p>
            <p className="text-base text-destructive/80 mt-1">{errorMsg}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setLoadState("loading");
            fetchSummary().catch((e: unknown) =>
              console.error("Retry error:", e)
            );
          }}
          className="kiosk-touch px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg"
        >
          {dict.errors.tryAgain}
        </button>
      </main>
    );
  }

  // ─── Thank you ────────────────────────────────────────────────────────────
  if (loadState === "thankyou") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-6">
        <CheckCircle2 className="w-24 h-24 text-primary" />
        <h1 className="text-4xl font-bold text-foreground">
          {dict.summary.thankYou}
        </h1>
        <p className="text-xl text-muted-foreground max-w-md">
          {dict.summary.doctorReview}
        </p>

        {sessionId && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <QrPlaceholder sessionId={sessionId} />
            <p className="text-base text-muted-foreground">
              {dict.summary.qrLabel}
            </p>
          </div>
        )}

        <p className="text-base text-muted-foreground mt-4">
          {language === "hi"
            ? `${countdown} सेकंड में रीसेट होगा...`
            : language === "ta"
              ? `${countdown} விநாடிகளில் மீட்டமைக்கப்படும்...`
              : `Resetting in ${countdown} seconds...`}
        </p>
        <button
          onClick={resetSession}
          className="kiosk-touch px-8 py-4 rounded-2xl bg-secondary text-foreground font-semibold text-lg"
        >
          {language === "hi"
            ? "अभी समाप्त करें"
            : language === "ta"
              ? "இப்போது முடிக்கவும்"
              : "Finish Now"}
        </button>
      </main>
    );
  }

  // ─── Submitting ───────────────────────────────────────────────────────────
  if (loadState === "submitting") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-xl text-muted-foreground">
          {language === "hi"
            ? "जमा किया जा रहा है..."
            : language === "ta"
              ? "சமர்ப்பிக்கப்படுகிறது..."
              : "Submitting..."}
        </p>
      </main>
    );
  }

  // ─── Review ───────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 flex flex-col items-center justify-start p-4 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-5 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {dict.summary.title}
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
              {dict.summary.subtitle}
            </p>
          </div>
          {/* TTS toggle */}
          {audioEnabled && (
            <button
              onClick={isSpeaking ? stopSpeaking : speakSummary}
              className="kiosk-touch flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-foreground font-medium"
              aria-label={isSpeaking ? "Stop reading" : "Read summary aloud"}
            >
              {isSpeaking ? (
                <VolumeX className="w-6 h-6" />
              ) : (
                <Volume2 className="w-6 h-6 text-primary" />
              )}
              <span className="text-sm">
                {isSpeaking
                  ? language === "hi"
                    ? "रोकें"
                    : language === "ta"
                      ? "நிறுத்து"
                      : "Stop"
                  : language === "hi"
                    ? "सुनें"
                    : language === "ta"
                      ? "கேளுங்கள்"
                      : "Listen"}
              </span>
            </button>
          )}
        </div>

        {/* Summary sections */}
        {summary && (
          <div className="flex flex-col gap-4">
            <SummaryCard
              title={
                language === "hi"
                  ? "मुख्य समस्या"
                  : language === "ta"
                    ? "முக்கிய பிரச்சனை"
                    : "Main Problem"
              }
              content={summary.chief_complaint}
            />
            <SummaryCard
              title={
                language === "hi"
                  ? "बीमारी का विवरण"
                  : language === "ta"
                    ? "நோயின் விவரம்"
                    : "Illness Description"
              }
              content={summary.hpi}
            />
            {summary.family_history && summary.family_history !== "None" && (
              <SummaryCard
                title={
                  language === "hi"
                    ? "परिवार का स्वास्थ्य"
                    : language === "ta"
                      ? "குடும்ப உடல்நலம்"
                      : "Family Health"
                }
                content={summary.family_history}
              />
            )}
            {summary.personal_history && summary.personal_history !== "None" && (
              <SummaryCard
                title={
                  language === "hi"
                    ? "व्यक्तिगत जानकारी"
                    : language === "ta"
                      ? "தனிப்பட்ட தகவல்"
                      : "Personal Details"
                }
                content={summary.personal_history}
              />
            )}
          </div>
        )}

        {/* TODO: Translation stub note (visible only in dev) */}
        <p className="text-xs text-muted-foreground text-center opacity-60">
          {language !== "en"
            ? "⚠ Summary translation (TODO Phase 11) — currently shown in English"
            : ""}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={() =>
              handleSubmit().catch((e: unknown) =>
                console.error("Submit error:", e)
              )
            }
            className="kiosk-touch w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-lg active:scale-[0.98]"
          >
            <CheckCircle2 className="w-7 h-7" />
            {dict.summary.correctButton}
          </button>

          <button
            onClick={handleGoBack}
            className="kiosk-touch w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl border-2 border-accent bg-accent/5 text-accent text-xl font-bold active:scale-[0.98]"
          >
            <XCircle className="w-7 h-7" />
            {dict.summary.wrongButton}
          </button>
        </div>
      </div>
    </main>
  );
}

// ─── Helper subcomponent ──────────────────────────────────────────────────────

function SummaryCard({
  title,
  content,
}: {
  title: string;
  content: string;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </p>
      <p className="text-lg text-foreground leading-relaxed">{content}</p>
    </div>
  );
}
