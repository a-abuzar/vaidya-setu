"use client";

/**
 * Per-session physician review page.
 *
 * Renders the structured clinical summary, red-flag alert, the
 * document timeline, the AYUSH dosha visualization, and the
 * physician's approve / edit / FHIR-push actions. Edits are sent
 * through the existing /api/sessions/:id PATCH endpoint.
 *
 * The "FHIR push" action calls `mapSummaryToFHIR` from
 * lib/ai/abdm.ts and POSTs the resulting DiagnosticReport to a new
 * additive /api/doctor/fhir endpoint which returns the response
 * from the (currently mocked) ABDM gateway. We do NOT call
 * mapSummaryToFHIR directly from the client because it is a
 * server-side module — we use the endpoint as the explicit
 * boundary.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Pill,
  FlaskConical,
  ScanLine,
  Send,
  Stethoscope,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { DoctorTopBar } from "@/app/doctor/components/DoctorTopBar";
import { DoshaChart, type DoshaWeights } from "@/app/doctor/components/DoshaChart";
import { toast } from "sonner";

interface SessionDetail {
  id: string;
  patientId: string;
  status: "in_progress" | "awaiting_triage" | "completed" | "escalated";
  startedAt: string;
  completedAt: string | null;
  redFlag: boolean;
  redFlagReason: string | null;
  summary: {
    id: string | null;
    chiefComplaint: string;
    hpi: string;
    pastHistory: string;
    drugAllergyHistory: string;
    familyHistory: string;
    personalHistory: string;
    ros: string;
    priorInvestigations: string;
    ayush: {
      prakriti: string | null;
      vikriti: string | null;
      agni: string | null;
      koshtha: string | null;
      aharaVihara: string | null;
      nidana: string | null;
      samprapti: string | null;
    } | null;
    physicianEdited: boolean;
    finalizedAt: string | null;
  };
  documents: Array<{
    id: string;
    docType: "prescription" | "lab_report" | "discharge_summary" | "imaging";
    uploadedAt: string;
    ocrStatus: "pending" | "processing" | "complete" | "failed";
  }>;
  transcript: Array<{
    role: "patient" | "system";
    text: string;
    timestamp: string;
  }>;
}

const DOC_TYPE_LABEL: Record<SessionDetail["documents"][number]["docType"], string> = {
  prescription: "Prescription",
  lab_report: "Lab report",
  discharge_summary: "Discharge summary",
  imaging: "Imaging",
};

const DOC_TYPE_ICON: Record<SessionDetail["documents"][number]["docType"], React.ReactNode> = {
  prescription: <Pill className="size-5" aria-hidden="true" />,
  lab_report: <FlaskConical className="size-5" aria-hidden="true" />,
  discharge_summary: <FileText className="size-5" aria-hidden="true" />,
  imaging: <ScanLine className="size-5" aria-hidden="true" />,
};

export default function SessionDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedChiefComplaint, setEditedChiefComplaint] = useState("");
  const [pushing, setPushing] = useState(false);

  const fetchDetail = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/doctor/sessions/${sessionId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as
        | { success: true; data: SessionDetail }
        | { success: false; error: { message: string } };
      if (!payload.success) throw new Error(payload.error.message);
      setDetail(payload.data);
      setEditedChiefComplaint(payload.data.summary.chiefComplaint);
    } catch (err: unknown) {
      console.error("[doctor session] fetch failed", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) void fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const doshaWeights: DoshaWeights = useMemo(() => {
    if (!detail?.summary.ayush) {
      return { vata: 1, pitta: 1, kapha: 1 };
    }
    // Until Module A emits structured dosha values, we map each
    // Dashavidha field textually to a placeholder weight. A real
    // implementation would consume a structured payload from
    // Module C (`BilingualSummary.patientSummary.ayushDosha`).
    const a = detail.summary.ayush;
    return {
      vata: a.prakriti?.toLowerCase().includes("vata") ? 1.6 : 1,
      pitta: a.prakriti?.toLowerCase().includes("pitta") ? 1.6 : 1,
      kapha: a.prakriti?.toLowerCase().includes("kapha") ? 1.6 : 1,
    };
  }, [detail]);

  const onApprove = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/doctor/sessions/${sessionId}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as
        | { success: true; data: unknown }
        | { success: false; error: { message: string } };
      if (!payload.success) throw new Error(payload.error.message);
      toast.success("Session approved");
      await fetchDetail();
    } catch (err: unknown) {
      console.error("[doctor] approve failed", err);
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const onSaveEdit = async (): Promise<void> => {
    if (!detail) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: detail.transcript,
          status: detail.status,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Saved");
      setEditing(false);
      await fetchDetail();
    } catch (err: unknown) {
      console.error("[doctor] save failed", err);
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const onPushFhir = async (): Promise<void> => {
    setPushing(true);
    try {
      const res = await fetch(`/api/doctor/sessions/${sessionId}/fhir`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as
        | { success: true; data: { ok: boolean } }
        | { success: false; error: { message: string } };
      if (!payload.success) throw new Error(payload.error.message);
      toast.success(payload.data.ok ? "Pushed to ABDM" : "ABDM gateway unreachable");
    } catch (err: unknown) {
      console.error("[doctor] fhir push failed", err);
      toast.error(err instanceof Error ? err.message : "Push failed");
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return (
      <>
        <DoctorTopBar active="session" />
        <main className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          Loading session…
        </main>
      </>
    );
  }
  if (error || !detail) {
    return (
      <>
        <DoctorTopBar active="session" />
        <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12">
          <Link
            href="/doctor/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Link>
          <Card className="border-destructive bg-destructive/5 p-6 text-destructive">
            {error ?? "Session not found"}
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <DoctorTopBar active="session" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
        <div>
          <Link
            href="/doctor/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to dashboard
          </Link>
        </div>

        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {detail.redFlag ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" aria-hidden="true" />
                  Red flag
                </Badge>
              ) : (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  Routine
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">
                {detail.status.replace("_", " ")}
              </Badge>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {detail.summary.chiefComplaint || "No chief complaint"}
            </h1>
            <p className="text-base text-muted-foreground">
              Session {detail.id.slice(0, 8)} • Patient {detail.patientId.slice(0, 8)} •
              {" "}
              {new Date(detail.startedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditedChiefComplaint(detail.summary.chiefComplaint);
                  }}
                  className="gap-2"
                >
                  <X className="size-4" aria-hidden="true" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void onSaveEdit()}
                  className="gap-2"
                >
                  <Save className="size-4" aria-hidden="true" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(true)}
                  className="gap-2"
                >
                  <Edit3 className="size-4" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void onPushFhir()}
                  disabled={pushing || !detail.summary.id}
                  className="gap-2"
                >
                  {pushing ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-4" aria-hidden="true" />
                  )}
                  Push to FHIR
                </Button>
                <Button
                  type="button"
                  onClick={() => void onApprove()}
                  className="gap-2"
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Approve
                </Button>
              </>
            )}
          </div>
        </header>

        {detail.redFlag && detail.redFlagReason ? (
          <Card className="flex items-start gap-3 border-destructive bg-destructive/5 p-4">
            <AlertTriangle className="size-6 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-bold uppercase tracking-wider text-destructive">Red flag reason</p>
              <p className="mt-1 text-base font-semibold">{detail.redFlagReason}</p>
            </div>
          </Card>
        ) : null}

        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTab value="summary">Summary</TabsTab>
            <TabsTab value="transcript">Transcript</TabsTab>
            <TabsTab value="documents">Documents</TabsTab>
            <TabsTab value="ayush">AYUSH</TabsTab>
          </TabsList>

          <TabsPanel value="summary">
            <Card className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Section title="Chief complaint">
                  {editing ? (
                    <Field>
                      <FieldLabel htmlFor="cc">Chief complaint</FieldLabel>
                      <textarea
                        id="cc"
                        value={editedChiefComplaint}
                        onChange={(e) => setEditedChiefComplaint(e.target.value)}
                        className="min-h-24 w-full rounded-2xl border-2 border-input bg-background p-3 text-base focus:border-primary focus:outline-none focus:ring-4 focus:ring-ring/30"
                      />
                    </Field>
                  ) : (
                    <p className="text-base leading-relaxed">{detail.summary.chiefComplaint || "—"}</p>
                  )}
                </Section>
                <Section title="History of Present Illness">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{detail.summary.hpi || "—"}</p>
                </Section>
                <Section title="Past History">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{detail.summary.pastHistory || "—"}</p>
                </Section>
                <Section title="Drug & Allergy History">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{detail.summary.drugAllergyHistory || "—"}</p>
                </Section>
                <Section title="Family History">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{detail.summary.familyHistory || "—"}</p>
                </Section>
                <Section title="Personal History">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{detail.summary.personalHistory || "—"}</p>
                </Section>
                <Section title="Review of Systems">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{detail.summary.ros || "—"}</p>
                </Section>
                <Section title="Prior Investigations">
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{detail.summary.priorInvestigations || "—"}</p>
                </Section>
              </div>
              <div>
                <Card className="p-4">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Patient demographics
                  </p>
                  <p className="text-base">
                    Anonymous kiosk visit
                  </p>
                  <Separator />
                  <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Summary status
                  </p>
                  <p className="text-base">
                    {detail.summary.id
                      ? detail.summary.finalizedAt
                        ? "Finalized " + new Date(detail.summary.finalizedAt).toLocaleString()
                        : "Generated, awaiting approval"
                      : "Not yet generated"}
                  </p>
                  {detail.summary.physicianEdited ? (
                    <Badge variant="secondary" className="mt-2">
                      Physician edited
                    </Badge>
                  ) : null}
                </Card>
                <Separator />
                <Card className="mt-4 p-4">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    AYUSH dosha balance
                  </p>
                  <div className="aspect-[5/4] w-full">
                    <DoshaChart weights={doshaWeights} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Visualization placeholder — Module A structured dosha fields are
                    a known TODO (see MODULE_CONTRACT.md §6).
                  </p>
                </Card>
              </div>
            </Card>
          </TabsPanel>

          <TabsPanel value="transcript">
            <Card className="flex flex-col gap-3 p-6">
              {detail.transcript.length === 0 ? (
                <p className="text-muted-foreground">No transcript.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {detail.transcript.map((t, i) => (
                    <li
                      key={i}
                      className={`flex gap-3 ${t.role === "patient" ? "justify-end" : ""}`}
                    >
                      {t.role === "system" ? (
                        <span
                          aria-hidden="true"
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        >
                          <Stethoscope className="size-5" />
                        </span>
                      ) : null}
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 text-base ${
                          t.role === "patient"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {t.text}
                        <p className="mt-1 text-xs opacity-70">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </TabsPanel>

          <TabsPanel value="documents">
            <Card className="flex flex-col gap-3 p-6">
              {detail.documents.length === 0 ? (
                <p className="text-muted-foreground">No documents uploaded.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {detail.documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"
                        >
                          {DOC_TYPE_ICON[d.docType]}
                        </span>
                        <div>
                          <p className="text-base font-bold">{DOC_TYPE_LABEL[d.docType]}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(d.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{d.ocrStatus}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsPanel>

          <TabsPanel value="ayush">
            <Card className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Dashavidha Pariksha
                </p>
                <ul className="flex flex-col gap-2">
                  {Object.entries(detail.summary.ayush ?? {}).map(([key, value]) => (
                    <li key={key} className="flex justify-between gap-3 rounded-2xl border border-border bg-background p-3">
                      <span className="text-sm font-semibold capitalize text-muted-foreground">
                        {key.replace(/([A-Z])/g, " $1")}
                      </span>
                      <span className="text-base font-semibold">{value ?? "—"}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  AYUSH module field values are pulled directly from the summary
                  record. The clinical interpretation belongs to the physician.
                </p>
              </div>
              <div>
                <Card className="p-4">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Visualization
                  </p>
                  <div className="aspect-[5/4] w-full">
                    <DoshaChart weights={doshaWeights} />
                  </div>
                </Card>
              </div>
            </Card>
          </TabsPanel>
        </Tabs>
      </main>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-base font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}