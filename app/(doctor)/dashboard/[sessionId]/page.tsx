import { db } from "@/lib/db";
import { sessions, patients, summaries, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AlertTriangle, Clock, Activity, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { DoshaChart } from "@/components/doctor/DoshaChart";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage(props: { params: Promise<{ sessionId: string }> }) {
  const params = await props.params;
  const { sessionId } = params;
  
  // Need to handle UUID cast correctly in production, ignoring detailed validation for this stub
  const sessionData = await db
    .select({
      session: sessions,
      patient: patients,
    })
    .from(sessions)
    .innerJoin(patients, eq(sessions.patient_id, patients.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (sessionData.length === 0) return notFound();

  const { session, patient } = sessionData[0];

  const summaryData = await db
    .select()
    .from(summaries)
    .where(eq(summaries.session_id, sessionId))
    .limit(1);
    
  const summary = summaryData[0] || null;

  return (
    <div className="p-8 max-w-6xl mx-auto flex gap-8">
      
      {/* Main Content: Summary Editor */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Back to Queue
          </Link>
        </div>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{patient.full_name}</h1>
            <p className="text-muted-foreground font-medium">
              {patient.gender} • {patient.phone} • {patient.abha_linked ? 'ABHA Linked' : 'Guest'}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button className="px-6 py-2.5 rounded-xl border border-border bg-card font-medium shadow-sm hover:bg-muted transition-colors">
              Save Draft
            </button>
            <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Push to ABDM
            </button>
          </div>
        </div>

        {summary ? (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-8 space-y-8">
            <h2 className="text-xl font-bold border-b border-border pb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Clinical Summary
            </h2>
            
            <div className="space-y-4">
              <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider">Chief Complaint</label>
              <textarea 
                className="w-full min-h-[100px] p-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                defaultValue={summary.chief_complaint}
              />
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider">History of Present Illness (HPI)</label>
              <textarea 
                className="w-full min-h-[150px] p-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                defaultValue={summary.hpi}
              />
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider">Personal & Family History</label>
              <textarea 
                className="w-full min-h-[100px] p-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                defaultValue={`${summary.personal_history}\n\n${summary.family_history}`}
              />
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center flex flex-col items-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">Summary pending</h3>
            <p className="text-muted-foreground">The AI is still processing the intake for this session, or the patient hasn't submitted yet.</p>
          </div>
        )}
      </div>

      {/* Sidebar: AYUSH & Status */}
      <div className="w-[340px] space-y-6">
        
        {session.status === 'escalated' && (
          <div className="bg-destructive/10 border border-destructive/20 p-5 rounded-2xl flex flex-col gap-2 text-destructive">
            <div className="flex items-center gap-2 font-bold text-lg">
              <AlertTriangle className="w-5 h-5" />
              Red Flag Escalation
            </div>
            <p className="text-sm font-medium">This intake was escalated due to emergency symptoms. Please review transcript.</p>
          </div>
        )}

        {/* AYUSH Assessment */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            AYUSH Assessment
          </h3>
          
          <div className="aspect-square w-full mb-6 relative">
            {summary?.ayush_assessment ? (
              <DoshaChart data={summary.ayush_assessment as any} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-border rounded-xl">
                <span className="text-sm font-medium text-muted-foreground text-center px-4">No AYUSH assessment recorded yet</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
