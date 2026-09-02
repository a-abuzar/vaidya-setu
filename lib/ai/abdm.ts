import { z } from "zod";
import type { Result } from "@/lib/types";

export const AbdmTokenInputSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
});
export type AbdmTokenInput = z.infer<typeof AbdmTokenInputSchema>;

export const AbdmTokenOutputSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
  issuedAt: z.string(),
  tokenType: z.literal("Bearer"),
});
export type AbdmTokenOutput = z.infer<typeof AbdmTokenOutputSchema>;

export const AbhaVerifyInputSchema = z.object({
  abhaIdentifier: z.string(),
  verificationMethod: z.enum(["aadhaar_otp", "mobile_otp", "demographics"]),
});
export type AbhaVerifyInput = z.infer<typeof AbhaVerifyInputSchema>;

export const AbhaVerifyOutputSchema = z.object({
  verified: z.boolean(),
  abhaNumber: z.string(),
  patientName: z.string().nullable(),
  gender: z.enum(["male", "female", "other"]).nullable(),
  dateOfBirth: z.string().nullable(),
  healthId: z.string().nullable(),
});
export type AbhaVerifyOutput = z.infer<typeof AbhaVerifyOutputSchema>;

export const FhirDiagnosticReportSchema = z.object({
  resourceType: z.literal("DiagnosticReport"),
  id: z.string().optional(),
  status: z.enum(["registered", "partial", "preliminary", "final"]),
  code: z.record(z.string(), z.unknown()),
  subject: z.record(z.string(), z.unknown()).optional(),
  result: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type FhirDiagnosticReport = z.infer<typeof FhirDiagnosticReportSchema>;

export async function getGatewaySessionToken(input: AbdmTokenInput): Promise<Result<AbdmTokenOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}

export async function verifyAbha(input: AbhaVerifyInput, token: AbdmTokenOutput): Promise<Result<AbhaVerifyOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}

export async function mapSummaryToFHIR(summaryJson: Record<string, unknown>): Promise<Result<FhirDiagnosticReport>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}
