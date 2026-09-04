import { db } from "@/lib/db";
import { sessions, patients, conversations, summaries } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { SessionCard } from "@/components/doctor/SessionCard";
import { Activity, Users } from "lucide-react";

/**
 * Physician dashboard — lists recent patient sessions.
 * Server component — fetches directly from DB.
 */
export default async function DoctorDashboardPage(): Promise<React.ReactElement> {
  let sessionRows: Array<{
    id: string;
    status: string;
    started_at: Date;
    completed_at: Date | null;
    patient_name: string | null;
    chief_complaint: string | null;
    red_flag: boolean;
  }> = [];

  let fetchError: string | null = null;

  try {
    const raw = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        started_at: sessions.started_at,
        completed_at: sessions.completed_at,
        patient_name: patients.full_name,
        red_flag: conversations.red_flag,
        chief_complaint: summaries.chief_complaint,
      })
      .from(sessions)
      .leftJoin(patients, eq(sessions.patient_id, patients.id))
      .leftJoin(conversations, eq(conversations.session_id, sessions.id))
      .leftJoin(summaries, eq(summaries.session_id, sessions.id))
      .orderBy(desc(sessions.started_at))
      .limit(50);

    sessionRows = raw.map((r) => ({
      id: r.id,
      status: r.status,
      started_at: r.started_at,
      completed_at: r.completed_at,
      patient_name: r.patient_name,
      chief_complaint: r.chief_complaint ?? null,
      red_flag: r.red_flag ?? false,
    }));
  } catch (err: unknown) {
    console.error("Dashboard fetch error:", err);
    fetchError =
      err instanceof Error
        ? err.message
        : "Failed to load sessions from database.";
  }

  const redFlagCount = sessionRows.filter((s) => s.red_flag).length;
  const inProgressCount = sessionRows.filter(
    (s) => s.status === "in_progress"
  ).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Patient Sessions
        </h1>
        <p className="text-muted-foreground text-sm">
          Today&apos;s AYUSH OPD encounters
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-5 h-5 text-primary" />}
          label="Total Sessions"
          value={String(sessionRows.length)}
          color="primary"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-amber-600" />}
          label="In Progress"
          value={String(inProgressCount)}
          color="amber"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-destructive" />}
          label="Red Flags"
          value={String(redFlagCount)}
          color="destructive"
        />
      </div>

      {/* Error state */}
      {fetchError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 mb-6">
          <p className="font-semibold text-destructive">
            Could not load sessions
          </p>
          <p className="text-sm text-destructive/80 mt-1">{fetchError}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Check that DATABASE_URL is set and the database is reachable.
          </p>
        </div>
      )}

      {/* Session list */}
      {!fetchError && sessionRows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-primary/10 p-5 rounded-2xl mb-4">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">
            No sessions yet
          </p>
          <p className="text-muted-foreground text-sm">
            Patient sessions will appear here once the kiosk is used.
          </p>
        </div>
      )}

      {!fetchError && sessionRows.length > 0 && (
        <div className="flex flex-col gap-3">
          {sessionRows.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helper subcomponent ──────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "primary" | "amber" | "destructive";
}): React.ReactElement {
  const bgClass =
    color === "primary"
      ? "bg-primary/5"
      : color === "amber"
        ? "bg-amber-50"
        : "bg-destructive/5";

  return (
    <div className={`rounded-xl border border-border p-4 ${bgClass}`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
