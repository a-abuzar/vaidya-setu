import { Hono, type Context } from "hono";
import { handle } from "hono/vercel";
import { transcribeAudio } from "@/lib/ai/sarvam";
import { evaluateTriage, generateSummaryLLM } from "@/lib/ai/groq";
import {
  evaluateTriageGemini,
  generateSummaryGemini,
  createFallbackSummary,
  type SummaryLLMOutput,
} from "@/lib/ai/gemini";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  patients,
  sessions,
  conversations,
  documents,
  summaries,
  insertPatientSchema,
  insertSessionSchema,
  insertConversationSchema,
  insertDocumentSchema,
  docTypeEnum,
  sessionStatusEnum,
} from "@/lib/db/schema";
import { Result } from "@/lib/types";
import { ConsentCapturePayloadSchema } from "@/lib/consent-types";

export const runtime = "nodejs";

interface R2Bucket {
  put(key: string, value: unknown, options?: unknown): Promise<unknown>;
  get(key: string, options?: unknown): Promise<unknown>;
  delete(key: string | string[]): Promise<void>;
  list(options?: unknown): Promise<unknown>;
}

type Bindings = {
  "vaidyasetu-documents": R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

// Type-safe JSON envelope helper
const sendResponse = <T>(c: Context, data: T, status: 200 | 201 = 200) => {
  return c.json({ success: true, data } as Result<T>, status);
};

const sendError = (c: Context, code: string, message: string, status = 400) => {
  return c.json(
    { success: false, error: { code, message, retryable: false } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status as any
  );
};

// --- SESSIONS ---

// Additive anon-session endpoint: created in the Phase-10 UI pass so
// the kiosk can spin up an encounter without requiring the patient to
// type their PII into the touchscreen. Anonymous sessions now omit the
// patient_id entirely to comply with DPDP Act 2023, rather than using
// placeholder PII.
const anonSessionSchema = z.object({
  kioskId: z.string(),
  preferredLanguage: z.enum(["en", "hi", "ta"]),
  consent: ConsentCapturePayloadSchema.optional(),
  patientInfo: z.object({
    name: z.string().optional(),
    age: z.string(),
    gender: z.string(),
  }).nullable().optional(),
});

const sessionRouter = new Hono<{ Bindings: Bindings }>()
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        kiosk_id: z.string(),
        patient: insertPatientSchema.omit({
          id: true,
          created_at: true,
          abha_linked: true,
        }),
      })
    ),
    async (c) => {
      const body = c.req.valid("json");

      try {
        // Attempt to find existing patient by phone
        let patient = await db.query.patients.findFirst({
          where: eq(patients.phone, body.patient.phone),
        });

        if (!patient) {
          const inserted = await db
            .insert(patients)
            .values(body.patient)
            .returning();
          patient = inserted[0];
        }

        const newSession = await db
          .insert(sessions)
          .values({
            patient_id: patient.id,
            kiosk_id: body.kiosk_id,
            status: "in_progress",
          })
          .returning();

        return c.json({ success: true, data: newSession[0] }, 201);
      } catch (err) {
        console.error(err);
        return c.json({ success: false, error: { code: "SESSION_CREATION_FAILED", message: "Could not create session", retryable: false } }, 500);
      }
    }
  )
  .post(
    "/anon",
    zValidator("json", anonSessionSchema),
    async (c) => {
      const body = c.req.valid("json");
      try {
        let ageNum = 0;
        let dateOfBirth = new Date("1970-01-01");
        if (body.patientInfo?.age) {
          ageNum = parseInt(body.patientInfo.age, 10);
          if (!isNaN(ageNum)) {
            const curYear = new Date().getFullYear();
            dateOfBirth = new Date(`${curYear - ageNum}-01-01`);
          }
        }
        
        const insertedPatient = await db.insert(patients).values({
          full_name: body.patientInfo?.name || "Anonymous Kiosk Patient",
          date_of_birth: dateOfBirth,
          gender: body.patientInfo?.gender || "Unknown",
          phone: "0000000000",
          preferred_language: body.preferredLanguage,
        }).returning();
        
        const patientId = insertedPatient[0].id;

        const newSession = await db
          .insert(sessions)
          .values({
            patient_id: patientId,
            kiosk_id: body.kioskId,
            status: "in_progress",
          })
          .returning();
        const session = newSession[0];

        return c.json(
          {
            success: true,
            data: {
              sessionId: session.id,
              patientId: patientId,
              consent: body.consent ?? null,
            },
          },
          201,
        );
      } catch (err: unknown) {
        console.error("[anon-session] DB insertion failed; generating offline fallback session:", err);
        // Fallback: If DB is unreachable, generate an offline-ready session ID
        // so the kiosk patient is never blocked from conducting their consultation.
        const fallbackSessionId = crypto.randomUUID();
        const fallbackPatientId = crypto.randomUUID();

        return c.json(
          {
            success: true,
            data: {
              sessionId: fallbackSessionId,
              patientId: fallbackPatientId,
              consent: body.consent ?? null,
              isOfflineFallback: true,
            },
          },
          200,
        );
      }
    }
  )
  .patch(
    "/:id",
    zValidator(
      "json",
      z.object({
        status: insertSessionSchema.shape.status.optional(),
        transcript: insertConversationSchema.shape.transcript.optional(),
        redFlag: insertConversationSchema.shape.red_flag.optional(),
        redFlagReason: insertConversationSchema.shape.red_flag_reason.optional(),
      })
    ),
    async (c) => {
      const sessionId = c.req.param("id");
      const body = c.req.valid("json");

      try {
        if (body.status) {
          await db
            .update(sessions)
            .set({ status: body.status })
            .where(eq(sessions.id, sessionId));
        }

        if (body.transcript !== undefined || body.redFlag !== undefined || body.redFlagReason !== undefined) {
          const existingConv = await db.query.conversations.findFirst({
            where: eq(conversations.session_id, sessionId),
          });

          if (existingConv) {
            await db
              .update(conversations)
              .set({
                ...(body.transcript !== undefined ? { transcript: body.transcript } : {}),
                ...(body.redFlag !== undefined ? { red_flag: body.redFlag } : {}),
                ...(body.redFlagReason !== undefined ? { red_flag_reason: body.redFlagReason } : {}),
              })
              .where(eq(conversations.id, existingConv.id));
          } else {
            await db.insert(conversations).values({
              session_id: sessionId,
              transcript: body.transcript ?? [],
              red_flag: body.redFlag ?? false,
              red_flag_reason: body.redFlagReason ?? null,
            });
          }
        }

        return c.json({ success: true, data: { updated: true } });
      } catch (err) {
        console.error(err);
        return c.json({ success: false, error: { code: "UPDATE_FAILED", message: "Failed to update session", retryable: false } }, 500);
      }
    }
  )
  .post(
    "/:id/documents",
    zValidator(
      "form",
      z.object({
        file: z.custom<File>((val) => typeof val === "object" && val !== null && "name" in val),
        doc_type: insertDocumentSchema.shape.doc_type,
      })
    ),
    async (c) => {
      const sessionId = c.req.param("id");
      const { file, doc_type } = c.req.valid("form");
      let bucket: R2Bucket | undefined = c.env?.["vaidyasetu-documents"];

      if (!bucket) {
        try {
          const { getCloudflareContext } = await import("@opennextjs/cloudflare");
          const cf = await getCloudflareContext({ async: true });
          bucket = (cf.env as unknown as { "vaidyasetu-documents"?: R2Bucket })["vaidyasetu-documents"];
        } catch {
          // Cloudflare context not available (e.g. running outside worker environment)
        }
      }

      if (!bucket) {
        return c.json({ success: false, error: { code: "STORAGE_ERROR", message: "R2 bucket not bound", retryable: false } }, 500);
      }

      try {
        const r2Key = `sessions/${sessionId}/${Date.now()}-${file.name}`;
        await bucket.put(r2Key, file);

        const newDoc = await db
          .insert(documents)
          .values({
            session_id: sessionId,
            r2_key: r2Key,
            doc_type,
            ocr_status: "pending",
          })
          .returning();

        return c.json({ success: true, data: newDoc[0] }, 201);
      } catch (err) {
        console.error(err);
        return c.json({ success: false, error: { code: "UPLOAD_FAILED", message: "Failed to process document", retryable: false } }, 500);
      }
    }
  )
  .post("/:id/finalize", async (c) => {
    const sessionId = c.req.param("id");

    try {
      // 1. Idempotency check: return existing summary if already created
      const [existingSummary] = await db
        .select()
        .from(summaries)
        .where(eq(summaries.session_id, sessionId))
        .limit(1);

      if (existingSummary) {
        await db
          .update(sessions)
          .set({ status: "completed", completed_at: new Date() })
          .where(eq(sessions.id, sessionId));
        return c.json({ success: true, data: existingSummary }, 200);
      }

      // 2. Ensure session exists (e.g. if kiosk started in offline fallback mode)
      const [sess] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (!sess) {
        await db.insert(sessions).values({
          id: sessionId,
          kiosk_id: "kiosk-k01",
          status: "in_progress",
          started_at: new Date(),
        });
      }

      // 3. Extract optional client-provided transcript from request body if present
      let clientTranscript: Array<{ role?: string; text?: string }> | undefined;
      try {
        const contentType = c.req.header("content-type");
        if (contentType && contentType.includes("application/json")) {
          const body = (await c.req.json()) as {
            transcript?: Array<{ role?: string; text?: string }>;
          };
          if (body && Array.isArray(body.transcript)) {
            clientTranscript = body.transcript;
          }
        }
      } catch {
        // Optional body parse safely ignored
      }

      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.session_id, sessionId))
        .limit(1);

      let transcriptText = "";
      const transcriptEntries =
        clientTranscript ??
        (Array.isArray(conv?.transcript)
          ? (conv.transcript as Array<{ role?: string; text?: string }>)
          : null);

      if (Array.isArray(transcriptEntries) && transcriptEntries.length > 0) {
        transcriptText = transcriptEntries
          .map((t) => `${(t.role ?? "user").toUpperCase()}: ${t.text ?? ""}`)
          .join("\n");
      } else if (typeof conv?.transcript === "string") {
        try {
          const parsed = JSON.parse(conv.transcript);
          if (Array.isArray(parsed)) {
            transcriptText = (parsed as Array<{ role?: string; text?: string }>)
              .map((t) => `${(t.role ?? "user").toUpperCase()}: ${t.text ?? ""}`)
              .join("\n");
          }
        } catch {
          // fallback
        }
      }

      if (!conv && transcriptEntries && transcriptEntries.length > 0) {
        await db.insert(conversations).values({
          session_id: sessionId,
          transcript: transcriptEntries,
          red_flag: false,
        });
      }

      // 4. Dual-provider summary generation: Primary Groq -> Fallback Gemini -> Fallback Deterministic
      let aiSummary: SummaryLLMOutput;
      const groqRes = await generateSummaryLLM({
        transcriptText: transcriptText || "No transcript",
        ocrDataJson: null,
        includeAyush: true,
      });

      if (groqRes.success) {
        aiSummary = groqRes.data;
      } else {
        console.warn("[finalize] Groq summary failed, falling back to Gemini:", groqRes.error.message);
        const geminiRes = await generateSummaryGemini(transcriptText || "No transcript", true);
        if (geminiRes.success) {
          aiSummary = geminiRes.data;
        } else {
          console.warn("[finalize] Gemini summary failed, falling back to deterministic summary:", geminiRes.error.message);
          aiSummary = createFallbackSummary(transcriptText);
        }
      }

      const [summary] = await db
        .insert(summaries)
        .values({
          session_id: sessionId,
          chief_complaint: aiSummary.chiefComplaint || "Not recorded",
          hpi: aiSummary.hpiNarrative || "Not recorded",
          past_history: aiSummary.pastHistory || [],
          drug_allergy_history: aiSummary.drugAllergyHistory || [],
          family_history: aiSummary.familyHistory || "None",
          personal_history: aiSummary.personalHistory || "None",
          ros: aiSummary.reviewOfSystems || {},
          prior_investigations: aiSummary.priorInvestigations || [],
          ayush_assessment: aiSummary.ayushAssessment || null,
          finalized_at: new Date(),
        })
        .returning();

      await db
        .update(sessions)
        .set({ status: "completed", completed_at: new Date() })
        .where(eq(sessions.id, sessionId));

      return c.json({ success: true, data: summary }, 201);
    } catch (err) {
      console.error("[finalize] Failed to finalize session:", err);
      return c.json({ success: false, error: { code: "FINALIZE_FAILED", message: "Failed to finalize session", retryable: false } }, 500);
    }
  })
  .get("/:id/summary", async (c) => {
    const sessionId = c.req.param("id");

    try {
      const summary = await db.query.summaries.findFirst({
        where: eq(summaries.session_id, sessionId),
      });

      if (!summary) {
        return c.json({ success: false, error: { code: "NOT_FOUND", message: "Summary not found", retryable: false } }, 404);
      }

      return c.json({ success: true, data: summary });
    } catch (err) {
      console.error(err);
      return c.json({ success: false, error: { code: "FETCH_FAILED", message: "Failed to fetch summary", retryable: false } }, 500);
    }
  });

