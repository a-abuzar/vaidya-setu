import { describe, it, expect, vi } from "vitest";
import { getGatewaySessionToken, mapSummaryToFHIR, FhirDiagnosticReportSchema } from "./abdm";
import { type InferSelectModel } from "drizzle-orm";
import { summaries } from "../db/schema";

type Summary = InferSelectModel<typeof summaries>;

describe("ABDM Sandbox Integration", () => {
  it("fetches gateway session token using mock credentials", async () => {
    // Mock the fetch call to simulate ABDM Sandbox response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: "mock-sandbox-token-12345",
        expiresIn: 900,
      }),
    });

    const result = await getGatewaySessionToken();
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accessToken).toBe("mock-sandbox-token-12345");
      expect(result.data.tokenType).toBe("Bearer");
    }
  });

  it("maps summary to FHIR DiagnosticReport and validates schema", () => {
    const mockSummary: Summary = {
      id: "test-summary-uuid",
      session_id: "test-session-uuid",
      chief_complaint: "Fever and cough",
      hpi: "Patient has had fever for 3 days.",
      past_history: [],
      drug_allergy_history: [],
      family_history: "None",
      personal_history: "Normal",
      ros: [],
      prior_investigations: [],
      ayush_assessment: null,
      physician_edited: false,
      finalized_at: new Date("2026-09-02T10:00:00Z"),
    };

    const fhirPayload = mapSummaryToFHIR(mockSummary);
    
    // Assert against the Zod schema
    const validation = FhirDiagnosticReportSchema.safeParse(fhirPayload);
    expect(validation.success).toBe(true);
    
    if (validation.success) {
      expect(validation.data.resourceType).toBe("DiagnosticReport");
      expect(validation.data.id).toBe("test-summary-uuid");
      expect(validation.data.status).toBe("final");
    }
  });
});
