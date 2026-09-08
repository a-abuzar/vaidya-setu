import { z } from "zod";
import type { Result } from "@/lib/types";
import { serverEnv } from "../env";
import {
  TriageOutputSchema,
  type TriageOutput,
  SummaryLLMOutputSchema,
  type SummaryLLMOutput,
} from "./groq";
import { GoogleGenerativeAI } from "@google/generative-ai";

export { SummaryLLMOutputSchema, type SummaryLLMOutput } from "./groq";

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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createFallbackSummary(transcriptText: string): SummaryLLMOutput {
  const lines = transcriptText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const patientLines = lines.filter((l) => l.toUpperCase().startsWith("PATIENT:"));
  const firstComplaint =
    patientLines[0]?.replace(/^PATIENT:\s*/i, "").trim() || "Clinical consultation recorded";

  return {
    chiefComplaint: firstComplaint.slice(0, 150),
    hpiNarrative:
      lines.slice(0, 6).join("; ") ||
      "Patient completed kiosk intake. Full conversation captured in encounter transcript.",
    pastHistory: ["Refer to attached intake transcript"],
    drugAllergyHistory: ["NKDA (Unconfirmed - verify with attending physician)"],
    familyHistory: "Non-contributory / Not reported",
    personalHistory: "Not reported during kiosk triage",
    reviewOfSystems: {
      constitutional: "Reported in intake dialogue",
    },
    priorInvestigations: ["No prior investigations recorded"],
    ayushAssessment: null,
  };
}

export async function generateSummaryGemini(
  transcriptText: string,
  includeAyush: boolean
): Promise<Result<SummaryLLMOutput>> {
  const systemPrompt = `You are a clinical documentation physician and AYUSH expert synthesizing an outpatient encounter for an attending doctor's dashboard.
You are given the full transcript of a patient kiosk intake interview.
Your task is to synthesize this encounter into an authoritative, highly professional, structured clinical summary that an attending physician can quickly scan, trust, and act upon.

Clinical Documentation Standards:
1. chiefComplaint:
   - Must use formal clinical medical terminology with exact symptom duration.
   - Format: "[Primary symptom/condition] for [duration]" (e.g. "Acute epigastric pain radiating to back for 3 days", "Productive cough with low-grade pyrexia for 1 week").
   - Never use informal layperson phrasing.

2. hpiNarrative:
   - A comprehensive, clinically structured narrative paragraph detailing the History of Present Illness.
   - For pain/localized complaints, incorporate SOCRATES criteria: Site, Onset, Character, Radiation, Associated symptoms, Timing/Duration, Exacerbating/Relieving factors, Severity (0-10 scale).
   - Detail progression (worsening, improving, or constant).
   - Explicitly document pertinent negatives (e.g., "Denies hemoptysis, chest pain, syncope, or unprovoked dyspnea").
   - Maintain objective, third-person medical documentation tone.

3. pastHistory:
   - An array of concise medical strings detailing diagnosed chronic conditions, prior surgeries, or significant hospitalizations.
   - Format: "Condition (duration/status)" (e.g. ["Type 2 Diabetes Mellitus (managed, 4 years)", "Primary Hypertension", "No prior surgical interventions reported"]).
   - If none reported, return ["No significant past medical or surgical history reported"].

4. drugAllergyHistory:
   - An array of current medications, dosages, and documented adverse drug reactions or allergies.
   - Always clearly specify allergy status (e.g., "Allergies: NKDA (No Known Drug Allergies)" or "Allergies: Penicillin (urticaria)").
   - List active medications (e.g., ["Tab Metformin 500mg BD", "Tab Amlodipine 5mg OD"]).
   - If none reported, return ["No active prescription medications reported", "NKDA (No known drug allergies)"].

5. familyHistory:
   - A concise clinical summary of hereditary, metabolic, or cardiovascular diseases in first-degree relatives (e.g. "Strong maternal history of Type 2 Diabetes; non-contributory for early CAD"). If none, "Non-contributory".

6. personalHistory:
   - Systematic lifestyle factors: Diet (Vegetarian / Non-vegetarian / Sattvic), sleep patterns, bowel and bladder habits, tobacco use, alcohol consumption, physical activity.

7. reviewOfSystems:
   - A comprehensive key-value dictionary categorizing positive and pertinent negative symptoms across major organ systems:
     - "constitutional": e.g. "Fatigue present; denies fever, chills, or unintentional weight loss"
     - "respiratory": e.g. "Productive cough; denies dyspnea, wheezing, or hemoptysis"
     - "cardiovascular": e.g. "Denies chest pain, palpitations, or orthopnea"
     - "gastrointestinal": e.g. "Mild epigastric discomfort; denies nausea, vomiting, melena, or bowel disturbance"
     - "musculoskeletal": e.g. "Generalized myalgia; denies joint swelling or erythema"
     - "neurological": e.g. "Denies headache, dizziness, syncope, or focal deficits"
   - Include any other relevant systems mentioned (e.g. "integumentary", "genitourinary").

8. priorInvestigations:
   - An array of laboratory tests, imaging reports, or diagnostic procedures mentioned by the patient with findings/dates if available (e.g. ["CBC (2 days ago - reports normal Hb)", "Chest Radiograph PA view (unremarkable)"]).
   - If none, return ["No prior investigations reported"].

9. ayushAssessment:
${
  includeAyush
    ? `   - A structured AYUSH Dashavidha Pariksha assessment:
     - prakriti: Constitutional baseline dosha (e.g. "Vata-Pitta predominant", "Pitta-Kapha", "Kapha")
     - vikriti: Current morbidity/doshic imbalance (e.g. "Vata vriddhi with Kapha avarodha", "Pitta prakopa")
     - agni: Digestive fire state (e.g. "Manda Agni (sluggish digestion)", "Vishama Agni (irregular)", "Tikshna Agni", "Sama Agni")
     - koshtha: Bowel habit (e.g. "Krura Koshtha (constipated/hard)", "Mridu Koshtha (soft/loose)", "Madhyama Koshtha (regular)")
     - aharaVihara: Dietary and lifestyle habits (e.g. "Irregular meal timings, excessive dry/cold food intake, disrupted sleep")
     - nidana: Identified etiological factors (e.g. "Sheetala ahara sevana, ratrijagarana")
     - samprapti: Concise pathogenesis summary (e.g. "Vitiated Vata lodging in Uras causing Kasa and Shiroshoola")`
    : `   - null`
}

Output Format:
You MUST respond with valid JSON ONLY matching the requested schema. No conversational preamble, no markdown backticks, no explanations.`;

  let attempt = 0;
  let validationError = "";
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash", generationConfig: { responseMimeType: "application/json" } });

  while (attempt < 2) {
    attempt++;
    const userPrompt = validationError
      ? `Transcript:\n${transcriptText}\n\nYour previous response failed validation with the following error:\n${validationError}\n\nPlease correct your response to strictly match the JSON schema.`
      : `Transcript:\n${transcriptText}`;

    try {
      const result = await withTimeout(
        model.generateContent([
          { text: systemPrompt },
          { text: userPrompt },
        ]),
        10000,
        "Gemini summary request timed out after 10000ms"
      );
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
