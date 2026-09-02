import { z } from "zod";
import type { Result } from "@/lib/types";
import { serverEnv } from "../env";
import { TriageOutputSchema, type TriageOutput } from "./groq";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const OcrInputSchema = z.object({
  fileBase64: z.string(),
  mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  docType: z.enum(["prescription", "lab_report", "discharge_summary", "imaging"]),
});
export type OcrInput = z.infer<typeof OcrInputSchema>;

export const OcrOutputSchema = z.object({
  documentDate: z.string().nullable(),
  facilityName: z.string().nullable(),
  doctorName: z.string().nullable(),
  content: z.record(z.string(), z.unknown()),
});
export type OcrOutput = z.infer<typeof OcrOutputSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function extractDocumentOcr(_input: OcrInput): Promise<Result<OcrOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}

const genAI = new GoogleGenerativeAI(serverEnv.GEMINI_API_KEY);

export async function evaluateTriageGemini(transcript: string): Promise<Result<TriageOutput>> {
  const systemPrompt = `You are a medical triage AI for an Indian government AYUSH OPD. You will be provided with a patient-doctor transcript.
Your tasks are:
(a) Detect emergency red-flag symptoms (dyspnoea, chest pain with radiation, severe bleeding). If found, set redFlag to true and provide a redFlagReason.
(b) If the complaint involves pain, apply the SOCRATES assessment method (Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/relieving factors, Severity). Identify which SOCRATES fields are still unanswered.
(c) Formulate exactly one targeted follow-up question for the missing field.

You MUST respond with valid JSON ONLY, strictly conforming to this schema:
{
  "redFlag": boolean,
  "redFlagReason": string | null,
  "socratesFieldsMissing": string[],
  "nextQuestion": string | null
}
Do not include markdown blocks or any other text.`;

  let attempt = 0;
  let validationError = "";
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

  while (attempt < 2) {
    attempt++;
    const userPrompt = validationError
      ? `Transcript:\n${transcript}\n\nYour previous response failed validation with the following error:\n${validationError}\n\nPlease correct your response to strictly match the required JSON schema.`
      : `Transcript:\n${transcript}`;

    try {
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);
      const content = result.response.text();
      const parsed = JSON.parse(content);
      const validated = TriageOutputSchema.safeParse(parsed);

      if (validated.success) {
        return { success: true, data: validated.data };
      } else {
        validationError = validated.error.message;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: { code: "GEMINI_NETWORK_ERROR", message: msg, retryable: true } };
    }
  }

  return {
    success: false,
    error: {
      code: "ESCALATE_TO_STAFF",
      message: "AI triage failed validation repeatedly. Escalate to human staff.",
      retryable: false,
    },
  };
}
