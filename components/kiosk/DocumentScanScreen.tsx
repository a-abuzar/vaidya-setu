"use client";

import { useSessionStore } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { Camera, FileText, Activity, FastForward } from "lucide-react";
import { useState } from "react";

export function DocumentScanScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const nextStep = useSessionStore((s) => s.nextStep);
  const [streamActive, setStreamActive] = useState(false);
  
  const dict = getDictionary(language).documentScan;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl text-center">
        <h1 className="text-3xl font-bold text-foreground mb-3">{dict.title}</h1>
        <p className="text-lg text-muted-foreground mb-12">{dict.subtitle}</p>

        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* Camera Area */}
          <div className="flex-1 bg-black rounded-3xl overflow-hidden aspect-[3/4] relative flex flex-col items-center justify-center border-4 border-muted">
            <div className="absolute inset-8 border-2 border-white/30 rounded-xl pointer-events-none" />
            <Camera className="w-16 h-16 text-white/50 mb-4" />
            <p className="text-white/70 font-medium">Camera feed will appear here</p>
            
            <button className="kiosk-touch absolute bottom-6 bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold shadow-lg shadow-black/50">
              {dict.capture}
            </button>
          </div>

          {/* Document Types */}
          <div className="w-full md:w-[320px] flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground text-left mb-2">Select Document Type:</h3>
            
            {[
              { id: 'prescription', icon: FileText, label: dict.docTypes.prescription },
              { id: 'lab_report', icon: Activity, label: dict.docTypes.lab_report },
            ].map(type => (
              <button 
                key={type.id}
                className="kiosk-touch flex items-center gap-4 p-4 rounded-2xl bg-card border-2 border-border hover:border-primary/50 text-left transition-colors"
              >
                <div className="p-3 bg-secondary rounded-xl text-foreground">
                  <type.icon className="w-6 h-6" />
                </div>
                <span className="font-bold text-lg">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={nextStep}
          className="kiosk-touch flex items-center justify-center gap-2 mx-auto px-8 py-4 rounded-2xl text-muted-foreground font-semibold hover:bg-muted transition-colors"
        >
          <span>{dict.skipButton}</span>
          <FastForward className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
