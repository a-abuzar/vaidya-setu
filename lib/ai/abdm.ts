import { z } from "zod";
import type { Result } from "@/lib/types";
import { serverEnv } from "../env";
import { type InferSelectModel } from "drizzle-orm";
import { summaries } from "../db/schema";

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

type Summary = InferSelectModel<typeof summaries>;

let tokenCache: AbdmTokenOutput | null = null;

export async function getGatewaySessionToken(): Promise<Result<AbdmTokenOutput>> {
  if (tokenCache && new Date(tokenCache.issuedAt).getTime() + tokenCache.expiresIn * 1000 > Date.now() + 60000) {
    return { success: true, data: tokenCache };
  }

  try {
    const response = await fetch("https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: serverEnv.ABDM_CLIENT_ID,
        clientSecret: serverEnv.ABDM_CLIENT_SECRET,
        grantType: "client_credentials",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: { code: "ABDM_AUTH_FAILED", message: `ABDM Auth failed: ${err}`, retryable: true } };
    }

    const data = await response.json();
    
    // API returns accessToken and expiresIn (in seconds)
    tokenCache = {
      accessToken: data.accessToken,
      expiresIn: data.expiresIn || 900,
      issuedAt: new Date().toISOString(),
      tokenType: "Bearer",
    };

    return { success: true, data: tokenCache };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Network error";
    return { success: false, error: { code: "ABDM_NETWORK_ERROR", message: msg, retryable: true } };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function verifyAbha(_input: AbhaVerifyInput, _token: AbdmTokenOutput): Promise<Result<AbhaVerifyOutput>> {
  return { success: false, error: { code: "NOT_IMPLEMENTED", message: "Stub", retryable: false } };
}

export function mapSummaryToFHIR(summary: Summary): FhirDiagnosticReport {
  // Field mappings:
  // id: mapped to summary.id
  // finalized_at: mapped to effectiveDateTime
  //
  // No FHIR R4 equivalent in this simple DiagnosticReport shape — omitted:
  // session_id
  // chief_complaint
  // hpi
  // past_history
  // drug_allergy_history
  // family_history
  // personal_history
  // ros
  // prior_investigations
  // ayush_assessment
  // physician_edited

  return {
    resourceType: "DiagnosticReport",
    id: summary.id,
    meta: {
      profile: [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord"
      ]
    },
    status: "final",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "11502-2",
          display: "Laboratory report"
        }
      ]
    },
    subject: {
      reference: "Patient/example-patient-id"
    },
    effectiveDateTime: summary.finalized_at ? summary.finalized_at.toISOString() : new Date().toISOString(),
    performer: [
      {
        reference: "Organization/example-lab-id"
      }
    ],
    result: [
      {
        reference: "Observation/example-observation-id"
      }
    ]
  } as unknown as FhirDiagnosticReport; // Hard cast since the simplified Phase 3 schema has strict records.
}
