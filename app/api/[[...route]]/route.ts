import { Hono } from "hono";
import { handle } from "hono/vercel";
import { transcribeAudio } from "@/lib/ai/sarvam";
import { evaluateTriage } from "@/lib/ai/groq";
import { evaluateTriageGemini } from "@/lib/ai/gemini";
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
      // Trigger mock summary generation
      const summary = await db
        .insert(summaries)
        .values({
          session_id: sessionId,
          chief_complaint: "Mocked chief complaint",
          hpi: "Mocked HPI",
          past_history: [],
          drug_allergy_history: [],
          family_history: "None",
          personal_history: "None",
          ros: [],
          prior_investigations: [],
          ayush_assessment: null,
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

const routes = app
  .route("/sessions", sessionRouter)
  .route("/ai", aiRouter);

export type AppType = typeof routes;

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
