"use client";

import { useSessionStore } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { CheckCircle2, QrCode } from "lucide-react";
import { useEffect } from "react";

export function CompleteScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const resetSession = useSessionStore((s) => s.resetSession);
  
  const dict = getDictionary(language).summary;

  useEffect(() => {
    // Auto-reset after 60 seconds
    const timer = setTimeout(() => {
      resetSession();
    }, 60000);
    return () => clearTimeout(timer);
  }, [resetSession]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-primary/5">
      <div className="w-full max-w-2xl bg-card p-12 rounded-[2.5rem] shadow-xl border border-primary/10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
        
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8">
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </div>
        
        <h1 className="text-4xl font-bold text-foreground mb-4">{dict.thankYou}</h1>
        <p className="text-xl text-muted-foreground mb-12">{dict.doctorReview}</p>
        
        <div className="p-6 bg-white rounded-3xl border-2 border-border mb-6">
          <QrCode className="w-48 h-48 text-foreground" />
        </div>
        
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{dict.qrLabel}</p>
      </div>
    </div>
  );
}