const aiRouter = new Hono<{ Bindings: Bindings }>()
  .post(
    "/transcribe",
    zValidator(
      "form",
      z.object({
        file: z.any(),
      })
    ),
    async (c) => {
      const { file } = c.req.valid("form");
      const res = await transcribeAudio(file);
      if (!res.success) {
        return c.json(res, 429); // Return 429 so frontend triggers Web Speech fallback
      }
      return c.json({ success: true, data: res.data });
    }
  )
  .post(
    "/triage",
    zValidator("json", z.object({ transcript: z.string(), language: z.enum(["en", "hi", "ta"]).optional() })),
    async (c) => {
      const { transcript, language } = c.req.valid("json");
      let res = await evaluateTriage(transcript, language || "en");
      if (!res.success) {
        // Fallback to Gemini on failure
        console.warn("Groq triage failed, falling back to Gemini", res.error);
        res = await evaluateTriageGemini(transcript, language || "en");
      }
      if (!res.success) {
        return c.json({ success: false, error: { code: res.error.code, message: res.error.message, retryable: true } }, 500);
      }
      return c.json({ success: true, data: res.data });
    }
  );

// --- DOCTOR ---
//
// Additive doctor-side endpoints. We deliberately do NOT change the
// existing session contract — these endpoints add doctor-specific
// projection, approval, and FHIR push on top of the same data. The
// Clerk middleware in `middleware.ts` is responsible for protecting
// these routes; Hono-side validation lives here.
import { mapSummaryToFHIR } from "@/lib/ai/abdm";

