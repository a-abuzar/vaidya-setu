"use client";

import { useEffect, useState } from "react";
import { useSessionStore, type TranscriptEntry } from "@/lib/store/session";
import { HoldToSpeak } from "@/components/HoldToSpeak";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { rpcClient } from "@/lib/api-client";

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

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue().catch((e) => console.error("Sync error:", e));
    };
    const handleOffline = () => setIsOnline(false);

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

    try {
      const triageRes = await rpcClient.api.ai.triage.$post({
        json: { transcript: text },
      });

      if (!triageRes.ok) {
         throw new Error("AI Triage failed");
      }

      const triageData = await triageRes.json();
      if (!triageData.success) {
        throw new Error((triageData as any).error?.message || "AI triage failed");
      }

      const { redFlag, nextQuestion } = triageData.data;

      if (redFlag) {
        setRedFlag(true, triageData.data.redFlagReason);
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
            if (!patchRes.ok) throw new Error("DB write non-200");
          } catch (e) {
            console.warn("DB write failed, queueing offline", e);
            await queueOfflineMutation({ sessionId, type: "PATCH_TRANSCRIPT", payload });
          }
        }
      }

    } catch (err) {
      console.warn("Error processing transcript:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col p-6 items-center justify-center font-sans">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <header className="flex justify-between items-center text-slate-500">
          <div className="flex items-center gap-2">
            <Activity className={isOnline ? "text-green-500" : "text-amber-500"} />
            <span className="font-semibold text-lg uppercase tracking-wider">
              {isOnline ? "System Ready" : "Offline Mode (Syncing Paused)"}
            </span>
          </div>
        </header>

        {redFlagDetected && (
          <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded flex gap-4 items-center shadow-sm">
            <AlertTriangle className="text-red-500 w-8 h-8" />
            <p className="text-red-800 font-bold text-xl">
              Please notify staff immediately. Priority evaluation required.
            </p>
          </div>
        )}

        <Card className="shadow-2xl border-0 overflow-hidden rounded-3xl h-[60vh] flex flex-col">
          <CardContent className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white relative">
            
            {isProcessing && (
              <div className="absolute top-0 left-0 w-full">
                <Progress value={0} className="h-2 rounded-none" />
              </div>
            )}

            <div className="flex-1 flex items-center justify-center">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight">
                {currentQuestion || "Tap and hold the microphone to describe your symptoms"}
              </h1>
            </div>

            <div className="mt-8 pb-4">
              <HoldToSpeak onTranscript={handleTranscript} />
            </div>

          </CardContent>
        </Card>

        <div className="px-4 text-slate-400 text-sm flex gap-2 items-center justify-center">
          <FileText size={16} />
          {transcript.length > 0 ? (
            <span>
              Last heard: <em className="text-slate-600">"{transcript[transcript.length - 1].text}"</em>
            </span>
          ) : (
            <span>Your conversation will appear here...</span>
          )}
        </div>

      </div>
    </main>
  );
}
