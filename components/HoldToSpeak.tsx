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

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  const startRecording = useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isRecording) return;
    
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

      // Audio analysis for dynamic haptic visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const scale = 1 + (average / 128); // Dynamic scale based on volume
        
        if (pulseRef.current) {
          pulseRef.current.style.transform = `scale(${scale})`;
          pulseRef.current.style.opacity = `${Math.min(0.8, average / 100)}`;
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
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
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (pulseRef.current) pulseRef.current.style.transform = 'scale(1)';

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
          <div ref={pulseRef} className="absolute inset-0 rounded-full bg-rose-400 opacity-30 pointer-events-none transition-transform duration-75" />
          <div className="absolute -inset-4 rounded-full bg-rose-200 animate-pulse opacity-40 pointer-events-none" />
          <div className="absolute -inset-8 rounded-full bg-rose-100 animate-pulse opacity-20 pointer-events-none" style={{ animationDelay: '150ms' }} />
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
