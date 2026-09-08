import { describe, it, expect } from "vitest";
import { generateSummaryLLM, SummaryLLMOutputSchema } from "./groq";
import { createFallbackSummary } from "./gemini";

describe("Clinical Summary Generation", () => {
  it("creates valid deterministic fallback summary conforming to SummaryLLMOutputSchema", () => {
    const transcriptText = `PATIENT: I have high fever and severe headache for 2 days
DOCTOR: Have you taken any medications?
PATIENT: Just Paracetamol yesterday.`;

    const fallback = createFallbackSummary(transcriptText);
    const validated = SummaryLLMOutputSchema.safeParse(fallback);

    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validated.data.chiefComplaint).toContain("high fever");
      expect(Array.isArray(validated.data.pastHistory)).toBe(true);
      expect(Array.isArray(validated.data.drugAllergyHistory)).toBe(true);
      expect(Array.isArray(validated.data.priorInvestigations)).toBe(true);
      expect(typeof validated.data.reviewOfSystems).toBe("object");
    }
  });

  it("generates clinical summary via Groq in under 5 seconds", async () => {
    const transcriptText = `PATIENT: I have acute knee pain radiating to calf for 3 days after running.
DOCTOR: Did you experience swelling?
PATIENT: Yes, mild swelling in the evening.`;

    const result = await generateSummaryLLM({
      transcriptText,
      ocrDataJson: null,
      includeAyush: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const validated = SummaryLLMOutputSchema.safeParse(result.data);
      expect(validated.success).toBe(true);
      expect(result.data.chiefComplaint.length).toBeGreaterThan(0);
      expect(result.data.hpiNarrative.length).toBeGreaterThan(0);
      expect(Array.isArray(result.data.pastHistory)).toBe(true);
    }
  }, 10000);
});
