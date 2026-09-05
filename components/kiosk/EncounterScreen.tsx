"use client";

import { useSessionStore } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { HoldToSpeak } from "@/components/HoldToSpeak";
import { Stethoscope, Check, RefreshCw } from "lucide-react";

export function EncounterScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const currentQuestion = useSessionStore((s) => s.currentQuestion);
  const captionText = useSessionStore((s) => s.captionText);
  const setCaptionText = useSessionStore((s) => s.setCaptionText);
  // Add transcript entry and trigger triage here in a real implementation
  
  const dict = getDictionary(language).encounter;
  
  const handleTranscript = (text: string) => {
    setCaptionText(text);
  };
  
  const handleConfirmCaption = () => {
    setCaptionText(null);
    // Proceed to triage logic
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
      
      {/* Sidebar history could go here, omitting for simplicity in this stub */}

      <div className="w-full max-w-3xl flex flex-col items-center">
        
        {/* System Question */}
        <div className="flex flex-col items-center text-center mb-16 animate-in slide-in-from-bottom-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-sm border border-primary/20">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-[1.3] tracking-tight">
            {currentQuestion || "How are you feeling today?"}
          </h2>
        </div>

        {/* Caption Panel (Appears after speaking, before sending to AI) */}
        {captionText && (
          <div className="w-full bg-secondary/80 rounded-3xl p-6 mb-12 border border-border shadow-sm animate-in fade-in zoom-in-95">
            <p className="text-sm font-semibold text-muted-foreground mb-2">{dict.weHeard}</p>
            <p className="text-xl text-foreground font-medium mb-6">{captionText}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setCaptionText(null)}
                className="kiosk-touch flex-1 flex items-center justify-center gap-2 bg-background hover:bg-muted text-foreground rounded-xl font-semibold transition-colors border border-border"
              >
                <RefreshCw className="w-5 h-5" />
                {dict.tryAgain}
              </button>
              <button 
                onClick={handleConfirmCaption}
                className="kiosk-touch flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl font-bold transition-transform active:scale-[0.98]"
              >
                <Check className="w-5 h-5" />
                {dict.correct}
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`transition-opacity duration-300 ${captionText ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <HoldToSpeak onTranscript={handleTranscript} language={language} />
        </div>
      </div>
    </div>
  );
}
