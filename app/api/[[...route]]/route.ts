import { Hono } from "hono";
import { handle } from "hono/vercel";
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

        return sendResponse(c, newSession[0], 201);
      } catch (err) {
        console.error(err);
        return sendError(c, "SESSION_CREATION_FAILED", "Could not create session", 500);
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

        return sendResponse(c, { updated: true });
      } catch (err) {
        console.error(err);
        return sendError(c, "UPDATE_FAILED", "Failed to update session", 500);
      }
    }
  )
  .post(
    "/:id/documents",
    zValidator(
      "form",
      z.object({
        file: z.custom<File>((v) => v instanceof File),
        doc_type: insertDocumentSchema.shape.doc_type,
      })
    ),
    async (c) => {
      const sessionId = c.req.param("id");
      const { file, doc_type } = c.req.valid("form");
      const bucket = c.env["vaidyasetu-documents"];

      if (!bucket) {
        return sendError(c, "STORAGE_ERROR", "R2 bucket not bound", 500);
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

        return sendResponse(c, newDoc[0], 201);
      } catch (err) {
        console.error(err);
        return sendError(c, "UPLOAD_FAILED", "Failed to process document", 500);
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

      return sendResponse(c, summary[0], 201);
    } catch (err) {
      console.error(err);
      return sendError(c, "FINALIZE_FAILED", "Failed to finalize session", 500);
    }
  })
  .get("/:id/summary", async (c) => {
    const sessionId = c.req.param("id");

    try {
      const summary = await db.query.summaries.findFirst({
        where: eq(summaries.session_id, sessionId),
      });

      if (!summary) {
        return sendError(c, "NOT_FOUND", "Summary not found", 404);
      }

      return sendResponse(c, summary);
    } catch (err) {
      console.error(err);
      return sendError(c, "FETCH_FAILED", "Failed to fetch summary", 500);
    }
  });

const routes = app.route("/sessions", sessionRouter);

export type AppType = typeof routes;

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
