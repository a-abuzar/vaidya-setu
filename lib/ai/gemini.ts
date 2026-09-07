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

export async function evaluateTriageGemini(transcript: string, language: string = "en"): Promise<Result<TriageOutput>> {
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
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash", generationConfig: { responseMimeType: "application/json" } });

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

export async function generateSummaryGemini(
  transcriptText: string,
  includeAyush: boolean
): Promise<Result<SummaryLLMOutput>> {
  const systemPrompt = `You are a medical AI summarizing a clinical encounter for a doctor's dashboard.
You are given the full transcript of a patient kiosk interview.
Your task is to synthesize this into a structured clinical summary.
Extract and categorize information into the following fields:
- chiefComplaint: A single short sentence (e.g., "Fever and cough for 3 days").
- hpiNarrative: A detailed paragraph describing the History of Present Illness (SOCRATES details if applicable).
- pastHistory: An array of strings describing any past medical conditions.
- drugAllergyHistory: An array of strings describing current medications or allergies.
- familyHistory: A string summarizing family medical history.
- personalHistory: A string summarizing lifestyle (smoking, diet, etc.).
- reviewOfSystems: A key-value object of positive/negative findings by system (e.g. {"respiratory": "cough present, no wheeze"}).
- priorInvestigations: An array of strings listing any tests the patient mentioned they have taken.
${includeAyush ? `- ayushAssessment: An object with string fields: prakriti, vikriti, agni, koshtha, aharaVihara, nidana, samprapti. Estimate based on symptoms if possible, or leave null.` : `- ayushAssessment: null`}

You MUST respond with valid JSON ONLY, strictly conforming to the requested schema. Do not include markdown formatting or extra text.`;

  let attempt = 0;
  let validationError = "";
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash", generationConfig: { responseMimeType: "application/json" } });

  while (attempt < 2) {
    attempt++;
    const userPrompt = validationError
      ? `Transcript:\n${transcriptText}\n\nYour previous response failed validation with the following error:\n${validationError}\n\nPlease correct your response to strictly match the JSON schema.`
      : `Transcript:\n${transcriptText}`;

    try {
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);
      const content = result.response.text();
      const parsed = JSON.parse(content);
      const validated = SummaryLLMOutputSchema.safeParse(parsed);

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
      message: "AI summary failed validation repeatedly.",
      retryable: false,
    },
  };
}
