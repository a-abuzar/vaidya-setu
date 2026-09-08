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
  languageUsed: z.enum(["en", "hi", "ta"]).nullable().optional(),
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
  pastHistory: z.array(z.string()),
  drugAllergyHistory: z.array(z.string()),
  familyHistory: z.string(),
  personalHistory: z.string(),
  reviewOfSystems: z.record(z.string(), z.string()),
  priorInvestigations: z.array(z.string()),
  ayushAssessment: z.object({
    prakriti: z.string().nullable(),
    vikriti: z.string().nullable(),
    agni: z.string().nullable(),
    koshtha: z.string().nullable(),
    aharaVihara: z.string().nullable(),
    nidana: z.string().nullable(),
    samprapti: z.string().nullable(),
  }).nullable(),
});
export type SummaryLLMOutput = z.infer<typeof SummaryLLMOutputSchema>;


export async function evaluateTriage(transcript: string, language: string = "en"): Promise<Result<TriageOutput>> {
  const systemPrompt = `You are a medical triage AI for an Indian government AYUSH OPD. You will be provided with a patient-doctor transcript.
Your tasks are:
(a) Detect emergency red-flag symptoms (dyspnoea, chest pain with radiation, severe bleeding). If found, set redFlag to true and provide a redFlagReason.
(b) If the complaint involves pain, apply the SOCRATES assessment method. Identify which fields are still unanswered. You must only use these exact string values for the array: "site", "onset", "character", "radiation", "associations", "timeCourse", "exacerbatingRelieving", "severity". If no pain is involved or all fields are answered, return an empty array [].
(c) Conduct a comprehensive medical interview progressing through these stages: Chief Complaint, History of Present Illness (HPI), Past Medical History, Drug/Allergy History, Family History, Personal History, and Review of Systems.
(d) Formulate exactly ONE targeted follow-up question to gather the next piece of missing information for the current stage. Do not ask multiple questions at once. If all stages are complete, set nextQuestion to null to end the interview.
(e) IMPORTANT: Detect the language of the patient's most recent response. Write this nextQuestion in that SAME language. If you cannot determine the language, default to the language code: ${language} (en=English, hi=Hindi/Hinglish, ta=Tamil/Tanglish). Also provide the language code you used in 'languageUsed'.

You MUST respond with valid JSON ONLY, strictly conforming to this schema:
{
  "redFlag": boolean,
  "redFlagReason": string | null,
  "socratesFieldsMissing": string[],
  "nextQuestion": string | null,
  "languageUsed": "en" | "hi" | "ta" | null
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

export async function generateSummaryLLM(
  input: SummaryLLMInput
): Promise<Result<SummaryLLMOutput>> {
  const systemPrompt = `You are an expert clinical history documentation engine for an Indian government AYUSH Outpatient Department (OPD).
Given a patient-kiosk intake transcript, extract and synthesize a structured, professional clinical summary for the attending physician.

Requirements:
1. chiefComplaint: Formal clinical terminology with duration (e.g., "Acute epigastric pain radiating to back for 3 days"). Never layperson phrasing.
2. hpiNarrative: Objective third-person clinical narrative detailing onset, progression, SOCRATES pain characteristics if applicable, and pertinent negatives.
3. pastHistory: Array of diagnosed chronic conditions or surgeries (e.g. ["Type 2 Diabetes Mellitus (4 years)", "Primary Hypertension"]). If none reported, return ["No significant past medical history reported"].
4. drugAllergyHistory: Array of active medications and allergies (e.g. ["NKDA (No Known Drug Allergies)", "Tab Metformin 500mg BD"]). If none reported, return ["NKDA (No known drug allergies)", "No active prescription medications reported"].
5. familyHistory: Concise clinical string (e.g. "Maternal Type 2 Diabetes" or "Non-contributory").
6. personalHistory: Lifestyle factors (diet, sleep, bowel/bladder, tobacco, alcohol).
7. reviewOfSystems: Record of organ systems, e.g. {"constitutional": "Afebrile, no weight loss", "respiratory": "Dry cough present; denies dyspnea", "cardiovascular": "Denies chest pain or palpitations"}.
8. priorInvestigations: Array of prior labs or imaging (e.g. ["CBC normal (2 days ago)"] or ["No prior investigations reported"]).
9. ayushAssessment: ${
    input.includeAyush
      ? `A structured AYUSH Dashavidha Pariksha assessment object with fields:
         - prakriti: Constitutional baseline dosha (e.g. "Vata-Pitta predominant", "Pitta-Kapha", or null)
         - vikriti: Current morbidity/doshic imbalance (e.g. "Vata vriddhi with Kapha avarodha", or null)
         - agni: Digestive fire state (e.g. "Manda Agni", "Vishama Agni", or null)
         - koshtha: Bowel habit (e.g. "Krura Koshtha", "Madhyama Koshtha", or null)
         - aharaVihara: Dietary and lifestyle habits (string or null)
         - nidana: Identified etiological factors (string or null)
         - samprapti: Concise pathogenesis summary (string or null)`
      : `null`
  }

You MUST respond with valid JSON ONLY conforming strictly to this schema:
{
  "chiefComplaint": string,
  "hpiNarrative": string,
  "pastHistory": string[],
  "drugAllergyHistory": string[],
  "familyHistory": string,
  "personalHistory": string,
  "reviewOfSystems": Record<string, string>,
  "priorInvestigations": string[],
  "ayushAssessment": {
    "prakriti": string | null,
    "vikriti": string | null,
    "agni": string | null,
    "koshtha": string | null,
    "aharaVihara": string | null,
    "nidana": string | null,
    "samprapti": string | null
  } | null
}
Do not include markdown blocks or any conversational text.`;

  let attempt = 0;
  let validationError = "";

  while (attempt < 2) {
    attempt++;
    const userPrompt = validationError
      ? `Transcript:\n${input.transcriptText}\n\nYour previous response failed validation with the following error:\n${validationError}\n\nPlease correct your response to strictly match the required JSON schema.`
      : `Transcript:\n${input.transcriptText}${input.ocrDataJson ? `\n\nOCR Documents:\n${input.ocrDataJson}` : ""}`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serverEnv.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: {
            code: "GROQ_API_ERROR",
            message: `Groq error: ${response.status} - ${errText}`,
            retryable: true,
          },
        };
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from Groq");
      }

      const parsed = JSON.parse(content);
      const validated = SummaryLLMOutputSchema.safeParse(parsed);

      if (validated.success) {
        return { success: true, data: validated.data };
      } else {
        validationError = validated.error.message;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: { code: "GROQ_NETWORK_ERROR", message: msg, retryable: true },
      };
    }
  }

  return {
    success: false,
    error: {
      code: "GROQ_VALIDATION_FAILED",
      message: "Groq summary failed validation repeatedly.",
      retryable: false,
    },
  };
}

