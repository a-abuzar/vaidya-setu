"use client";

import { useSessionStore } from "@/lib/store/session";
import { getDictionary } from "@/lib/i18n";
import { UserCircle, ShieldCheck } from "lucide-react";

export function IdentifyScreen(): React.ReactElement {
  const language = useSessionStore((s) => s.language);
  const nextStep = useSessionStore((s) => s.nextStep);
  const consents = useSessionStore((s) => s.consents);
  
  const dict = getDictionary(language).identify;
  
  const abdmConsent = consents.find((c) => c.purpose === "abdm_health_record_linking")?.granted;

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">{dict.title}</h1>
          <p className="text-lg text-muted-foreground">{dict.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ABHA Path */}
          <div className={`p-8 rounded-3xl border-2 transition-all ${abdmConsent ? 'border-primary/30 bg-card hover:border-primary/60 shadow-lg' : 'border-border bg-secondary/50 opacity-60'}`}>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">{dict.abhaPath.title}</h2>
            
            {abdmConsent ? (
              <div className="space-y-6">
                <input 
                  type="text" 
                  placeholder={dict.abhaPath.placeholder}
                  className="w-full px-5 py-4 rounded-xl border border-input bg-background text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 kiosk-touch"
                />
                {/* Simplified for now, real implementation would have OTP flows */}
                <button 
                  onClick={nextStep}
                  className="w-full kiosk-touch bg-primary text-primary-foreground font-bold text-lg rounded-xl shadow-md active:scale-[0.98] transition-transform"
                >
                  {dict.abhaPath.verifyButton}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-muted-foreground text-lg mb-6">
                  {language === "hi" ? "आपने ABHA लिंक करने की अनुमति नहीं दी है।" : language === "ta" ? "நீங்கள் ABHA இணைக்க அனுமதி வழங்கவில்லை." : "You did not consent to ABHA linking."}
                </p>
              </div>
            )}
          </div>

          {/* Guest Path */}
          <div className="p-8 rounded-3xl border-2 border-border bg-card shadow-lg hover:border-accent/30 transition-all flex flex-col">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <UserCircle className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">{dict.guestPath.title}</h2>
            <p className="text-muted-foreground text-lg mb-auto">
              {dict.guestPath.description}
            </p>
            
            <button 
              onClick={nextStep}
              className="w-full kiosk-touch mt-8 bg-secondary hover:bg-muted text-foreground font-bold text-lg rounded-xl shadow-sm border border-border active:scale-[0.98] transition-transform"
            >
              {dict.guestPath.continueButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
