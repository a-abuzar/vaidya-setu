/**
 * Doctor dashboard utility functions and types.
 * Pure helper functions for formatting, calculating duration, and sorting completed clinical sessions.
 */

export interface SessionRow {
  id: string;
  patientId: string;
  status: "in_progress" | "awaiting_triage" | "completed" | "escalated";
  startedAt: string;
  completedAt: string | null;
  redFlag: boolean;
  documentCount: number;
  chiefComplaint: string;
}

/** Compute readable duration between intake start and completion. */
export function formatDuration(startedAt: string, completedAt: string | null): string | null {
  if (!completedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const diffMs = end - start;
  if (isNaN(diffMs) || diffMs <= 0) return null;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "< 1 min";
  if (mins === 1) return "1 min";
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  }
  return `${mins} mins`;
}

/** Format ISO timestamp for clinical display in Indian locale. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Sort so urgent/red-flag sessions bubble up first, then newest completedAt first. */
export function sortCompletedSessions(sessions: SessionRow[]): SessionRow[] {
  return [...sessions].sort((a, b) => {
    const aUrgent = a.redFlag || a.status === "escalated" ? 0 : 1;
    const bUrgent = b.redFlag || b.status === "escalated" ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    const timeA = new Date(a.completedAt || a.startedAt).getTime();
    const timeB = new Date(b.completedAt || b.startedAt).getTime();
    return timeB - timeA;
  });
}
