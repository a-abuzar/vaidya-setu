"use client";

/**
 * Doctor dashboard — session queue.
 *
 * Lists all sessions in the database that are ready for physician
 * review. Each row shows the patient id (truncated), status,
 * red-flag indicator, and timestamp. Clicking a row opens the
 * per-session detail view (`/doctor/session/[id]`).
 *
 * Data is fetched client-side from the existing
 * /api/sessions list — which we additively expose as
 * /api/doctor/sessions. We deliberately avoid hitting the database
 * directly from this client component to keep module boundaries
 * intact (per docs/MODULE_CONTRACT.md).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Stethoscope,
  ArrowRight,
  FileText,
  Pill,
  FlaskConical,
  ScanLine,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoctorTopBar } from "@/app/(doctor)/components/DoctorTopBar";

interface SessionRow {
  id: string;
  patientId: string;
  status: "in_progress" | "awaiting_triage" | "completed" | "escalated";
  startedAt: string;
  completedAt: string | null;
  redFlag: boolean;
  documentCount: number;
  chiefComplaint: string;
}

export default function DoctorDashboardPage(): React.ReactElement {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/doctor/sessions", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as
        | { success: true; data: SessionRow[] }
        | { success: false; error: { message: string } };
      if (!payload.success) throw new Error(payload.error.message);
      setSessions(payload.data);
    } catch (err: unknown) {
      console.error("[doctor dashboard] fetch failed", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSessions();
  }, []);

  const review = sessions.filter((s) => s.status !== "in_progress");
  const inProgress = sessions.filter((s) => s.status === "in_progress");

  return (
    <>
      <DoctorTopBar active="dashboard" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Doctor Dashboard</h1>
            <p className="text-base text-muted-foreground">
              Sessions ready for AYUSH physician review.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => void fetchSessions()}
            className="gap-2"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<ClipboardList className="size-6" aria-hidden="true" />}
            label="Awaiting your review"
            value={String(review.length)}
            tone="primary"
          />
          <StatCard
            icon={<AlertTriangle className="size-6" aria-hidden="true" />}
            label="Red-flag alerts"
            value={String(sessions.filter((s) => s.redFlag).length)}
            tone="destructive"
          />
          <StatCard
            icon={<Loader2 className="size-6" aria-hidden="true" />}
            label="Currently at kiosk"
            value={String(inProgress.length)}
            tone="muted"
          />
        </section>

        {error ? (
          <Card className="border-destructive bg-destructive/5 p-6 text-destructive">
            {error}
          </Card>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Sessions</h2>
          {loading ? (
            <Card className="flex items-center gap-3 p-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              Loading sessions…
            </Card>
          ) : sessions.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              No sessions yet. As patients use the kiosk, their sessions appear here.
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {sessions.map((s) => (
                <li key={s.id}>
                  <SessionCard session={s} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "primary" | "destructive" | "muted";
}): React.ReactElement {
  return (
    <Card
      className={`flex items-center gap-4 p-5 ${
        tone === "destructive"
          ? "border-destructive/40 bg-destructive/5"
          : tone === "muted"
            ? "border-border bg-muted/30"
            : "border-primary/30 bg-primary/5"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-12 items-center justify-center rounded-2xl ${
          tone === "destructive"
            ? "bg-destructive text-destructive-foreground"
            : tone === "muted"
              ? "bg-foreground/10 text-foreground"
              : "bg-primary text-primary-foreground"
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-3xl font-extrabold tracking-tight">{value}</p>
      </div>
    </Card>
  );
}

function SessionCard({ session }: { session: SessionRow }): React.ReactElement {
  const dateLabel = new Date(session.startedAt).toLocaleString();
  return (
    <Card className="flex items-center justify-between gap-4 p-5">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
        >
          <Stethoscope className="size-6" />
        </span>
        <div>
          <p className="text-lg font-bold">
            {session.chiefComplaint || "No chief complaint recorded"}
          </p>
          <p className="text-sm text-muted-foreground">
            {session.patientId.slice(0, 8)} • {dateLabel} • {session.status.replace("_", " ")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {session.redFlag ? (
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
            {session.documentCount > 0 ? (
              <Badge variant="secondary" className="gap-1">
                <FileText className="size-3" aria-hidden="true" />
                {session.documentCount} document{session.documentCount > 1 ? "s" : ""}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
      <Link
        href={`/doctor/session/${session.id}`}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Review
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}