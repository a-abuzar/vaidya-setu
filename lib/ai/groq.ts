import { z } from "zod";
import type { Result } from "@/lib/types";
import { serverEnv } from "@/lib/env";

export const SocratesFieldSchema = z.enum(["site", "onset", "character", "radiation", "associations", "timeCourse", "exacerbatingRelieving", "severity"]);
export type SocratesField = z.infer<typeof SocratesFieldSchema>;

export const TriageInputSchema = z.object({
  transcript: z.array(
    z.object({
      role: z.enum(["patient", "system"]),
      text: z.string(),
      lang: z.enum(["en", "hi", "ta"]),
      timestamp: z.string(),
    })
  ),
  socratesState: z.object({
    site: z.string().nullable(),
    onset: z.string().nullable(),
    character: z.string().nullable(),
    radiation: z.string().nullable(),
    associations: z.string().nullable(),
    timeCourse: z.string().nullable(),
    exacerbatingRelieving: z.string().nullable(),
    severity: z.string().nullable(),
  }).nullable(),
  ayushModeEnabled: z.boolean(),
});
export type TriageInput = z.infer<typeof TriageInputSchema>;

export const TriageOutputSchema = z.object({
  redFlag: z.boolean(),
  redFlagReason: z.string().nullable(),
  socratesFieldsMissing: z.array(SocratesFieldSchema),
  nextQuestion: z.string().nullable(),
});
export type TriageOutput = z.infer<typeof TriageOutputSchema>;

export const SummaryLLMInputSchema = z.object({
  transcriptText: z.string(),
  ocrDataJson: z.string().nullable(),
  includeAyush: z.boolean(),
});
export type SummaryLLMInput = z.infer<typeof SummaryLLMInputSchema>;

export const SummaryLLMOutputSchema = z.object({
  chiefComplaint: z.string(),
  hpiNarrative: z.string(),
  pastHistory: z.string(),
  drugAllergyHistory: z.string(),
  familyHistory: z.string(),
  personalHistory: z.string(),
  reviewOfSystems: z.string(),
  priorInvestigations: z.string(),
  ayushAssessment: z.string().nullable(),
});
export type SummaryLLMOutput = z.infer<typeof SummaryLLMOutputSchema>;


export async function evaluateTriage(transcript: string, language: string = "en"): Promise<Result<TriageOutput>> {
  const systemPrompt = `You are a medical triage AI for an Indian government AYUSH OPD. You will be provided with a patient-doctor transcript.
Your tasks are:
(a) Detect emergency red-flag symptoms (dyspnoea, chest pain with radiation, severe bleeding). If found, set redFlag to true and provide a redFlagReason.
(b) If the complaint involves pain, apply the SOCRATES assessment method. Identify which fields are still unanswered. You must only use these exact string values for the array: "site", "onset", "character", "radiation", "associations", "timeCourse", "exacerbatingRelieving", "severity". If no pain is involved or all fields are answered, return an empty array [].
(c) Formulate exactly one targeted follow-up question for the missing field. IMPORTANT: Write this nextQuestion in the language code: ${language} (en=English, hi=Hindi/Hinglish, ta=Tamil/Tanglish).

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

  while (attempt < 2) {
    attempt++;
    const userPrompt = validationError
      ? `Transcript:\n${transcript}\n\nYour previous response failed validation with the following error:\n${validationError}\n\nPlease correct your response to strictly match the required JSON schema.`
      : `Transcript:\n${transcript}`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serverEnv.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: { code: "GROQ_API_ERROR", message: `Groq error: ${response.status} - ${errText}`, retryable: true } };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from Groq");

      const parsed = JSON.parse(content);
      const validated = TriageOutputSchema.safeParse(parsed);

      if (validated.success) {
        return { success: true, data: validated.data };
      } else {
        validationError = validated.error.message;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: { code: "GROQ_NETWORK_ERROR", message: msg, retryable: true } };
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateSummaryLLM(_input: SummaryLLMInput): Promise<Result<SummaryLLMOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}