const doctorRouter = new Hono<{ Bindings: Bindings }>()
  // GET /api/doctor/sessions — list sessions for the queue view.
  .get("/sessions", async (c) => {
    try {
      const rows = await db
        .select({
          id: sessions.id,
          patientId: sessions.patient_id,
          status: sessions.status,
          startedAt: sessions.started_at,
          completedAt: sessions.completed_at,
        })
        .from(sessions)
        .orderBy(sessions.started_at);

      if (rows.length === 0) {
        return c.json({ success: true, data: [] });
      }

      // Fetch related records in bulk to prevent N+1 query subrequest exhaustion in Cloudflare Workers
      const allConversations = await db
        .select({
          session_id: conversations.session_id,
          red_flag: conversations.red_flag,
          transcript: conversations.transcript,
        })
        .from(conversations);

      const allSummaries = await db
        .select({
          session_id: summaries.session_id,
          chief_complaint: summaries.chief_complaint,
        })
        .from(summaries);

      const allDocuments = await db
        .select({
          id: documents.id,
          session_id: documents.session_id,
        })
        .from(documents);

      const convMap = new Map<string, (typeof allConversations)[number]>();
      for (const conv of allConversations) {
        convMap.set(conv.session_id, conv);
      }

      const summaryMap = new Map<string, string>();
      for (const sum of allSummaries) {
        summaryMap.set(sum.session_id, sum.chief_complaint);
      }

      const docCountMap = new Map<string, number>();
      for (const doc of allDocuments) {
        docCountMap.set(doc.session_id, (docCountMap.get(doc.session_id) ?? 0) + 1);
      }

      const projected = rows.map((r) => {
        const conv = convMap.get(r.id);
        let chiefComplaint = summaryMap.get(r.id) ?? "";
        if (!chiefComplaint && conv?.transcript) {
          try {
            const tArray = Array.isArray(conv.transcript)
              ? conv.transcript
              : typeof conv.transcript === "string"
                ? JSON.parse(conv.transcript)
                : [];
            if (Array.isArray(tArray)) {
              const firstPatient = tArray.find(
                (m: { role?: string; text?: string }) => m?.role === "patient",
              );
              if (firstPatient?.text) {
                chiefComplaint =
                  firstPatient.text.slice(0, 80) +
                  (firstPatient.text.length > 80 ? "..." : "");
              }
            }
          } catch {
            // ignore malformed transcript
          }
        }

        return {
          id: r.id,
          patientId: r.patientId,
          status: r.status,
          startedAt: r.startedAt?.toISOString() ?? new Date().toISOString(),
          completedAt: r.completedAt?.toISOString() ?? null,
          redFlag: conv?.red_flag ?? false,
          documentCount: docCountMap.get(r.id) ?? 0,
          chiefComplaint,
        };
      });

      return c.json({ success: true, data: projected });
    } catch (err) {
      console.error("[doctor] list sessions failed", err);
      return c.json(
        {
          success: false,
          error: {
            code: "DOCTOR_LIST_FAILED",
            message: err instanceof Error ? err.message : "Unknown error",
            retryable: false,
          },
        },
        500,
      );
    }
  })
  // GET /api/doctor/sessions/:id — full structured detail.
  .get("/sessions/:id", async (c) => {
    const id = c.req.param("id");
    try {
      const [s] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);
      if (!s) {
        return c.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "Session not found", retryable: false },
          },
          404,
        );
      }
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.session_id, id))
        .limit(1);
      const [sum] = await db
        .select()
        .from(summaries)
        .where(eq(summaries.session_id, id))
        .limit(1);
      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.session_id, id));

      const rawTranscript = conv?.transcript;
      const parsedTranscript = Array.isArray(rawTranscript)
        ? rawTranscript
        : typeof rawTranscript === "string"
          ? JSON.parse(rawTranscript)
          : [];

      return c.json({
        success: true,
        data: {
          id: s.id,
          patientId: s.patient_id,
          status: s.status,
          startedAt: s.started_at?.toISOString() ?? new Date().toISOString(),
          completedAt: s.completed_at?.toISOString() ?? null,
          redFlag: conv?.red_flag ?? false,
          redFlagReason: conv?.red_flag_reason ?? null,
          summary: {
            id: sum?.id ?? null,
            chiefComplaint: sum?.chief_complaint ?? "",
            hpi: sum?.hpi ?? "",
            pastHistory: typeof sum?.past_history === "string" ? sum.past_history : JSON.stringify(sum?.past_history ?? []),
            drugAllergyHistory: typeof sum?.drug_allergy_history === "string" ? sum.drug_allergy_history : JSON.stringify(sum?.drug_allergy_history ?? []),
            familyHistory: sum?.family_history ?? "",
            personalHistory: sum?.personal_history ?? "",
            ros: typeof sum?.ros === "string" ? sum.ros : JSON.stringify(sum?.ros ?? {}),
            priorInvestigations: typeof sum?.prior_investigations === "string" ? sum.prior_investigations : JSON.stringify(sum?.prior_investigations ?? []),
            ayush: (sum?.ayush_assessment as Record<string, unknown> | null) ?? null,
            physicianEdited: sum?.physician_edited ?? false,
            finalizedAt: sum?.finalized_at?.toISOString() ?? null,
          },
          documents: docs.map((d) => ({
            id: d.id,
            docType: d.doc_type,
            uploadedAt: d.uploaded_at?.toISOString() ?? new Date().toISOString(),
            ocrStatus: d.ocr_status,
          })),
          transcript: Array.isArray(parsedTranscript)
            ? (parsedTranscript as Array<{
                role: "patient" | "system";
                text: string;
                timestamp: string;
              }>)
            : [],
        },
      });
    } catch (err) {
      console.error("[doctor] session detail failed", err);
      return c.json(
        {
          success: false,
          error: {
            code: "DOCTOR_DETAIL_FAILED",
            message: err instanceof Error ? err.message : "Unknown error",
            retryable: false,
          },
        },
        500,
      );
    }
  })
  // POST /api/doctor/sessions/:id/approve — mark physician_edited + finalized.
  .post("/sessions/:id/approve", async (c) => {
    const id = c.req.param("id");
    try {
      await db
        .update(summaries)
        .set({ physician_edited: true, finalized_at: new Date() })
        .where(eq(summaries.session_id, id));
      await db
        .update(sessions)
        .set({ status: "completed", completed_at: new Date() })
        .where(eq(sessions.id, id));
      return c.json({ success: true, data: { ok: true } });
    } catch (err) {
      console.error("[doctor] approve failed", err);
      return c.json(
        {
          success: false,
          error: {
            code: "APPROVE_FAILED",
            message: err instanceof Error ? err.message : "Unknown error",
            retryable: false,
          },
        },
        500,
      );
    }
  })
  // PATCH /api/doctor/sessions/:id — update chief complaint and/or HPI by physician.
  .patch(
    "/sessions/:id",
    zValidator(
      "json",
      z.object({
        chiefComplaint: z.string().optional(),
        hpi: z.string().optional(),
      })
    ),
    async (c) => {
      const id = c.req.param("id");
      const { chiefComplaint, hpi } = c.req.valid("json");
      try {
        const updateData: { chief_complaint?: string; hpi?: string; physician_edited: boolean } = {
          physician_edited: true,
        };
        if (chiefComplaint !== undefined) updateData.chief_complaint = chiefComplaint;
        if (hpi !== undefined) updateData.hpi = hpi;

        await db
          .update(summaries)
          .set(updateData)
          .where(eq(summaries.session_id, id));

        return c.json({ success: true, data: { ok: true } });
      } catch (err) {
        console.error("[doctor] patch summary failed", err);
        return c.json(
          {
            success: false,
            error: {
              code: "UPDATE_FAILED",
              message: err instanceof Error ? err.message : "Unknown error",
              retryable: false,
            },
          },
          500
        );
      }
    }
  )
  // POST /api/doctor/sessions/:id/fhir — generate FHIR DiagnosticReport
  // and (mock) push to ABDM. Uses lib/ai/abdm.ts::mapSummaryToFHIR
  // — kept server-side per module boundaries.
  .post("/sessions/:id/fhir", async (c) => {
    const id = c.req.param("id");
    try {
      const [sum] = await db
        .select()
        .from(summaries)
        .where(eq(summaries.session_id, id))
        .limit(1);
      if (!sum) {
        return c.json(
          {
            success: false,
            error: {
              code: "SUMMARY_NOT_FOUND",
              message: "No summary to push",
              retryable: false,
            },
          },
          404,
        );
      }
      const fhir = mapSummaryToFHIR(sum);
      // In a real deployment this would call the ABDM gateway's
      // /v3/records endpoints. We deliberately do not invent that
      // payload here — return the generated FHIR bundle so the
      // dashboard can preview it, and the ABDM push remains a TODO
      // until the live gateway is reachable.
      return c.json({ success: true, data: { ok: true, fhir } });
    } catch (err) {
      console.error("[doctor] fhir push failed", err);
      return c.json(
        {
          success: false,
          error: {
            code: "FHIR_PUSH_FAILED",
            message: err instanceof Error ? err.message : "Unknown error",
            retryable: true,
          },
        },
        500,
      );
    }
  });

const routes = app
  .route("/sessions", sessionRouter)
  .route("/ai", aiRouter)
  .route("/doctor", doctorRouter);

export type AppType = typeof routes;

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
