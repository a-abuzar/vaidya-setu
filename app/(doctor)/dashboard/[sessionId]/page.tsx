import { db } from "@/lib/db";
import { sessions, patients, conversations, summaries, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { mapSummaryToFHIR } from "@/lib/ai/abdm";
import { DoshaChart } from "@/components/doctor/DoshaChart";
import { SummaryEditor } from "@/components/doctor/SummaryEditor";
import { FhirPreview } from "@/components/doctor/FhirPreview";
import {
  AlertTriangle,
  User,
  Clock,
  FileText,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";

type SessionRow = InferSelectModel<typeof sessions>;
type PatientRow = InferSelectModel<typeof patients>;
type ConversationRow = InferSelectModel<typeof conversations>;
type SummaryRow = InferSelectModel<typeof summaries>;
type DocumentRow = InferSelectModel<typeof documents>;

function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const OCR_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  complete: "Complete",
  failed: "Failed",
};

const OCR_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  processing: "bg-amber-100 text-amber-700",
  complete: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

/**
 * Session detail page — physician view.
 * Server component fetching all session data in parallel.
 */
export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<React.ReactElement> {
  const { sessionId } = await params;

  let session: SessionRow | undefined;
  let patient: PatientRow | undefined;
  let conversation: ConversationRow | undefined;
  let summary: SummaryRow | undefined;
  let docs: DocumentRow[] = [];
  let fetchError: string | null = null;

  try {
    const [sessionRows, conversationRows, summaryRows, docRows] =
      await Promise.all([
        db
          .select({
            session: sessions,
            patient: patients,
          })
          .from(sessions)
          .leftJoin(patients, eq(sessions.patient_id, patients.id))
          .where(eq(sessions.id, sessionId))
          .limit(1),
        db
          .select()
          .from(conversations)
          .where(eq(conversations.session_id, sessionId))
          .limit(1),
        db
          .select()
          .from(summaries)
          .where(eq(summaries.session_id, sessionId))
          .limit(1),
        db
          .select()
          .from(documents)
          .where(eq(documents.session_id, sessionId)),
      ]);

    if (sessionRows.length === 0) notFound();

    session = sessionRows[0]!.session;
    patient = sessionRows[0]!.patient ?? undefined;
    conversation = conversationRows[0];
    summary = summaryRows[0];
    docs = docRows;
  } catch (err: unknown) {
    console.error("Session detail fetch error:", err);
    fetchError =
      err instanceof Error ? err.message : "Failed to load session data.";
  }

  if (!session && !fetchError) notFound();

  // Generate FHIR resource from summary (if available)
  const fhirResource =
    summary ? (mapSummaryToFHIR(summary) as Record<string, unknown>) : null;

  const redFlag = conversation?.red_flag ?? false;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Error */}
      {fetchError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 mb-8">
          <p className="font-semibold text-destructive">Failed to load session</p>
          <p className="text-sm text-destructive/80 mt-1">{fetchError}</p>
        </div>
      )}

      {session && (
        <>
          {/* Red-flag alert */}
          {redFlag && (
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-destructive/10 border border-destructive/30 mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-lg font-bold text-destructive">
                  ⚠ Red Flag Detected
                </p>
                {conversation?.red_flag_reason && (
                  <p className="text-sm text-destructive/80 mt-1">
                    {conversation.red_flag_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Patient & session meta */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-primary" />
                <p className="font-semibold text-foreground">Patient</p>
              </div>
              <p className="text-lg font-bold text-foreground">
                {patient?.full_name ?? "Anonymous"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {patient?.preferred_language?.toUpperCase()} ·{" "}
                {patient?.phone ?? "—"}
              </p>
              {patient?.abha_id && (
                <p className="text-xs text-primary mt-1">
                  ABHA: {patient.abha_id}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-primary" />
                <p className="font-semibold text-foreground">Session</p>
              </div>
              <p className="text-sm text-foreground">
                Started: {formatDateTime(session.started_at)}
              </p>
              {session.completed_at && (
                <p className="text-sm text-foreground mt-1">
                  Completed: {formatDateTime(session.completed_at)}
                </p>
              )}
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {session.status}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Summary */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Clinical Summary
              {summary?.physician_edited && (
                <span className="text-xs font-normal text-primary ml-2">
                  (Physician edited)
                </span>
              )}
            </h2>

            {summary ? (
              <SummaryEditor
                sessionId={sessionId}
                initialSummary={{
                  chief_complaint: summary.chief_complaint,
                  hpi: summary.hpi,
                  family_history: summary.family_history,
                  personal_history: summary.personal_history,
                }}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
                <p className="text-sm">No summary generated yet.</p>
                <p className="text-xs mt-1 opacity-70">
                  Summary is created when the patient completes and submits
                  their session.
                </p>
              </div>
            )}
          </section>

          {/* AYUSH / Dosha Assessment */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4">
              🌿 AYUSH Prakriti Assessment
            </h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <DoshaChart ayushAssessment={summary?.ayush_assessment ?? null} />
            </div>
          </section>

          {/* Documents */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Uploaded Documents ({docs.length})
            </h2>

            {docs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
                <p className="text-sm">No documents uploaded for this session.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
                  >
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {doc.doc_type.replace("_", " ").toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Uploaded: {formatDateTime(doc.uploaded_at)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        OCR_STATUS_COLORS[doc.ocr_status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      OCR: {OCR_STATUS_LABELS[doc.ocr_status] ?? doc.ocr_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* FHIR Preview */}
          {fhirResource && (
            <section className="mb-8">
              <h2 className="text-lg font-bold text-foreground mb-4">
                📋 FHIR R4 Export
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                ABDM push is not yet implemented (Phase 11 TODO).
                The FHIR resource below is generated locally for review.
              </p>
              <FhirPreview fhirResource={fhirResource} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
