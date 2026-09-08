"use client";

/**
 * Doctor dashboard — unified session queue.
 *
 * Changes from original:
 *   - Single unified list (not two separate Awaiting/In-Progress sections)
 *   - Red-flag + escalated sessions automatically sort to the top
 *   - Client-side search/filter on chief complaint and patient ID
 *   - Removed duplicate "Routine" badge — status shown once per row
 *   - Stat card colors use the 5-stop brand palette
 *
 * Data is fetched client-side from /api/doctor/sessions.
 * No new API calls or dependencies added.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Stethoscope,
  ArrowRight,
  FileText,
  ClipboardList,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoctorTopBar } from "@/app/doctor/components/DoctorTopBar";

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

/** Sort so escalated + red-flag sessions bubble up first, then by time. */
function sortSessions(sessions: SessionRow[]): SessionRow[] {
  return [...sessions].sort((a, b) => {
    const aUrgent = a.redFlag || a.status === "escalated" ? 0 : 1;
    const bUrgent = b.redFlag || b.status === "escalated" ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    // Within same urgency group, newest first
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });
}

const STATUS_LABEL: Record<SessionRow["status"], string> = {
  in_progress: "At kiosk",
  awaiting_triage: "Awaiting review",
  completed: "Completed",
  escalated: "Escalated",
};

const STATUS_VARIANT: Record<
  SessionRow["status"],
  "default" | "secondary" | "success" | "destructive" | "outline"
> = {
  in_progress: "secondary",
  awaiting_triage: "default",
  completed: "success",
  escalated: "destructive",
};

export default function DoctorDashboardPage(): React.ReactElement {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchSessions = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/doctor/sessions", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as
        | { success: true; data: SessionRow[] }
        | { success: false; error: { message: string } }
        | null;
      if (!res.ok || !payload) {
        throw new Error(payload && !payload.success ? payload.error.message : `HTTP ${res.status}`);
      }
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

  const filtered = useMemo(() => {
    const sorted = sortSessions(sessions);
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (s) =>
        s.chiefComplaint.toLowerCase().includes(q) ||
        s.patientId.toLowerCase().includes(q),
    );
  }, [sessions, query]);

  const statsAwaitingReview = sessions.filter((s) => s.status !== "in_progress").length;
  const statsRedFlags = sessions.filter((s) => s.redFlag).length;
  const statsAtKiosk = sessions.filter((s) => s.status === "in_progress").length;

  return (
    <>
      <DoctorTopBar active="dashboard" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">

        {/* Page header */}
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Patient Queue</h1>
            <p className="text-sm text-muted-foreground">
              Sessions ready for physician review — red flags sorted first.
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

        {/* Stat cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Summary statistics">
          <StatCard
            icon={<ClipboardList className="size-5" aria-hidden="true" />}
            label="Awaiting review"
            value={String(statsAwaitingReview)}
            tone="primary"
          />
          <StatCard
            icon={<AlertTriangle className="size-5" aria-hidden="true" />}
            label="Red-flag alerts"
            value={String(statsRedFlags)}
            tone="destructive"
          />
          <StatCard
            icon={<Clock className="size-5" aria-hidden="true" />}
            label="Currently at kiosk"
            value={String(statsAtKiosk)}
            tone="muted"
          />
        </section>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by complaint or patient ID…"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm focus:border-[var(--primary-mid)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
            aria-label="Search sessions"
          />
        </div>

        {/* Error */}
        {error ? (
          <Card className="border-destructive bg-destructive/5 p-6 text-destructive">
            {error}
          </Card>
        ) : null}

        {/* Session list */}
        <section aria-label="Session list">
          {loading ? (
            <Card className="flex items-center gap-3 p-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              Loading sessions…
            </Card>
          ) : sessions.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              No sessions yet. Patients will appear here after completing the kiosk flow.
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No sessions match &ldquo;{query}&rdquo;.
            </Card>
          ) : (
            <ul className="flex flex-col gap-3" role="list">
              {filtered.map((s) => (
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
            : "border-[var(--primary-light)] bg-[var(--primary-xlight)]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-10 items-center justify-center rounded-xl ${
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
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-extrabold tracking-tight">{value}</p>
      </div>
    </Card>
  );
}

function SessionCard({ session }: { session: SessionRow }): React.ReactElement {
  const dateLabel = new Date(session.startedAt).toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const isUrgent = session.redFlag || session.status === "escalated";

  return (
    <Card
      className={`flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-md ${
        isUrgent ? "border-destructive/50 bg-destructive/5" : ""
      } ${session.status === "in_progress" ? "opacity-75" : ""}`}
    >
      {/* Left: identity + meta */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          aria-hidden="true"
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
            isUrgent ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
          }`}
        >
          {isUrgent ? (
            <AlertTriangle className="size-5" />
          ) : (
            <Stethoscope className="size-5" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-snug">
            {session.chiefComplaint || "No chief complaint recorded"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {session.patientId.slice(0, 8)} · {dateLabel}
            </span>
            {/* Single status badge — no duplication */}
            <Badge variant={STATUS_VARIANT[session.status]} className="text-xs">
              {isUrgent && <AlertTriangle className="mr-1 size-3" aria-hidden="true" />}
              {STATUS_LABEL[session.status]}
            </Badge>
            {session.documentCount > 0 ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <FileText className="size-3" aria-hidden="true" />
                {session.documentCount} doc{session.documentCount > 1 ? "s" : ""}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {/* Action */}
      {session.status !== "in_progress" ? (
        <Link
          href={`/doctor/session/${session.id}`}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-mid)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Review
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          In progress
        </span>
      )}
    </Card>
  );
}