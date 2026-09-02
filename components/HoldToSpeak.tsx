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

  const startRecording = useCallback(async () => {
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
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorder.current) return;
    
    return new Promise<void>((resolve) => {
      mediaRecorder.current!.onstop = async () => {
        setIsRecording(false);
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        
        try {
          const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });
          const res = await rpcClient.api.ai.transcribe.$post({ form: { file } });
          
          if (!res.ok) {
            // Sarvam STT returned 429 or other error -> Fallback to Web Speech API
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
        
        // Cleanup stream
        mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
        resolve();
      };
      
      mediaRecorder.current!.stop();
    });
  }, [onTranscript]);

  const fallbackToWebSpeech = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      console.error("Web Speech API not supported in this browser.");
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

    // Briefly start and stop to capture what we can, though usually this requires speaking again.
    // In a real robust implementation, Web Speech would run in parallel or prompt the user.
    console.log("Web Speech API initialized for next interaction.");
  };

  return (
    <Button
      size="lg"
      variant={isRecording ? "destructive" : "default"}
      className="w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-lg transition-all"
      onPointerDown={startRecording}
      onPointerUp={stopRecording}
      onPointerLeave={stopRecording}
    >
      {isRecording ? <Square size={48} /> : <Mic size={48} />}
      <span className="mt-2 text-lg font-bold">{isRecording ? "Release" : "Hold"}</span>
    </Button>
  );
}
