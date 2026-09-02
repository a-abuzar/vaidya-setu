CREATE TYPE "public"."doc_type" AS ENUM('prescription', 'lab_report', 'discharge_summary', 'imaging');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'hi', 'ta');--> statement-breakpoint
CREATE TYPE "public"."ocr_status" AS ENUM('pending', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('in_progress', 'awaiting_triage', 'completed', 'escalated');--> statement-breakpoint
CREATE TABLE "abdm_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"abha_number" text NOT NULL,
	"consent_artifact_id" text,
	"linked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"transcript" jsonb NOT NULL,
	"red_flag" boolean DEFAULT false NOT NULL,
	"red_flag_reason" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"r2_key" text NOT NULL,
	"doc_type" "doc_type" NOT NULL,
	"ocr_status" "ocr_status" NOT NULL,
	"extracted_json" jsonb,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"date_of_birth" timestamp NOT NULL,
	"gender" varchar(20) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"preferred_language" "language" NOT NULL,
	"abha_id" text,
	"abha_linked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"kiosk_id" text NOT NULL,
	"status" "session_status" NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"chief_complaint" text NOT NULL,
	"hpi" text NOT NULL,
	"past_history" jsonb NOT NULL,
	"drug_allergy_history" jsonb NOT NULL,
	"family_history" text NOT NULL,
	"personal_history" text NOT NULL,
	"ros" jsonb NOT NULL,
	"prior_investigations" jsonb NOT NULL,
	"ayush_assessment" jsonb,
	"physician_edited" boolean DEFAULT false NOT NULL,
	"finalized_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "abdm_links" ADD CONSTRAINT "abdm_links_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;