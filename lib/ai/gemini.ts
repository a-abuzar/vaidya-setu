import { z } from "zod";
import type { Result } from "@/lib/types";

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

export async function extractDocumentOcr(input: OcrInput): Promise<Result<OcrOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}

export async function evaluateTriageFallback(input: { transcriptText: string; socratesStateJson: string | null; ayushModeEnabled: boolean }): Promise<Result<{ redFlag: boolean; redFlagReason: string | null; socratesFieldsMissing: string[]; nextQuestion: string | null; }>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}
