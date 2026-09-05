"use client";

import { useSessionStore } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { Check, X, FileText, Pill, Activity } from "lucide-react";

export function SummaryReviewScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const nextStep = useSessionStore((s) => s.nextStep);
  
  const dict = getDictionary(language).summary;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-8 pb-32">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-3">{dict.title}</h1>
          <p className="text-lg text-muted-foreground">{dict.subtitle}</p>
        </div>

        {/* Summary Cards */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <FileText className="w-6 h-6" />
              <h3 className="text-xl font-bold">Chief Complaint</h3>
            </div>
            <p className="text-lg text-foreground leading-relaxed">
              Patient reports severe headache and nausea for the past 2 days.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <Pill className="w-6 h-6" />
              <h3 className="text-xl font-bold">Medications</h3>
            </div>
            <p className="text-lg text-foreground leading-relaxed">
              Currently taking Paracetamol 500mg.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent flex justify-center pointer-events-none">
        <div className="flex gap-4 w-full max-w-3xl pointer-events-auto shadow-2xl rounded-2xl">
          <button 
            className="kiosk-touch flex-1 flex items-center justify-center gap-3 bg-card border-2 border-border hover:bg-muted text-foreground font-bold text-xl rounded-2xl transition-colors"
          >
            <X className="w-6 h-6 text-destructive" />
            {dict.wrongButton}
          </button>
          <button 
            onClick={nextStep}
            className="kiosk-touch flex-1 flex items-center justify-center gap-3 bg-primary text-primary-foreground font-bold text-xl rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
          >
            <Check className="w-6 h-6" />
            {dict.correctButton}
          </button>
        </div>
      </div>
    </div>
  );
}
