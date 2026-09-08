"use client";

/**
 * Doctor dashboard — completed patient review queue.
 *
 * Displays only sessions with status === "completed" (finalized kiosk encounters).
 * In-progress / unfinalized sessions are hidden from the review list.
 *
 * Features:
 *   - Dedicated completed session queue with urgency-first sorting (red flags bubbled to top)
 *   - Clean, modern session card UI with clear patient ID, intake duration, timestamps, and badges
 *   - Client-side search on chief complaint and patient ID across completed sessions
 *   - Clinical summary statistics (completed reviews, red flags, active kiosk intakes)
 *   - High accessibility standards, strict TypeScript typing, and zero `any`
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ArrowRight,
  FileText,
  Search,
  User,
  Calendar,
  Timer,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoctorTopBar } from "@/app/doctor/components/DoctorTopBar";
import { cn } from "@/lib/utils";
import {
  type SessionRow,
  formatDate,
  formatDuration,
  sortCompletedSessions,
} from "@/lib/doctor-dashboard";

export default function DoctorDashboardPage(): React.ReactElement {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");

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

  // Filter ONLY sessions that have been completed
  const completedSessions = useMemo<SessionRow[]>(() => {
    return sessions.filter((s) => s.status === "completed");
  }, [sessions]);

  // Apply search query within completed sessions
  const filtered = useMemo<SessionRow[]>(() => {
    const sorted = sortCompletedSessions(completedSessions);
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (s) =>
        s.chiefComplaint.toLowerCase().includes(q) ||
        s.patientId.toLowerCase().includes(q),
    );
  }, [completedSessions, query]);

  // Statistics
  const statsCompleted = completedSessions.length;
  const statsRedFlags = completedSessions.filter((s) => s.redFlag || s.status === "escalated").length;
  const statsAtKiosk = sessions.filter((s) => s.status === "in_progress").length;

  return (
    <>
      <DoctorTopBar active="dashboard" />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">

        {/* Page header */}
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Completed Case Queue
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Finalized patient intakes from the AYUSH kiosk ready for physician review and prescription.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => void fetchSessions()}
            className="gap-2 shadow-xs"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
            Refresh
          </Button>
        </header>

        {/* Stat cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Summary statistics">
          <StatCard
            icon={<CheckCheck className="size-5" aria-hidden="true" />}
            label="Completed intakes"
            value={String(statsCompleted)}
            sublabel="Ready for clinical review"
            tone="success"
          />
          <StatCard
            icon={<AlertTriangle className="size-5" aria-hidden="true" />}
            label="Red-flag alerts"
            value={String(statsRedFlags)}
            sublabel="Requiring immediate focus"
            tone={statsRedFlags > 0 ? "destructive" : "muted"}
          />
          <StatCard
            icon={<Clock className="size-5" aria-hidden="true" />}
            label="Active at kiosk"
            value={String(statsAtKiosk)}
            sublabel="In-progress patient intakes"
            tone="muted"
          />
        </section>

        {/* Search & Filter bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by chief complaint or patient ID…"
              className="w-full rounded-xl border border-border/80 bg-background py-2.5 pl-10 pr-4 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search completed sessions"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 font-medium text-foreground">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              Showing {filtered.length} completed session{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Error notification */}
        {error ? (
          <Card className="border-destructive/40 bg-destructive/5 p-6 text-destructive">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </Card>
        ) : null}

        {/* Session list */}
        <section aria-label="Completed sessions list">
          {loading ? (
            <Card className="flex items-center justify-center gap-3 p-12 text-muted-foreground shadow-xs">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
              <span className="text-sm font-medium">Loading completed sessions…</span>
            </Card>
          ) : completedSessions.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center shadow-xs">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-xs">
                <CheckCircle2 className="size-6 text-muted-foreground/80" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                No completed sessions yet
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Patient intakes completed at the AYUSH kiosk will appear here ready for examination and clinical sign-off.
              </p>
              {statsAtKiosk > 0 && (
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  ({statsAtKiosk} session{statsAtKiosk > 1 ? "s" : ""} currently in progress at kiosk)
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchSessions()}
                className="mt-5 gap-2"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Check again
              </Button>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-10 text-center shadow-xs">
              <Search className="size-8 text-muted-foreground/60" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                No matching completed sessions
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                No sessions found matching &ldquo;{query}&rdquo;. Try another symptom or patient ID.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuery("")}
                className="mt-3 text-xs"
              >
                Clear search
              </Button>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3.5" role="list">
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
  sublabel,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  tone: "primary" | "destructive" | "muted" | "success";
}): React.ReactElement {
  return (
    <Card
      className={cn(
        "flex items-center gap-4 rounded-2xl p-5 shadow-xs transition-all",
        tone === "destructive"
          ? "border-destructive/30 bg-destructive/[0.03]"
          : tone === "success"
            ? "border-emerald-500/25 bg-emerald-50/40 dark:bg-emerald-950/10"
            : tone === "muted"
              ? "border-border/80 bg-muted/20"
              : "border-primary/20 bg-primary/[0.02]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          tone === "destructive"
            ? "bg-destructive text-destructive-foreground shadow-xs"
            : tone === "success"
              ? "bg-emerald-600 text-white shadow-xs"
              : tone === "muted"
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground shadow-xs",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </Card>
  );
}

function SessionCard({ session }: { session: SessionRow }): React.ReactElement {
  const isUrgent = session.redFlag || session.status === "escalated";
  const duration = formatDuration(session.startedAt, session.completedAt);
  const completedDateLabel = session.completedAt
    ? formatDate(session.completedAt)
    : formatDate(session.startedAt);

  return (
    <Card
      className={cn(
        "group relative flex flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center sm:p-6",
        isUrgent && "border-destructive/40 bg-destructive/[0.02] hover:border-destructive/60",
      )}
    >
      {/* Accent left indicator bar for red-flags */}
      {isUrgent && (
        <div
          className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl bg-destructive"
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {/* Top metadata strip: Patient ID, Completion Date, Duration, Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-foreground">
            <User className="size-3.5 text-muted-foreground" aria-hidden="true" />
            Patient #{session.patientId.slice(0, 8)}
          </span>
          <span aria-hidden="true" className="text-border">•</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
            {completedDateLabel}
          </span>
          {duration && (
            <>
              <span aria-hidden="true" className="text-border">•</span>
              <span className="inline-flex items-center gap-1 font-medium text-foreground/75">
                <Timer className="size-3.5 text-muted-foreground" aria-hidden="true" />
                Intake: {duration}
              </span>
            </>
          )}

          <div className="ml-auto flex items-center gap-1.5 sm:ml-2">
            {isUrgent && (
              <Badge variant="destructive" className="gap-1 px-2.5 py-0.5 text-xs font-semibold">
                <AlertTriangle className="size-3" aria-hidden="true" />
                Red-flag Alert
              </Badge>
            )}
            <Badge variant="success" className="gap-1 px-2.5 py-0.5 text-xs font-medium">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Completed
            </Badge>
          </div>
        </div>

        {/* Chief Complaint */}
        <div>
          <h2 className="text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg">
            {session.chiefComplaint || "No chief complaint recorded"}
          </h2>
        </div>

        {/* Bottom meta row: Documents */}
        {session.documentCount > 0 && (
          <div className="flex items-center gap-2 pt-0.5">
            <Badge
              variant="outline"
              className="gap-1.5 rounded-lg border-border/80 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground"
            >
              <FileText className="size-3.5 text-primary" aria-hidden="true" />
              {session.documentCount} clinical document{session.documentCount > 1 ? "s" : ""} attached
            </Badge>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex shrink-0 items-center sm:self-center">
        <Link
          href={`/doctor/session/${session.id}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
        >
          Review Case
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}