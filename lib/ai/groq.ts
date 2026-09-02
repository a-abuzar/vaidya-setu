import { z } from "zod";
import type { Result } from "@/lib/types";

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

export async function evaluateTriage(input: TriageInput): Promise<Result<TriageOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}

export async function generateSummaryLLM(input: SummaryLLMInput): Promise<Result<SummaryLLMOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}
