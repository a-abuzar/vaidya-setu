"use client";

import { useState, useRef, useCallback } from "react";
import { Mic } from "lucide-react";
import { rpcClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useKioskUi } from "@/lib/store/kiosk-ui";
import { t } from "@/lib/i18n/dict";

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  [index: number]: {
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
}

export function HoldToSpeak({
  onTranscript,
  disabled = false,
  className = "",
  iconSize = 48,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  iconSize?: number;
}): React.ReactElement {
  const language = useKioskUi((s) => s.language);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const isPressingRef = useRef(false);
  const startAttemptRef = useRef(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  const startRecording = useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isRecording) return;
    if (disabled) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone access is blocked. If you are testing on a mobile device, you must use HTTPS (e.g., via ngrok) or localhost. The browser blocks microphones on plain HTTP network IPs.");
      return;
    }

    const attempt = ++startAttemptRef.current;
    isPressingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // If user released the button before stream was ready, or a newer press happened
      if (!isPressingRef.current || startAttemptRef.current !== attempt) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      // Audio analysis for dynamic haptic visualizer
      const AudioCtxConstructor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxConstructor) {
        throw new Error("AudioContext not supported in this browser");
      }
      const audioCtx = new AudioCtxConstructor();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = (): void => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] ?? 0;
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
    } catch (err: unknown) {
      console.error("Failed to start recording:", err);
      alert("Microphone permission denied or hardware unavailable.");
    }
  }, [isRecording, disabled]);

  const fallbackToWebSpeech = (): void => {
    if (typeof window === "undefined") return;
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionConstructor =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      alert("Offline Web Speech API not supported in this browser. Please check your network.");
      return;
    }
    
    const recognitionInstance = new SpeechRecognitionConstructor();
    recognition.current = recognitionInstance;
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    
    recognitionInstance.onresult = (event: SpeechRecognitionEventLike): void => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEventLike): void => {
      console.error("Web Speech API error:", event.error);
    };

    recognitionInstance.start();
    console.log("Web Speech API initialized for fallback interaction.");
  };

  const stopRecording = useCallback(async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    isPressingRef.current = false;
    
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
        } catch (err: unknown) {
          console.warn("Network error during Sarvam STT, falling back to Web Speech API.", err);
          fallbackToWebSpeech();
        }
        
        mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
        resolve();
      };
      
      mediaRecorder.current!.stop();
    });
  }, [onTranscript]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Idle ambient theme ring inviting patient to speak */}
      {!isRecording && !disabled && (
        <div className="absolute -inset-2.5 rounded-full border-2 border-[var(--primary-light)]/40 pointer-events-none animate-pulse opacity-60" />
      )}

      {/* Animated audio ripples when recording */}
      {isRecording && (
        <>
          <div
            ref={pulseRef}
            className="absolute inset-0 rounded-full bg-destructive/35 pointer-events-none transition-transform duration-75"
          />
          <div className="absolute -inset-4 rounded-full bg-destructive/25 animate-pulse opacity-50 pointer-events-none" />
          <div
            className="absolute -inset-8 rounded-full bg-destructive/15 animate-pulse opacity-30 pointer-events-none"
            style={{ animationDelay: "150ms" }}
          />
        </>
      )}
      
      <Button
        size="lg"
        variant={isRecording ? "destructive" : "default"}
        className={`w-full h-full rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 touch-none select-none relative z-10 
          ${
            isRecording
              ? "scale-105 shadow-destructive/50 bg-destructive hover:bg-destructive/90 text-destructive-foreground ring-4 ring-destructive/30"
              : "hover:scale-105 bg-primary hover:bg-[var(--primary-mid)] active:bg-[var(--primary-mid)] text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-[var(--primary-mid)]/35 border-2 border-[var(--primary-light)]/40 focus-visible:ring-4 focus-visible:ring-[var(--primary-mid)]/50"
          }
          ${!className ? "px-8 py-6 gap-3 min-h-16" : "min-h-12"}`}
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        onPointerCancel={stopRecording}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
      >
        {isRecording ? (
          <div className={`flex items-center ${!className ? "gap-3" : "flex-col gap-2"}`}>
            <Mic size={!className ? iconSize * 0.7 : iconSize * 0.83} className="animate-pulse text-white" />
            {className && (
              <div className="flex gap-1 h-3">
                <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite]" />
                <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite_0.2s]" />
                <div className="w-1 bg-white rounded-full animate-[bounce_1s_infinite_0.4s]" />
              </div>
            )}
            {!className && (
              <span className="text-xl font-bold tracking-wide text-white">
                {t(language, "encounter.listening")}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Mic size={!className ? iconSize * 0.7 : iconSize} className="text-white" />
            {!className && (
              <span className="text-xl font-bold tracking-wide text-white">
                {t(language, "encounter.hold")}
              </span>
            )}
          </div>
        )}
      </Button>
    </div>
  );
}
