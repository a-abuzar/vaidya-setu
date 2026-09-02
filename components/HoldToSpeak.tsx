"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Square } from "lucide-react";
import { rpcClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function HoldToSpeak({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);
  const recognition = useRef<any>(null);

  const startRecording = useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault(); // Prevent default mobile behaviors like text selection or context menus
    if (isRecording) return;
    
    // Check if running on HTTP on mobile (getUserMedia requires HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone access is blocked. If you are testing on a mobile device, you must use HTTPS (e.g., via ngrok) or localhost. The browser blocks microphones on plain HTTP network IPs.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone permission denied or hardware unavailable.");
    }
  }, [isRecording]);

  const stopRecording = useCallback(async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") return;
    
    return new Promise<void>((resolve) => {
      mediaRecorder.current!.onstop = async () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        
        try {
          const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });
          const res = await rpcClient.api.ai.transcribe.$post({ form: { file } });
          
          if (!res.ok) {
            console.warn("Sarvam STT degraded, falling back to Web Speech API.");
            fallbackToWebSpeech();
          } else {
            const data = await res.json();
            if (data.success) {
              onTranscript(data.data);
            } else {
              console.warn("Sarvam STT failed internally, falling back to Web Speech API.");
              fallbackToWebSpeech();
            }
          }
        } catch (err) {
          console.warn("Network error during Sarvam STT, falling back to Web Speech API.", err);
          fallbackToWebSpeech();
        }
        
        mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
        resolve();
      };
      
      mediaRecorder.current!.stop();
    });
  }, [onTranscript]);

  const fallbackToWebSpeech = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Offline Web Speech API not supported in this browser. Please check your network.");
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = false;
    recognition.current.interimResults = false;
    
    recognition.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };

    recognition.current.onerror = (event: any) => {
      console.error("Web Speech API error:", event.error);
    };

    recognition.current.start();
    console.log("Web Speech API initialized for fallback interaction.");
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Animated audio ripples when recording */}
      {isRecording && (
        <>
          <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30 pointer-events-none" />
          <div className="absolute -inset-4 rounded-full bg-red-200 animate-pulse opacity-40 pointer-events-none" />
          <div className="absolute -inset-8 rounded-full bg-red-100 animate-pulse opacity-20 pointer-events-none" style={{ animationDelay: '150ms' }} />
        </>
      )}
      
      <Button
        size="lg"
        variant={isRecording ? "destructive" : "default"}
        className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 touch-none select-none relative z-10 
          ${isRecording ? "scale-110 shadow-red-500/50 bg-red-500" : "hover:scale-105 bg-teal-600 hover:bg-teal-700 shadow-teal-500/30"}`}
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onPointerCancel={stopRecording}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isRecording ? (
          <div className="flex flex-col items-center gap-2">
            <Mic size={40} className="animate-pulse" />
            <div className="flex gap-1 h-3">
              <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite]" />
              <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite_0.2s]" />
              <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite_0.4s]" />
            </div>
          </div>
        ) : (
          <Mic size={48} className="text-white" />
        )}
      </Button>
      <span className={`mt-6 text-xl font-bold tracking-wide transition-colors duration-300 ${isRecording ? 'text-red-500' : 'text-teal-600'}`}>
        {isRecording ? "Listening... (Release to send)" : "Hold to Speak"}
      </span>
    </div>
  );
}
