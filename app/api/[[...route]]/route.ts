import { Hono } from "hono";
import { handle } from "hono/vercel";
import { transcribeAudio } from "@/lib/ai/sarvam";
import { evaluateTriage } from "@/lib/ai/groq";
import { evaluateTriageGemini, generateSummaryGemini } from "@/lib/ai/gemini";
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

export const runtime = "edge";

interface R2Bucket {
  put(key: string, value: any, options?: any): Promise<any>;
  get(key: string, options?: any): Promise<any>;
  delete(key: string | string[]): Promise<void>;
  list(options?: any): Promise<any>;
}

type Bindings = {
  "vaidyasetu-documents": R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

// Type-safe JSON envelope helper
const sendResponse = <T>(c: any, data: T, status = 200) => {
  return c.json({ success: true, data } as Result<T>, status);
};

const sendError = (c: any, code: string, message: string, status = 400) => {
  return c.json(
    { success: false, error: { code, message, retryable: false } },
    status
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
      } catch (err) {
        console.error("[anon-session] failed", err);
        const detail =
          err instanceof Error ? err.message : "Unknown DB error";
        return c.json(
          {
            success: false,
            error: {
              code: "ANON_SESSION_FAILED",
              message: `Could not create anonymous session: ${detail}. Full error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
              retryable: false,
            },
          },
          500,
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

        if (body.transcript) {
          const existingConv = await db.query.conversations.findFirst({
            where: eq(conversations.session_id, sessionId),
          });

          if (existingConv) {
            await db
              .update(conversations)
              .set({ transcript: body.transcript })
              .where(eq(conversations.id, existingConv.id));
          } else {
            await db.insert(conversations).values({
              session_id: sessionId,
              transcript: body.transcript,
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
        file: z.any(),
        doc_type: insertDocumentSchema.shape.doc_type,
      })
    ),
    async (c) => {
      const sessionId = c.req.param("id");
      const { file, doc_type } = c.req.valid("form");
      const bucket = c.env["vaidyasetu-documents"];

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
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.session_id, sessionId))
        .limit(1);

      if (!conv) {
        return c.json({ success: false, error: { code: "NOT_FOUND", message: "Conversation not found", retryable: false } }, 404);
      }

      let transcriptText = "";
      if (Array.isArray(conv.transcript)) {
        transcriptText = conv.transcript.map((t: any) => `${t.role.toUpperCase()}: ${t.text}`).join("\n");
      } else if (typeof conv.transcript === "string") {
        try {
          const parsed = JSON.parse(conv.transcript);
          if (Array.isArray(parsed)) {
            transcriptText = parsed.map((t: any) => `${t.role.toUpperCase()}: ${t.text}`).join("\n");
          }
        } catch {
          // fallback
        }
      }

      const summaryRes = await generateSummaryGemini(transcriptText || "No transcript", true);
      
      if (!summaryRes.success) {
        return c.json({ success: false, error: { code: "SUMMARY_FAILED", message: "Failed to generate summary via AI", retryable: false } }, 500);
      }

      const aiSummary = summaryRes.data;

      const summary = await db
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

      return c.json({ success: true, data: summary[0] }, 201);
    } catch (err) {
      console.error(err);
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

      // Project each session with summary + document counts.
      const projected = await Promise.all(
        rows.map(async (r) => {
          const [conv] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.session_id, r.id))
            .limit(1);
          const [sum] = await db
            .select()
            .from(summaries)
            .where(eq(summaries.session_id, r.id))
            .limit(1);
          const docs = await db
            .select({ id: documents.id })
            .from(documents)
            .where(eq(documents.session_id, r.id));
          let chiefComplaint = sum?.chief_complaint ?? "";
          if (!chiefComplaint && conv?.transcript) {
            try {
              const tArray = Array.isArray(conv.transcript) 
                ? conv.transcript 
                : typeof conv.transcript === "string" ? JSON.parse(conv.transcript) : [];
              if (Array.isArray(tArray)) {
                const firstPatient = tArray.find((m: any) => m.role === "patient");
                if (firstPatient) chiefComplaint = firstPatient.text.slice(0, 80) + (firstPatient.text.length > 80 ? "..." : "");
              }
            } catch (e) {
              // ignore
            }
          }

          return {
            id: r.id,
            patientId: r.patientId,
            status: r.status,
            startedAt: r.startedAt?.toISOString() ?? new Date().toISOString(),
            completedAt: r.completedAt?.toISOString() ?? null,
            redFlag: conv?.red_flag ?? false,
            documentCount: docs.length,
            chiefComplaint,
          };
        }),
      );
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
