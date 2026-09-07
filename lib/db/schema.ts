import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// --- ENUMS ---
export const languageEnum = pgEnum("language", ["en", "hi", "ta"]);
export const sessionStatusEnum = pgEnum("session_status", [
  "in_progress",
  "awaiting_triage",
  "completed",
  "escalated",
]);
export const docTypeEnum = pgEnum("doc_type", [
  "prescription",
  "lab_report",
  "discharge_summary",
  "imaging",
]);
export const ocrStatusEnum = pgEnum("ocr_status", [
  "pending",
  "processing",
  "complete",
  "failed",
]);

// --- TABLES ---

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  full_name: text("full_name").notNull(),
  date_of_birth: timestamp("date_of_birth").notNull(),
  gender: varchar("gender", { length: 20 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  preferred_language: languageEnum("preferred_language").notNull(),
  abha_id: text("abha_id"),
  abha_linked: boolean("abha_linked").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Foreign Key Policy: 'restrict' 
  // Justification: Medical records are highly regulated. Deleting a patient should not implicitly 
  // and silently cascade to delete clinical encounters. An explicit cleanup/anonymization routine is required.
  patient_id: uuid("patient_id")
    .references(() => patients.id, { onDelete: "restrict" }),
  kiosk_id: text("kiosk_id").notNull(),
  status: sessionStatusEnum("status").notNull(),
  started_at: timestamp("started_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Foreign Key Policy: 'cascade'
  // Justification: Conversations are ephemeral components strictly tied to a session's lifecycle. 
  // If a session is explicitly purged, its conversational transcript should be cleaned up automatically.
  session_id: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  transcript: jsonb("transcript").notNull(), // Array of {role, text, lang, timestamp}
  red_flag: boolean("red_flag").default(false).notNull(),
  red_flag_reason: text("red_flag_reason"),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Foreign Key Policy: 'cascade'
  // Justification: Documents uploaded as part of a specific session are strictly bound to it.
  session_id: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  r2_key: text("r2_key").notNull(),
  doc_type: docTypeEnum("doc_type").notNull(),
  ocr_status: ocrStatusEnum("ocr_status").notNull(),
  extracted_json: jsonb("extracted_json"),
  uploaded_at: timestamp("uploaded_at").defaultNow().notNull(),
});

export const summaries = pgTable("summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Foreign Key Policy: 'cascade'
  // Justification: The clinical summary is derived entirely from the session interactions. 
  // Purging the session logically purges the generated summary.
  session_id: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  chief_complaint: text("chief_complaint").notNull(),
  hpi: text("hpi").notNull(),
  past_history: jsonb("past_history").notNull(),
  drug_allergy_history: jsonb("drug_allergy_history").notNull(),
  family_history: text("family_history").notNull(),
  personal_history: text("personal_history").notNull(),
  ros: jsonb("ros").notNull(),
  prior_investigations: jsonb("prior_investigations").notNull(),
  ayush_assessment: jsonb("ayush_assessment"), // Prakriti/Vikriti/Agni/Koshtha/Ahara-Vihara fields
  physician_edited: boolean("physician_edited").default(false).notNull(),
  finalized_at: timestamp("finalized_at"),
});

export const abdmLinks = pgTable("abdm_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Foreign Key Policy: 'cascade'
  // Justification: If a patient profile is legitimately purged from the system (e.g., patient request / data retention), 
  // their ABDM integration links should be destroyed immediately to avoid dangling PHI/ABHA linkages.
  patient_id: uuid("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  abha_number: text("abha_number").notNull(),
  consent_artifact_id: text("consent_artifact_id"),
  linked_at: timestamp("linked_at").defaultNow().notNull(),
});

// --- ZOD SCHEMAS ---

export const insertPatientSchema = createInsertSchema(patients);
export const insertSessionSchema = createInsertSchema(sessions);
export const insertConversationSchema = createInsertSchema(conversations);
export const insertDocumentSchema = createInsertSchema(documents);
export const insertSummarySchema = createInsertSchema(summaries);
export const insertAbdmLinkSchema = createInsertSchema(abdmLinks);
