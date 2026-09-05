import { db } from "@/lib/db";
import { sessions, patients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { AlertTriangle, Clock, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const recentSessions = await db
    .select({
      session: sessions,
      patient: patients,
    })
    .from(sessions)
    .innerJoin(patients, eq(sessions.patient_id, patients.id))
    .orderBy(desc(sessions.started_at))
    .limit(20);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">OPD Dashboard</h1>
        <p className="text-muted-foreground">Recent patient triage and intake summaries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-card rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-xl text-primary"><Activity className="w-8 h-8" /></div>
          <div>
            <p className="text-3xl font-bold">{recentSessions.length}</p>
            <p className="text-sm font-medium text-muted-foreground">Today's Intakes</p>
          </div>
        </div>
        <div className="p-6 bg-card rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-4 bg-destructive/10 rounded-xl text-destructive"><AlertTriangle className="w-8 h-8" /></div>
          <div>
            <p className="text-3xl font-bold">{recentSessions.filter(s => s.session.status === 'escalated').length}</p>
            <p className="text-sm font-medium text-muted-foreground">Escalations</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="font-semibold">Patient Queue</h2>
        </div>
        <div className="divide-y divide-border">
          {recentSessions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No sessions recorded yet.</div>
          ) : (
            recentSessions.map(({ session, patient }) => (
              <Link 
                key={session.id} 
                href={`/dashboard/${session.id}`}
                className="flex items-center gap-6 p-6 hover:bg-muted/50 transition-colors group"
              >
                {/* Status Indicator */}
                <div className="flex-shrink-0">
                  {session.status === 'escalated' ? (
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  ) : session.status === 'completed' ? (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <Clock className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Patient Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {patient.full_name} <span className="text-sm font-normal text-muted-foreground ml-2">({patient.gender}, DOB: {new Date(patient.date_of_birth).toLocaleDateString()})</span>
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                    <span className="capitalize px-2 py-0.5 rounded-md bg-secondary border border-border">
                      {session.status.replace('_', ' ')}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(session.started_at))} ago</span>
                    {patient.abha_linked && (
                      <>
                        <span>•</span>
                        <span className="text-primary font-bold">ABHA Linked</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-muted-foreground group-hover:text-foreground transition-colors group-hover:translate-x-1 transform duration-200">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
