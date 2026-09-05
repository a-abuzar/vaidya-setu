/**
 * Shared consent type definitions.
 *
 * These types live in a plain module so they can be imported by both
 * the client-side Zustand store and the server-side Hono validators.
 * The Zustand wrapper that adds actions lives in lib/store/consent.ts.
 */
import { z } from "zod";

export const ConsentPurposeSchema = z.enum([
  "clinical_data_collection",
  "abdm_health_record_linking",
  "data_sharing_with_physician",
  "temporary_storage",
]);

export type ConsentPurpose = z.infer<typeof ConsentPurposeSchema>;

export const ALL_CONSENT_PURPOSES: ConsentPurpose[] = [
  "clinical_data_collection",
  "abdm_health_record_linking",
  "data_sharing_with_physician",
  "temporary_storage",
];

export const ConsentDecisionsSchema = z.object({
  clinical_data_collection: z.boolean(),
  abdm_health_record_linking: z.boolean(),
  data_sharing_with_physician: z.boolean(),
  temporary_storage: z.boolean(),
});

export const ConsentCapturePayloadSchema = z.object({
  decisions: ConsentDecisionsSchema,
  consentLanguage: z.enum(["en", "hi", "ta"]).nullable(),
  consentedAt: z.string().nullable(),
});

export type ConsentCapturePayload = z.infer<typeof ConsentCapturePayloadSchema>;