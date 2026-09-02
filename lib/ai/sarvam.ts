import { z } from "zod";
import type { Result } from "@/lib/types";
import { serverEnv } from "@/lib/env";

export const TranscribeInputSchema = z.object({
  audioBase64: z.string(),
  language: z.enum(["en", "hi", "ta"]),
  mode: z.enum(["transcribe", "translate", "verbatim", "translit", "codemix"]).default("transcribe"),
});
export type TranscribeInput = z.infer<typeof TranscribeInputSchema>;

export const TranscribeOutputSchema = z.object({
  text: z.string(),
  language: z.enum(["en", "hi", "ta"]),
  confidence: z.number().min(0).max(1),
  degraded: z.boolean(),
});
export type TranscribeOutput = z.infer<typeof TranscribeOutputSchema>;

export const SynthesizeInputSchema = z.object({
  text: z.string(),
  language: z.enum(["en", "hi", "ta"]),
});
export type SynthesizeInput = z.infer<typeof SynthesizeInputSchema>;

export const SynthesizeOutputSchema = z.object({
  audioBase64: z.string(),
  language: z.enum(["en", "hi", "ta"]),
});
export type SynthesizeOutput = z.infer<typeof SynthesizeOutputSchema>;

export const TranslateInputSchema = z.object({
  text: z.string(),
  sourceLanguage: z.enum(["en", "hi", "ta"]),
  targetLanguage: z.enum(["en", "hi", "ta"]),
});
export type TranslateInput = z.infer<typeof TranslateInputSchema>;

export const TranslateOutputSchema = z.object({
  translatedText: z.string(),
  sourceLanguage: z.enum(["en", "hi", "ta"]),
  targetLanguage: z.enum(["en", "hi", "ta"]),
});
export type TranslateOutput = z.infer<typeof TranslateOutputSchema>;


export async function transcribeAudio(blob: Blob): Promise<Result<string>> {
  try {
    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("model", "saaras:v3");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": serverEnv.SARVAM_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: {
          code: "SARVAM_API_ERROR",
          message: `Sarvam API error: ${response.status} - ${errText}`,
          retryable: true,
        },
      };
    }

    const data = (await response.json()) as Record<string, unknown>;
    // Account for potential response formats from Sarvam
    const transcript = (typeof data.transcript === "string" ? data.transcript : (typeof data.text === "string" ? data.text : ""));
    
    return { success: true, data: transcript };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: {
        code: "SARVAM_NETWORK_ERROR",
        message: msg,
        retryable: true,
      },
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function synthesizeSpeech(_input: SynthesizeInput): Promise<Result<SynthesizeOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function translateText(_input: TranslateInput): Promise<Result<TranslateOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}
