"use client";

/**
 * Per-session physician clinical review page.
 *
 * Designed specifically for doctor comfort and clinical clarity:
 *   - High-contrast clinical case sheet layout (CC, HPI, PMH, Drug/Allergies, ROS, Investigations)
 *   - Active tab navigation with clear visual highlighting and item counters
 *   - Quick-action clinical sign-off, inline summary editing, and ABDM FHIR export
 *   - Cross-navigation between Summary, Transcript, Documents, and AYUSH Dashavidha Pariksha
 *   - Strict TypeScript, zero `any`, fully compliant with clinical safety standards
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
  MessageSquare,
  Sparkles,
  Clock,
  Activity,
  UserCheck,
  ClipboardList,
  Files,
  AlertCircle,
  Calendar,
  ShieldCheck,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { Field, FieldLabel } from "@/components/ui/field";
import { DoctorTopBar } from "@/app/doctor/components/DoctorTopBar";
import { DoshaChart, type DoshaWeights } from "@/app/doctor/components/DoshaChart";
import { cn } from "@/lib/utils";
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

/** Render structured summary fields cleanly as clinical badges, grids, or bullet lists. */
function renderClinicalField(value: string | null | undefined): React.ReactNode {
  if (!value || value === "[]" || value === "{}" || value === "None") {
    return <span className="text-sm italic text-muted-foreground">None reported</span>;
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return <span className="text-sm italic text-muted-foreground">None reported</span>;
      return (
        <ul className="flex flex-col gap-1.5">
          {parsed.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{String(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (typeof parsed === "object" && parsed !== null) {
      const keys = Object.keys(parsed);
      if (keys.length === 0) return <span className="text-sm italic text-muted-foreground">None reported</span>;
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {keys.map((key) => (
            <div key={key} className="rounded-xl border border-border/80 bg-muted/20 p-2.5 text-xs">
              <p className="font-semibold uppercase tracking-wider text-muted-foreground">
                {key.replace(/([A-Z])/g, " $1")}
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{String(parsed[key])}</p>
            </div>
          ))}
        </div>
      );
    }
  } catch {
    // If not JSON, render as formatted text.
  }

  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{value}</p>;
}

export default function SessionDetailPage(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [editedChiefComplaint, setEditedChiefComplaint] = useState<string>("");
  const [editedHpi, setEditedHpi] = useState<string>("");
  const [pushing, setPushing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("summary");

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
      setEditedHpi(payload.data.summary.hpi);
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
  }, [sessionId]);

  const doshaWeights: DoshaWeights = useMemo(() => {
    if (!detail?.summary.ayush) {
      return { vata: 1, pitta: 1, kapha: 1 };
    }
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
      toast.success("Case approved and signed off successfully");
      await fetchDetail();
    } catch (err: unknown) {
      console.error("[doctor] approve failed", err);
      toast.error(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const onSaveEdit = async (): Promise<void> => {
    if (!detail) return;
    try {
      const res = await fetch(`/api/doctor/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint: editedChiefComplaint,
          hpi: editedHpi,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Clinical changes saved");
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
      toast.success(payload.data.ok ? "FHIR DiagnosticReport pushed to ABDM gateway" : "ABDM gateway unreachable");
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
        <DoctorTopBar active="session" sessionId={sessionId} />
        <main className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
          <span className="text-base font-medium">Loading clinical case record…</span>
        </main>
      </>
    );
  }

  if (error || !detail) {
    return (
      <>
        <DoctorTopBar active="session" sessionId={sessionId} />
        <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12">
          <Link
            href="/doctor/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to completed queue
          </Link>
          <Card className="border-destructive/40 bg-destructive/5 p-6 text-destructive">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">{error ?? "Session not found"}</p>
            </div>
          </Card>
        </main>
      </>
    );
  }

  const isUrgent = detail.redFlag || detail.status === "escalated";

  return (
    <>
      <DoctorTopBar active="session" sessionId={sessionId} />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">

        {/* Back navigation & Patient header */}
        <div className="flex flex-col gap-4">
          <Link
            href="/doctor/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to completed queue
          </Link>

          <header className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-border/70 bg-card p-6 shadow-xs sm:flex-row sm:items-center">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  Patient #{detail.patientId.slice(0, 8)}
                </span>
                <span aria-hidden="true" className="text-border">•</span>
                <Badge variant={detail.status === "completed" ? "success" : "secondary"} className="text-xs">
                  {detail.status === "completed" ? (
                    <CheckCheck className="mr-1 size-3" aria-hidden="true" />
                  ) : null}
                  {detail.status.replace("_", " ")}
                </Badge>
                {isUrgent ? (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    Red-flag Alert
                  </Badge>
                ) : null}
                <span aria-hidden="true" className="text-border">•</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {new Date(detail.startedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {detail.summary.chiefComplaint || "No chief complaint recorded"}
              </h1>
            </div>

            {/* Doctor Actions */}
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              {editing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setEditedChiefComplaint(detail.summary.chiefComplaint);
                      setEditedHpi(detail.summary.hpi);
                    }}
                    className="gap-2"
                  >
                    <X className="size-4" aria-hidden="true" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                    onClick={() => void onSaveEdit()}
                  >
                    <Save className="size-4" aria-hidden="true" />
                    Save changes
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="gap-2 shadow-xs"
                  >
                    <Edit3 className="size-4" aria-hidden="true" />
                    Edit case
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void onPushFhir()}
                    disabled={pushing || !detail.summary.id}
                    className="gap-2 shadow-xs"
                  >
                    {pushing ? (
                      <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                    ) : (
                      <Send className="size-4" aria-hidden="true" />
                    )}
                    Push FHIR / ABDM
                  </Button>
                  <Button
                    type="button"
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs font-semibold"
                    onClick={() => void onApprove()}
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Approve & Sign
                  </Button>
                </>
              )}
            </div>
          </header>
        </div>

        {/* Urgent Red Flag Alert Card */}
        {detail.redFlag && detail.redFlagReason ? (
          <Card className="flex items-start gap-3.5 border-destructive/40 bg-destructive/5 p-5 shadow-xs">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-destructive">
                Immediate Clinical Attention Required
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">{detail.redFlagReason}</p>
            </div>
          </Card>
        ) : null}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(String(val))}>
          <TabsList className="grid h-auto w-full max-w-2xl grid-cols-2 gap-1.5 rounded-2xl border border-border/80 bg-muted/60 p-1.5 sm:grid-cols-4">
            <TabsTab
              value="summary"
              className={cn(
                "py-2.5 text-xs sm:text-sm font-semibold gap-2 transition-all",
                activeTab === "summary" && "border-border/80 bg-card text-primary font-bold shadow-xs",
              )}
            >
              <FileText className="size-4" aria-hidden="true" />
              Summary
            </TabsTab>
            <TabsTab
              value="transcript"
              className={cn(
                "py-2.5 text-xs sm:text-sm font-semibold gap-2 transition-all",
                activeTab === "transcript" && "border-border/80 bg-card text-primary font-bold shadow-xs",
              )}
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              Transcript
              <span className="ml-1 rounded-full bg-muted-foreground/15 px-2 py-0.5 text-xs font-mono">
                {detail.transcript.length}
              </span>
            </TabsTab>
            <TabsTab
              value="documents"
              className={cn(
                "py-2.5 text-xs sm:text-sm font-semibold gap-2 transition-all",
                activeTab === "documents" && "border-border/80 bg-card text-primary font-bold shadow-xs",
              )}
            >
              <Files className="size-4" aria-hidden="true" />
              Documents
              {detail.documents.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs font-bold">
                  {detail.documents.length}
                </span>
              )}
            </TabsTab>
            <TabsTab
              value="ayush"
              className={cn(
                "py-2.5 text-xs sm:text-sm font-semibold gap-2 transition-all",
                activeTab === "ayush" && "border-border/80 bg-card text-primary font-bold shadow-xs",
              )}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              AYUSH
            </TabsTab>
          </TabsList>

          {/* TAB 1: SUMMARY CASE SHEET */}
          <TabsPanel value="summary">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left 2 Cols: Clinical Case Record */}
              <div className="flex flex-col gap-5 lg:col-span-2">
                {/* Chief Complaint */}
                <ClinicalSection
                  title="Chief Complaint (CC)"
                  icon={<Stethoscope className="size-4 text-primary" aria-hidden="true" />}
                >
                  {editing ? (
                    <Field>
                      <FieldLabel htmlFor="cc" className="text-xs font-medium text-muted-foreground">
                        Chief complaint
                      </FieldLabel>
                      <textarea
                        id="cc"
                        value={editedChiefComplaint}
                        onChange={(e) => setEditedChiefComplaint(e.target.value)}
                        className="min-h-20 w-full rounded-xl border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </Field>
                  ) : (
                    <p className="text-base font-bold text-foreground">
                      {detail.summary.chiefComplaint || "—"}
                    </p>
                  )}
                </ClinicalSection>

                {/* History of Present Illness */}
                <ClinicalSection
                  title="History of Present Illness (HPI)"
                  icon={<Clock className="size-4 text-primary" aria-hidden="true" />}
                >
                  {editing ? (
                    <Field>
                      <FieldLabel htmlFor="hpi" className="text-xs font-medium text-muted-foreground">
                        HPI narrative
                      </FieldLabel>
                      <textarea
                        id="hpi"
                        rows={6}
                        value={editedHpi}
                        onChange={(e) => setEditedHpi(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background p-3 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </Field>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {detail.summary.hpi || "—"}
                    </p>
                  )}
                </ClinicalSection>

                {/* Medical & Surgical History */}
                <ClinicalSection
                  title="Past Medical & Surgical History"
                  icon={<Activity className="size-4 text-primary" aria-hidden="true" />}
                >
                  {renderClinicalField(detail.summary.pastHistory)}
                </ClinicalSection>

                {/* Drug & Allergy Safety */}
                <ClinicalSection
                  title="Medications & Drug Allergies"
                  icon={<Pill className="size-4 text-primary" aria-hidden="true" />}
                >
                  {renderClinicalField(detail.summary.drugAllergyHistory)}
                </ClinicalSection>

                {/* Review of Systems */}
                <ClinicalSection
                  title="Review of Systems (ROS)"
                  icon={<ClipboardList className="size-4 text-primary" aria-hidden="true" />}
                >
                  {renderClinicalField(detail.summary.ros)}
                </ClinicalSection>

                {/* Personal & Family History */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <ClinicalSection
                    title="Personal History & Lifestyle"
                    icon={<UserCheck className="size-4 text-primary" aria-hidden="true" />}
                  >
                    {renderClinicalField(detail.summary.personalHistory)}
                  </ClinicalSection>

                  <ClinicalSection
                    title="Family Medical History"
                    icon={<Activity className="size-4 text-primary" aria-hidden="true" />}
                  >
                    {renderClinicalField(detail.summary.familyHistory)}
                  </ClinicalSection>
                </div>

                {/* Prior Investigations */}
                <ClinicalSection
                  title="Prior Investigations & Lab Findings"
                  icon={<FlaskConical className="size-4 text-primary" aria-hidden="true" />}
                >
                  {renderClinicalField(detail.summary.priorInvestigations)}
                </ClinicalSection>
              </div>

              {/* Right Col: Clinical Decision Support & Audit Sidebar */}
              <div className="flex flex-col gap-5">
                {/* Audit status card */}
                <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Case Finalization Status
                    </h3>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm font-semibold text-foreground">
                      {detail.summary.id
                        ? detail.summary.finalizedAt
                          ? "Finalized & Signed"
                          : "Generated, Awaiting Review"
                        : "Not yet generated"}
                    </p>
                    {detail.summary.finalizedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(detail.summary.finalizedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                    {detail.summary.physicianEdited && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Physician edited
                      </Badge>
                    )}
                  </div>
                </Card>

                {/* AYUSH Dosha Quick Card */}
                <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" aria-hidden="true" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        AYUSH Dosha Profile
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("ayush")}
                      className="text-xs font-semibold text-primary p-0 h-auto hover:bg-transparent hover:underline"
                    >
                      Details →
                    </Button>
                  </div>

                  <div className="mt-4 aspect-[5/4] w-full">
                    <DoshaChart weights={doshaWeights} />
                  </div>

                  {detail.summary.ayush?.prakriti && (
                    <div className="mt-3 rounded-xl bg-muted/40 p-2.5 text-xs">
                      <span className="font-semibold text-muted-foreground">Prakriti: </span>
                      <span className="font-medium text-foreground">{detail.summary.ayush.prakriti}</span>
                    </div>
                  )}
                </Card>

                {/* Quick tab switcher links */}
                <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Encounter Artifacts
                  </h3>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("transcript")}
                      className="justify-between text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        Audio Transcript
                      </span>
                      <span className="font-mono font-semibold">{detail.transcript.length} turns</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("documents")}
                      className="justify-between text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <Files className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        Uploaded Documents
                      </span>
                      <span className="font-mono font-semibold">{detail.documents.length} files</span>
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsPanel>

          {/* TAB 2: TRANSCRIPT */}
          <TabsPanel value="transcript">
            <Card className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">Kiosk Voice Consultation Transcript</h2>
                  <p className="text-xs text-muted-foreground">Complete transcript recorded and transcribed during patient intake</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {detail.transcript.length} exchanges
                </Badge>
              </div>

              {detail.transcript.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No transcript recorded for this session.</p>
              ) : (
                <ol className="flex flex-col gap-3.5 pt-2">
                  {detail.transcript.map((t, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex gap-3",
                        t.role === "patient" ? "justify-end" : "justify-start",
                      )}
                    >
                      {t.role === "system" ? (
                        <span
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs"
                        >
                          <Stethoscope className="size-4" />
                        </span>
                      ) : null}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-xs",
                          t.role === "patient"
                            ? "bg-primary text-primary-foreground"
                            : "border border-border/80 bg-muted/30 text-foreground",
                        )}
                      >
                        <p className="leading-relaxed">{t.text}</p>
                        <p className={cn("mt-1.5 text-right font-mono text-[10px]", t.role === "patient" ? "text-primary-foreground/75" : "text-muted-foreground")}>
                          {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </TabsPanel>

          {/* TAB 3: DOCUMENTS */}
          <TabsPanel value="documents">
            <Card className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">Uploaded Clinical Documents</h2>
                  <p className="text-xs text-muted-foreground">Prescriptions, lab reports, and imaging scans uploaded at kiosk</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {detail.documents.length} uploaded
                </Badge>
              </div>

              {detail.documents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded during this session.</p>
              ) : (
                <ul className="flex flex-col gap-3 pt-2">
                  {detail.documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-background p-4 shadow-xs"
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          aria-hidden="true"
                          className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs"
                        >
                          {DOC_TYPE_ICON[d.docType]}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-foreground">{DOC_TYPE_LABEL[d.docType]}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(d.uploadedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                      </div>
                      <Badge variant={d.ocrStatus === "complete" ? "success" : "outline"} className="text-xs capitalize">
                        {d.ocrStatus}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsPanel>

          {/* TAB 4: AYUSH DASHAVIDHA PARIKSHA */}
          <TabsPanel value="ayush">
            <Card className="grid grid-cols-1 gap-6 rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:grid-cols-2">
              <div>
                <h2 className="text-base font-bold text-foreground">Dashavidha Pariksha Clinical Factors</h2>
                <p className="mb-4 text-xs text-muted-foreground">Ayurvedic constitutional and morbidity assessment extracted from interview</p>

                <ul className="flex flex-col gap-2.5">
                  {Object.entries(detail.summary.ayush ?? {}).map(([key, value]) => (
                    <li key={key} className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-muted/20 p-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {key.replace(/([A-Z])/g, " $1")}
                      </span>
                      <span className="text-right text-sm font-semibold text-foreground">{value ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-5">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Tridosha Balance Radar</h3>
                  <p className="text-xs text-muted-foreground">Normalized assessment of Vata, Pitta, and Kapha representation</p>
                </div>
                <div className="my-auto aspect-[5/4] w-full p-2">
                  <DoshaChart weights={doshaWeights} />
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  Final diagnostic assessment and Panchakarma/Shamana recommendation rests with the consulting Vaidya.
                </p>
              </div>
            </Card>
          </TabsPanel>
        </Tabs>
      </main>
    </>
  );
}

function ClinicalSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="mb-3 flex items-center gap-2 border-b border-border/60 pb-2.5">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </Card>
  );
}