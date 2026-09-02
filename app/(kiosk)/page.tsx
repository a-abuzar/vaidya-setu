"use client";

import { useEffect, useState, useRef } from "react";
import { useSessionStore, type TranscriptEntry } from "@/lib/store/session";
import { HoldToSpeak } from "@/components/HoldToSpeak";
import { Activity, Stethoscope, AlertTriangle, ShieldCheck, Leaf } from "lucide-react";
import { rpcClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function KioskPage() {
  const {
    sessionId,
    currentQuestion,
    transcript,
    isProcessing,
    redFlagDetected,
    syncOfflineQueue,
    addTranscriptEntry,
    setCurrentQuestion,
    setProcessing,
    setRedFlag,
    queueOfflineMutation,
  } = useSessionStore();

  const [isOnline, setIsOnline] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connection restored. Syncing records...");
      syncOfflineQueue().catch((e) => console.error("Sync error:", e));
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Offline Mode. Data is saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineQueue]);

  const handleTranscript = async (text: string) => {
    if (!text.trim()) return;

    const entry: TranscriptEntry = {
      role: "patient",
      text,
      lang: "hi", 
      timestamp: new Date().toISOString(),
    };
    
    addTranscriptEntry(entry);
    setProcessing(true);

    const fullHistory = [...transcript, entry]
      .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
      .join("\n");

    try {
      const triageRes = await rpcClient.api.ai.triage.$post({
        json: { transcript: fullHistory },
      });

      if (!triageRes.ok) {
         throw new Error("Triage service unavailable.");
      }

      const triageData = await triageRes.json();
      if (!triageData.success) {
        throw new Error((triageData as any).error?.message || "Validation failed.");
      }

      const { redFlag, nextQuestion, redFlagReason } = triageData.data;

      if (redFlag) {
        setRedFlag(true, redFlagReason || "Emergency symptom detected");
        toast.error("Red flag detected: " + redFlagReason);
      }
      
      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
        addTranscriptEntry({
          role: "system",
          text: nextQuestion,
          lang: "hi",
          timestamp: new Date().toISOString(),
        });
      }

      if (sessionId) {
        const payload = { transcript: [...transcript, entry] };
        
        if (!navigator.onLine) {
          await queueOfflineMutation({
            sessionId,
            type: "PATCH_TRANSCRIPT",
            payload,
          });
        } else {
          try {
            const patchRes = await rpcClient.api.sessions[":id"].$patch({
              param: { id: sessionId },
              json: payload,
            });
            if (!patchRes.ok) throw new Error("Database sync failed.");
          } catch (e) {
            await queueOfflineMutation({ sessionId, type: "PATCH_TRANSCRIPT", payload });
          }
        }
      }

    } catch (err: any) {
      toast.error(err.message || "Failed to analyze symptoms. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-4 md:p-6 lg:p-8 selection:bg-teal-100">
      <div className="w-full max-w-6xl h-[90vh] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100/50 flex overflow-hidden relative shadow-teal-900/5">
        
        {/* Left Side: Conversation Area */}
        <div className="flex-1 flex flex-col bg-slate-50/50 relative z-10">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div className="bg-teal-50 p-2.5 rounded-2xl border border-teal-100/50">
                <Leaf className="text-teal-600 w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-lg tracking-tight">VaidyaSetu</h2>
                <p className="text-sm text-teal-600/80 font-semibold tracking-wide">AYUSH OPD KIOSK</p>
              </div>
            </div>
            
            <div className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Activity className="w-4 h-4" />
              {isOnline ? 'SYSTEM ONLINE' : 'OFFLINE SYNCING'}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-8 space-y-8 scroll-smooth">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm border border-teal-200/50">
                <ShieldCheck className="w-5 h-5 text-teal-700" />
              </div>
              <div className="bg-white border border-slate-100 p-5 rounded-3xl rounded-tl-sm text-slate-600 shadow-sm shadow-slate-200/20 max-w-[85%]">
                <p className="leading-relaxed text-[15px]">Namaste. Tap and hold the microphone button to describe your symptoms. We will triage you appropriately.</p>
              </div>
            </div>

            {transcript.map((msg, i) => (
              <div key={i} className={`flex gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300 ${msg.role === 'patient' ? 'justify-end' : ''}`}>
                {msg.role === 'system' && (
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm border border-teal-200/50">
                    <Stethoscope className="w-5 h-5 text-teal-700" />
                  </div>
                )}
                
                <div className={`p-5 rounded-3xl shadow-sm max-w-[85%] ${
                  msg.role === 'patient' 
                    ? 'bg-teal-600 text-white rounded-tr-sm shadow-teal-900/10' 
                    : 'bg-white border border-slate-100 text-slate-600 rounded-tl-sm shadow-slate-200/20'
                }`}>
                  <p className="leading-relaxed text-[15px]">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex gap-4 animate-in fade-in">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm border border-teal-200/50">
                  <Stethoscope className="w-5 h-5 text-teal-700" />
                </div>
                <div className="bg-white border border-slate-100 p-5 rounded-3xl rounded-tl-sm shadow-sm shadow-slate-200/20 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Action Area */}
        <div className="w-[480px] bg-white flex flex-col items-center justify-center p-12 relative border-l border-slate-100 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] z-20">
          
          {redFlagDetected && (
            <div className="absolute top-8 left-8 right-8 bg-rose-50 border border-rose-100 rounded-3xl p-5 flex gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
              <div className="bg-rose-100 p-2 rounded-2xl h-fit">
                <AlertTriangle className="text-rose-600 w-6 h-6 flex-shrink-0" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900">Emergency Detected</h3>
                <p className="text-rose-700/80 text-sm mt-1 font-medium leading-relaxed">Please notify staff immediately.</p>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <h1 className="text-[2rem] font-bold text-slate-800 text-center mb-16 leading-[1.3] tracking-tight">
              {currentQuestion || "How are you feeling today?"}
            </h1>
            
            <HoldToSpeak onTranscript={handleTranscript} />
          </div>
          
        </div>
      </div>
    </main>
  );
}
