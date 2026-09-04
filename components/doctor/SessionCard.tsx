import { AlertTriangle, Clock, User } from "lucide-react";
import Link from "next/link";

interface Session {
  id: string;
  status: string;
  started_at: Date | string;
  completed_at: Date | string | null;
  red_flag?: boolean;
  chief_complaint?: string | null;
  patient_name?: string | null;
}

export interface SessionCardProps {
  session: Session;
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  awaiting_triage: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  escalated: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  awaiting_triage: "Awaiting Triage",
  completed: "Completed",
  escalated: "Escalated",
};

function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * SessionCard — dashboard list item for a patient session.
 * Shows: patient name, chief complaint preview, status badge,
 * red-flag indicator, and started time.
 */
export function SessionCard({ session }: SessionCardProps): React.ReactElement {
  const statusClass =
    STATUS_COLORS[session.status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const statusLabel = STATUS_LABELS[session.status] ?? session.status;

  return (
    <Link
      href={`/doctor/dashboard/${session.id}`}
      className="block rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all p-5 group"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: patient info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="bg-primary/10 p-2.5 rounded-xl flex-shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-base truncate group-hover:text-primary transition-colors">
              {session.patient_name ?? "Anonymous Patient"}
            </p>
            {session.chief_complaint && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {session.chief_complaint}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}
              >
                {statusLabel}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDate(session.started_at)} · {formatTime(session.started_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: red flag */}
        {session.red_flag && (
          <div className="flex-shrink-0 bg-destructive/10 p-2 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
        )}
      </div>
    </Link>
  );
}
