"use client";

/**
 * Patient-facing summary review screen.
 *
 * Renders the readback of the captured encounter:
 *   - Chief complaint (last patient utterance)
 *   - Patient answers (the transcript entries they gave)
 *   - Documents uploaded (count + types)
 *   - Red-flag status if any
 *
 * The patient has two explicit decisions:
 *   - "This is correct" → finalize the session via the existing
 *     /api/sessions/:id/finalize endpoint
 *   - "Something's wrong" → returns to the encounter screen so they
 *     can add a correction.
 *
 * Finalization requires an explicit confirmation step. The kiosk
 * then surfaces a thank-you and a 4-character take-away code
 * derived from the session UUID, which the patient can quote to
 * the doctor if needed.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Volume2,
  AlertTriangle,
  ArrowLeft,
  Printer,
  QrCode,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Modal } from "@/components/ui/modal";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { useKioskUi } from "@/lib/store/kiosk-ui";
import { useSessionStore } from "@/lib/store/session";
import { useSpeech } from "@/components/kiosk/useSpeech";
import { rpcClient } from "@/lib/api-client";
import { t } from "@/lib/i18n/dict";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SummaryRecord {
  id: string;
  sessionId: string;
  chiefComplaint: string;
  patientAnswers: string[];
  documentCount: number;
  redFlag: boolean;
  redFlagReason: string | null;
  finalizedAt: string | null;
  takeAwayCode: string;
}

export default function SummaryPage(): React.ReactElement {
  const router = useRouter();
  const language = useKioskUi((s) => s.language);
  const sessionId = useSessionStore((s) => s.sessionId);
  const transcript = useSessionStore((s) => s.transcript);
  const uploadedDocumentIds = useSessionStore((s) => s.uploadedDocumentIds);
  const redFlagDetected = useSessionStore((s) => s.redFlagDetected);
  const redFlagReason = useSessionStore((s) => s.redFlagReason);
  const resetSession = useSessionStore((s) => s.resetSession);
  const { speak, cancel } = useSpeech();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<SummaryRecord | null>(null);

  useEffect(() => {
    if (sessionId === null) {
      router.replace("/encounter");
    }
  }, [sessionId, router]);

  const chiefComplaint = useMemo(() => {
    const patientTurns = transcript.filter((t) => t.role === "patient");
    return patientTurns[0]?.text ?? "";
  }, [transcript]);

  const patientAnswers = useMemo(
    () => transcript.filter((t) => t.role === "patient").map((t) => t.text),
    [transcript],
  );

  const readAloud = (): void => {
    const lines: string[] = [];
    if (chiefComplaint) lines.push(t(language, "summary.chiefComplaint") + ": " + chiefComplaint);
    lines.push(t(language, "summary.history") + ": " + patientAnswers.join(". "));
    if (uploadedDocumentIds.length > 0) {
      lines.push(
        t(language, "summary.documents") + ": " + String(uploadedDocumentIds.length),
      );
    }
    if (redFlagDetected && redFlagReason) {
      lines.push(t(language, "summary.redFlag") + ": " + redFlagReason);
    }
    speak(lines.join(". "));
  };

  useEffect(() => () => cancel(), [cancel]);

  if (summary) {
    return (
      <KioskShell step="summary">
        <section className="flex flex-col items-center gap-4 rounded-2xl border-2 border-success bg-success/5 p-8 text-center shadow-sm">
          <CheckCircle2 className="size-16 text-success" aria-hidden="true" />
          <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            {t(language, "summary.thanks")}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t(language, "summary.subheading")}
          </p>
          <Separator />
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t(language, "summary.takenAway")}
            </p>
            <p className="font-mono text-4xl font-extrabold tracking-widest text-foreground">
              {summary.takeAwayCode}
            </p>
            <TakeAwayQr value={summary.takeAwayCode} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12 rounded-xl px-4 text-sm"
            onClick={() => {
              resetSession();
              router.push("/");
            }}
          >
            {t(language, "nav.home")}
          </Button>
        </section>
      </KioskShell>
    );
  }

  const onFinalize = async (): Promise<void> => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      const res = await rpcClient.api.sessions[":id"].finalize.$post({
        param: { id: sessionId },
      });
      if (!res.ok) throw new Error(`Finalize HTTP ${res.status}`);
      const payload = (await res.json()) as
        | { success: true; data: unknown }
        | { success: false; error: { message: string } };
      if (!payload.success) throw new Error(payload.error.message);
      const code = sessionId.replace(/-/g, "").slice(-4).toUpperCase();
      setSummary({
        id: typeof (payload.data as { id?: unknown })?.id === "string"
          ? ((payload.data as { id: string }).id)
          : sessionId,
        sessionId,
        chiefComplaint,
        patientAnswers,
        documentCount: uploadedDocumentIds.length,
        redFlag: redFlagDetected,
        redFlagReason,
        finalizedAt: new Date().toISOString(),
        takeAwayCode: code,
      });
      toast.success(t(language, "summary.thanks"));
    } catch (err: unknown) {
      console.error("[summary] finalize failed", err);
      toast.error(t(language, "error.network"));
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <KioskShell step="summary">
      <header className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          {t(language, "summary.heading")}
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          {t(language, "summary.subheading")}
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{t(language, "summary.chiefComplaint")}</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 gap-2 rounded-xl px-3 text-sm font-semibold"
            onClick={readAloud}
          >
            <Volume2 className="size-4" aria-hidden="true" />
            {t(language, "summary.readAloud")}
          </Button>
        </div>
        {chiefComplaint ? (
          <p className="rounded-xl bg-secondary/30 p-3 text-lg font-semibold leading-relaxed">
            {chiefComplaint}
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            —
          </p>
        )}
      </section>

      {redFlagDetected ? (
        <section
          role="alert"
          className="flex items-start gap-3 rounded-2xl border-2 border-destructive bg-destructive/5 p-4 shadow-sm"
        >
          <AlertTriangle className="size-6 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-destructive">
              {t(language, "summary.redFlag")}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {redFlagReason ?? "—"}
            </p>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-bold">{t(language, "summary.history")}</h2>
        {patientAnswers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            —
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {patientAnswers.map((ans, i) => (
              <li
                key={i}
                className="rounded-xl border border-border bg-background p-2.5 text-base leading-relaxed"
              >
                {ans}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-bold">{t(language, "summary.documents")}</h2>
        <p className="text-lg font-semibold text-foreground">
          {String(uploadedDocumentIds.length)}
        </p>
      </section>

      <Separator />

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-10 rounded-xl px-4 text-sm"
          onClick={() => router.push("/encounter")}
        >
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          {t(language, "summary.fix")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-10 rounded-xl px-4 text-sm"
          onClick={() => window.print()}
        >
          <Printer className="mr-2 size-4" aria-hidden="true" />
          {t(language, "summary.print")}
        </Button>
        <Button
          type="button"
          size="lg"
          className="min-h-12 rounded-xl px-8 text-base font-bold shadow-sm"
          onClick={() => setConfirmOpen(true)}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {t(language, "summary.finalizing")}
            </>
          ) : (
            t(language, "summary.finalize")
          )}
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t(language, "summary.confirmFinalize.heading")}
        description={t(language, "summary.confirmFinalize.body")}
      >
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-10 rounded-xl px-4 text-sm"
            disabled={submitting}
            onClick={() => setConfirmOpen(false)}
          >
            {t(language, "summary.confirmFinalize.cancel")}
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-h-12 rounded-xl px-6 text-base font-bold shadow-sm"
            onClick={() => void onFinalize()}
            disabled={submitting}
          >
            {t(language, "summary.confirmFinalize.confirm")}
          </Button>
        </div>
      </Modal>
    </KioskShell>
  );
}

/**
 * Minimal in-browser QR representation. Renders a deterministic 25x25
 * dot grid based on the input string so the patient has a scannable
 * artifact to take away. This is intentionally NOT a real QR code
 * (the kiosk cannot depend on a QR-generation library offline). A real
 * implementation would swap in a true QR via the `qrcode` package;
 * the screen contract is stable so that swap is a localized change.
 */
function TakeAwayQr({ value }: { value: string }): React.ReactElement {
  const cells = useMemo(() => {
    const grid: boolean[][] = [];
    let seed = 0;
    for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
    for (let r = 0; r < 25; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < 25; c++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        row.push((seed & 0xff) > 110);
      }
      grid.push(row);
    }
    return grid;
  }, [value]);

  return (
    <div
      role="img"
      aria-label={`QR placeholder for ${value}`}
      className={cn("rounded-xl border-2 border-border p-2")}
    >
      <div className="grid grid-cols-[repeat(25,minmax(0,1fr))] gap-0">
        {cells.flatMap((row, r) =>
          row.map((on, c) => (
            <span
              key={`${r}-${c}`}
              className={cn("aspect-square", on ? "bg-foreground" : "bg-background")}
            />
          )),
        )}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <QrCode className="size-4" aria-hidden="true" />
        Take-away code
      </div>
    </div>
  );
}