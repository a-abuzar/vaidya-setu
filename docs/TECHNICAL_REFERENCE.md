# VaidyaSetu — Comprehensive Technical Reference

> **Purpose**: This document contains every technical detail an AI agent or
> new contributor needs to continue building VaidyaSetu from its current state.
> Read this file in full before writing any code.

> **Last updated**: 2026-09-03 · **Current phase**: Phase 8–10 (in progress)

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Problem Statement & Domain Context](#2-problem-statement--domain-context)
3. [Technology Stack (Exact Versions)](#3-technology-stack-exact-versions)
4. [Environment Variables](#4-environment-variables)
5. [Architecture Overview](#5-architecture-overview)
6. [Four Core Modules — Contracts](#6-four-core-modules--contracts)
7. [Database Schema (Drizzle ORM)](#7-database-schema-drizzle-orm)
8. [API Layer (Hono.js)](#8-api-layer-honojs)
9. [AI Services Layer](#9-ai-services-layer)
10. [Frontend Architecture](#10-frontend-architecture)
11. [State Management (Zustand)](#11-state-management-zustand)
12. [Type System](#12-type-system)
13. [FHIR R4 & ABDM Integration](#13-fhir-r4--abdm-integration)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Testing Strategy](#15-testing-strategy)
16. [Coding Standards & Hard Rules](#16-coding-standards--hard-rules)
17. [12-Phase Implementation Roadmap](#17-12-phase-implementation-roadmap)
18. [Current Implementation Status](#18-current-implementation-status)
19. [Open Ambiguities & TODOs](#19-open-ambiguities--todos)
20. [File Inventory](#20-file-inventory)

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Name** | VaidyaSetu (वैद्यसेतु — "Bridge of the Healer") |
| **Formerly** | MediKiosk |
| **Submission** | Ministry of AYUSH Problem Statement 26047 |
| **Category** | AI-native patient case-taking kiosk for Indian government OPDs |
| **Scale target** | 4,000–10,000 patients/day, 2–5 minute consultations |
| **Repo root** | `c:\Users\abuza\VaidyaSetu` |
| **Package name** | `vaidyasetu` (in `package.json`) |
| **Version** | `0.1.0` |
| **Private** | `true` |

---

## 2. Problem Statement & Domain Context

### What VaidyaSetu Solves

| Problem | VaidyaSetu's Answer |
|---|---|
| AYUSH OPDs still run on paper registers | Kiosk-first digital case-taking |
| No structured symptom data → no analytics | Codified observations (SNOMED / ICD mapped) |
| Practitioners lack decision support | AI differential diagnosis (LLM + rule engine) |
| No interoperability with national health infra | FHIR R4 bundles → ABDM Health Records |
| Drug names vary across traditions | Unified AYUSH formulary with standard codes |
| Low-literacy patients can't use typed forms | Voice-first (STT) + touch-optimized UI in Hindi, English, Tamil |

### AYUSH System Coverage

| Abbreviation | Full Name | Status |
|---|---|---|
| **A** | Ayurveda | Primary focus (Dashavidha Pariksha implemented) |
| **Y** | Yoga & Naturopathy | Planned |
| **U** | Unani | Planned |
| **S** | Siddha | Planned |
| **H** | Homeopathy | Planned |

The formulary and diagnostic modules use a `system` enum (`ayurveda | yoga | unani | siddha | homeopathy`) to scope per AYUSH tradition.

### Clinical Workflow

```
Patient arrives at kiosk
  → Language selection (Hindi/English/Tamil)
    → Voice/touch symptom capture (Module A)
      → Red-flag triage (SOCRATES for pain)
        → Document upload & OCR (Module B)
          → Structured summary generation (Module C)
            → ABDM consent + ABHA linking (Module D)
              → Physician review & approval
                → Prescription + FHIR push
```

---

## 3. Technology Stack (Exact Versions)

> **Source of truth**: `package.json`. Always read it before generating code.

### Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | `15.3.3` | App Router framework |
| `react` | `^19.1.0` | UI library |
| `react-dom` | `^19.1.0` | React DOM renderer |
| `hono` | `^4.7.10` | API framework (mounted on Next.js route handlers) |
| `@hono/zod-validator` | `^0.5.0` | Zod middleware for Hono |
| `@hono/clerk-auth` | `^2.0.1` | Clerk auth middleware for Hono |
| `drizzle-orm` | `^0.44.2` | Type-safe ORM |
| `@neondatabase/serverless` | `^1.0.0` | Neon HTTP driver (serverless-compatible) |
| `zod` | `^3.25.42` | Schema validation |
| `zustand` | `^5.0.5` | Client state management |
| `@clerk/nextjs` | `^6.12.12` | Authentication |
| `@google/genai` | `^1.3.0` | Google Generative AI SDK (Gemini) |
| `lucide-react` | `^0.487.0` | Icon library |
| `class-variance-authority` | `^0.7.1` | Component variant management |
| `clsx` | `^2.1.1` | Conditional className utility |
| `tailwind-merge` | `^3.3.0` | Tailwind class deduplication |
| `@radix-ui/react-slot` | `^1.2.3` | Polymorphic component primitive |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | `^5` | Language |
| `drizzle-kit` | `^0.31.1` | Migration generation & studio |
| `vitest` | `^3.2.1` | Test runner |
| `tailwindcss` | `^4.1.7` | CSS framework |
| `@tailwindcss/postcss` | `^4.1.7` | PostCSS plugin |
| `eslint` | `^9` | Linter |
| `eslint-config-next` | `15.3.3` | Next.js ESLint config |

### External AI Services (not npm packages — API keys required)

| Service | Model | Purpose |
|---|---|---|
| **Sarvam AI** | `saaras:v3` (STT), `bulbul:v3` (TTS) | Indic speech-to-text, text-to-speech |
| **Groq** | `qwen/qwen3.8-27b` | Primary triage LLM (SOCRATES, red-flags, follow-ups) |
| **Google Gemini** | `gemini-3.6-flash` | Triage fallback LLM, OCR/Vision |
| **ABDM Sandbox** | V3 APIs | ABHA verification, FHIR health record exchange |

### Rejected Technologies (Do Not Install)

| Package | Reason |
|---|---|
| Redux / @reduxjs/toolkit | Zustand preferred — hook-based, no boilerplate |
| Prisma | Drizzle preferred — plain TS schema, no proprietary DSL |
| Material UI / Chakra UI | shadcn/ui preferred — raw typed React, no compiled package |
| Express | Hono preferred — edge-compatible, type-safe RPC |

---

## 4. Environment Variables

### Schema (from `lib/env.ts`)

All env vars are validated at **import time** via Zod. If any key is missing or empty, the app throws a formatted error listing **all** missing keys.

#### Server-Only Variables

| Variable | Description | Where to Get |
|---|---|---|
| `SARVAM_API_KEY` | Sarvam AI API key for STT/TTS | [dashboard.sarvam.ai](https://dashboard.sarvam.ai) |
| `GROQ_API_KEY` | Groq API key for LLM inference | [console.groq.com](https://console.groq.com) → API Keys |
| `GEMINI_API_KEY` | Google AI Studio key for Gemini | [aistudio.google.com](https://aistudio.google.com) → Get API key |
| `CLERK_SECRET_KEY` | Clerk secret key | [clerk.com](https://clerk.com) → API Keys |
| `DATABASE_URL` | Neon Postgres **pooled** connection string | [neon.tech](https://neon.tech) → Connection Details |
| `ABDM_CLIENT_ID` | ABDM Sandbox client ID | [sandbox.abdm.gov.in](https://sandbox.abdm.gov.in) |
| `ABDM_CLIENT_SECRET` | ABDM Sandbox client secret | Same as above |

#### Client-Safe Variables (NEXT_PUBLIC_ prefix)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (safe for browser) |

### Validation Architecture

```
lib/env.ts
├── serverEnvSchema (Zod) — 7 keys, all nonEmptyString
├── clientEnvSchema (Zod) — 1 key
├── envSchema = serverEnvSchema.merge(clientEnvSchema)
├── validateEnv() — called at module load time
├── export const env — full validated env object
├── export const serverEnv — server-only subset (typed const)
└── export const clientEnv — client-safe subset (typed const)
```

The `env` module is imported at the top of `app/layout.tsx` so misconfiguration fails at build/boot.

---

## 5. Architecture Overview

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Layer                               │
│        Next.js 15 App Router · React 19 · shadcn/ui             │
│      Kiosk Mode (touch-first) · Zustand State · Offline Queue   │
├─────────────────────────────────────────────────────────────────┤
│                       API Layer                                  │
│       Hono.js on Next.js Route Handlers (Edge Runtime)          │
│      Zod Validation · @hono/zod-validator · Clerk Middleware     │
├─────────────────────────────────────────────────────────────────┤
│                     Business Logic                               │
│    4 Core Modules (see MODULE_CONTRACT.md)                       │
│   A: ConversationalHistoryEngine  B: MedicalDocumentIntelligence│
│   C: StructuredSummaryGenerator   D: ConsentPrivacyIntegration  │
├─────────────────────────────────────────────────────────────────┤
│                      Data Layer                                  │
│          Neon Postgres · Drizzle ORM · Cloudflare R2            │
├─────────────────────────────────────────────────────────────────┤
│                     AI / ML Layer                                │
│    Sarvam (STT/TTS) · Groq (Triage) · Gemini (OCR + Fallback)  │
├─────────────────────────────────────────────────────────────────┤
│                   Integration Layer                              │
│      ABDM V3 APIs · FHIR R4 Bundle Builder · ABHA Linking      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Patient Input
     │
     ▼
┌─────────────────────────────┐
│  A: ConversationalHistory   │──── transcript ────┐
│     Engine                  │                    │
└─────────────────────────────┘                    │
                                                   ▼
Document Upload                          ┌─────────────────────────┐
     │                                   │  C: StructuredSummary   │
     ▼                                   │     Generator           │
┌─────────────────────────────┐          └─────────────────────────┘
│  B: MedicalDocument         │──── timeline ──────┘        │
│     Intelligence            │                             │
└─────────────────────────────┘                    summary   │
                                                   ▼
                                          ┌─────────────────────────┐
                                          │  D: ConsentPrivacy      │
                                          │     Integration         │
                                          └─────────────────────────┘
                                                   │
                                          ABDM push + session wipe
```

---

## 6. Four Core Modules — Contracts

> Full contracts with TypeScript interfaces are in `docs/MODULE_CONTRACT.md`.
> Below is a summary with implementation-relevant details.

### Module A — ConversationalHistoryEngine

**Purpose**: Adaptive voice/touch interview engine with dual-mode input.

**External dependencies**: Sarvam AI (STT: `saaras:v3`, TTS: `bulbul:v3`), Groq (`qwen/qwen3.8-27b`), Gemini (failover).

**Key types**:
- `PatientInput = AudioInput | TouchInput` (discriminated union)
- `ConversationContext` — session state, transcript, SOCRATES state, Dashavidha state
- `InterviewStage` — `chief_complaint → hpi → past_history → drug_allergy → family_history → personal_history → ros → ayush_extended → complete`
- `TriageEvaluation` — `redFlag`, `redFlagReason`, `socratesFieldsMissing[]`, `nextQuestion`, `languageUsed`
- `ConversationTurn` — full response including updated transcript, triage, next prompt, touch options, audio. (The AI detects the patient's spoken language dynamically and responds in the same language, keeping the transcript true to the spoken languages.)

**SOCRATES pain assessment fields**: `site`, `onset`, `character`, `radiation`, `associations`, `timeCourse`, `exacerbatingRelieving`, `severity`

**Dashavidha Pariksha fields**: `prakriti`, `vikriti`, `agni`, `koshtha`, `aharaVihara`, `nidana`, `samprapti`

**Current implementation** (`lib/ai/groq.ts`, `lib/ai/gemini.ts`):
- `evaluateTriage(transcript, language)` — Groq primary, returns `Result<TriageOutput>`
- `evaluateTriageGemini(transcript, language)` — Gemini fallback
- Both use structured JSON output with Zod validation and self-healing retry (2 attempts)
- `generateSummaryLLM()` — stub, returns `NOT_IMPLEMENTED`

**Current implementation** (`lib/ai/sarvam.ts`):
- `transcribeAudio(blob)` — Sarvam STT via REST, returns `Result<string>`
- `synthesizeSpeech()` — stub
- `translateText()` — stub

### Module B — MedicalDocumentIntelligence

**Purpose**: OCR ingestion for 1–2 page medical documents (synchronous).

**External dependencies**: Gemini (`gemini-2.5-flash` Vision), Cloudflare R2.

**Key types**:
- `DocumentType = "prescription" | "lab_report" | "discharge_summary" | "imaging"`
- `OcrStatus = "pending" | "processing" | "complete" | "failed"`
- `ExtractedDocumentData` — date, facility, doctor, typed content per document type
- `DocumentTimeline` — chronologically ordered events with abnormal findings

**Current implementation** (`lib/ai/gemini.ts`):
- `extractDocumentOcr()` — stub, returns `NOT_IMPLEMENTED`

### Module C — StructuredSummaryGenerator

**Purpose**: Stateless transform: transcript + OCR chronology → bilingual clinical summary.

**External dependencies**: Groq (primary), Gemini (failover), Sarvam (translation).

**Output format** (medical history standard):
1. Chief Complaint
2. HPI (History of Present Illness)
3. Past History
4. Drug/Allergy History
5. Family History
6. Personal History
7. Review of Systems
8. Prior Investigations
9. AYUSH Assessment (if applicable)

**Bilingual output**: Physician-facing (English) + Patient-facing (local language).

**Current implementation**: Not yet started (stub `generateSummaryLLM` in `lib/ai/groq.ts`).

### Module D — ConsentPrivacyIntegration

**Purpose**: ABDM OAuth2, ABHA verification, DPDP Act 2023 consent, session data wipe.

**External dependencies**: ABDM V3 Sandbox APIs, Neon Postgres.

**Key types**:
- `AbdmGatewayToken` — OAuth2 session token (cached in memory, never persisted)
- `ConsentPurpose` — `clinical_data_collection | abdm_health_record_linking | data_sharing_with_physician | temporary_storage`
- `SessionWipeResult` — tracks what was wiped (conversations, documents, summaries) and R2 keys deleted

**Current implementation** (`lib/ai/abdm.ts`):
- `getGatewaySessionToken()` — implemented, with in-memory caching
- `verifyAbha()` — stub
- `mapSummaryToFHIR(summary)` — implemented, maps `summaries` table row to FHIR R4 `DiagnosticReport`

**ABDM API endpoint**: `https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions`

---

## 7. Database Schema (Drizzle ORM)

### Configuration (`drizzle.config.ts`)

```ts
export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema/*",   // NOTE: glob pattern
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

### Database Client (`lib/db/index.ts`)

Uses `@neondatabase/serverless` HTTP driver with Drizzle:
```ts
const sql = neon(serverEnv.DATABASE_URL);
export const db = drizzle({ client: sql, schema });
```

### Tables (defined in `lib/db/schema.ts`)

#### Enums

| Enum | Values |
|---|---|
| `languageEnum` | `en`, `hi`, `ta` |
| `sessionStatusEnum` | `in_progress`, `awaiting_triage`, `completed`, `escalated` |
| `docTypeEnum` | `prescription`, `lab_report`, `discharge_summary`, `imaging` |
| `ocrStatusEnum` | `pending`, `processing`, `complete`, `failed` |

#### `patients`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, defaultRandom |
| `full_name` | `text` | NOT NULL |
| `date_of_birth` | `timestamp` | NOT NULL |
| `gender` | `varchar(20)` | NOT NULL |
| `phone` | `varchar(20)` | NOT NULL |
| `preferred_language` | `languageEnum` | NOT NULL |
| `abha_id` | `text` | nullable |
| `abha_linked` | `boolean` | default false, NOT NULL |
| `created_at` | `timestamp` | defaultNow, NOT NULL |

#### `sessions`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, defaultRandom |
| `patient_id` | `uuid` | FK → patients.id (restrict), NOT NULL |
| `kiosk_id` | `text` | NOT NULL |
| `status` | `sessionStatusEnum` | NOT NULL |
| `started_at` | `timestamp` | defaultNow, NOT NULL |
| `completed_at` | `timestamp` | nullable |

#### `conversations`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, defaultRandom |
| `session_id` | `uuid` | FK → sessions.id (cascade), NOT NULL |
| `transcript` | `jsonb` | NOT NULL — array of `{role, text, lang, timestamp}` |
| `red_flag` | `boolean` | default false, NOT NULL |
| `red_flag_reason` | `text` | nullable |

#### `documents`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, defaultRandom |
| `session_id` | `uuid` | FK → sessions.id (cascade), NOT NULL |
| `r2_key` | `text` | NOT NULL — pointer into R2 bucket |
| `doc_type` | `docTypeEnum` | NOT NULL |
| `ocr_status` | `ocrStatusEnum` | NOT NULL |
| `extracted_json` | `jsonb` | nullable |
| `uploaded_at` | `timestamp` | defaultNow, NOT NULL |

#### `summaries`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, defaultRandom |
| `session_id` | `uuid` | FK → sessions.id (cascade), NOT NULL |
| `chief_complaint` | `text` | NOT NULL |
| `hpi` | `text` | NOT NULL |
| `past_history` | `jsonb` | NOT NULL |
| `drug_allergy_history` | `jsonb` | NOT NULL |
| `family_history` | `text` | NOT NULL |
| `personal_history` | `text` | NOT NULL |
| `ros` | `jsonb` | NOT NULL |
| `prior_investigations` | `jsonb` | NOT NULL |
| `ayush_assessment` | `jsonb` | nullable |
| `physician_edited` | `boolean` | default false, NOT NULL |
| `finalized_at` | `timestamp` | nullable |

#### `abdm_links`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, defaultRandom |
| `patient_id` | `uuid` | FK → patients.id (cascade), NOT NULL |
| `abha_number` | `text` | NOT NULL |
| `consent_artifact_id` | `text` | nullable |
| `linked_at` | `timestamp` | defaultNow, NOT NULL |

### Auto-Generated Zod Schemas

`drizzle-zod`'s `createInsertSchema()` generates insert schemas for all tables:
- `insertPatientSchema`
- `insertSessionSchema`
- `insertConversationSchema`
- `insertDocumentSchema`
- `insertSummarySchema`
- `insertAbdmLinkSchema`

### Migration Commands

```bash
npm run db:generate   # drizzle-kit generate
npm run db:migrate    # drizzle-kit migrate
npm run db:push       # drizzle-kit push (dev shortcut)
npm run db:studio     # drizzle-kit studio (GUI)
```

---

## 8. API Layer (Hono.js)

### Mount Point

All API routes are served through a single Hono catch-all at `app/api/[[...route]]/route.ts`.

```ts
export const runtime = "edge";
const app = new Hono<{ Bindings: Bindings }>().basePath("/api");
```

### Route Map (Current)

| Method | Path | Handler | Description |
|---|---|---|---|
| POST | `/api/sessions` | `sessionRouter` | Create session (upsert patient by phone, create session) |
| PATCH | `/api/sessions/:id` | `sessionRouter` | Update session status and/or conversation transcript |
| POST | `/api/sessions/:id/documents` | `sessionRouter` | Upload document to R2, create document record |
| POST | `/api/sessions/:id/finalize` | `sessionRouter` | Generate mock summary, mark session completed |
| GET | `/api/sessions/:id/summary` | `sessionRouter` | Fetch summary for a session |
| POST | `/api/ai/transcribe` | `aiRouter` | Transcribe audio via Sarvam STT |
| POST | `/api/ai/triage` | `aiRouter` | Evaluate triage (Groq primary → Gemini fallback) |

### Response Envelope

All responses use a discriminated union envelope:

```ts
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string, retryable: boolean } }
```

### Type-Safe RPC Client

Frontend uses Hono's type-safe client (`lib/api-client.ts`):

```ts
import { hc } from "hono/client";
import type { AppType } from "@/app/api/[[...route]]/route";
export const rpcClient = hc<AppType>("/");
```

Usage: `rpcClient.api.ai.triage.$post({ json: { transcript, language } })`

### R2 Bindings

The Hono app accepts Cloudflare R2 bindings:

```ts
type Bindings = { "vaidyasetu-documents": R2Bucket };
```

Configured in `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "vaidyasetu-documents"
bucket_name = "vaidyasetu-documents"
```

---

## 9. AI Services Layer

All AI wrappers live in `lib/ai/` and follow the `Result<T, VaidyaSetuError>` pattern.

### Barrel Export (`lib/ai/index.ts`)

```ts
export { transcribeAudio, synthesizeSpeech, translateText } from "./sarvam";
export { evaluateTriage, generateSummaryLLM } from "./groq";
export { extractDocumentOcr, evaluateTriageGemini } from "./gemini";
export { getGatewaySessionToken, verifyAbha, mapSummaryToFHIR } from "./abdm";
```

### Sarvam AI (`lib/ai/sarvam.ts`)

| Function | Status | Description |
|---|---|---|
| `transcribeAudio(blob)` | ✅ Implemented | POST to `https://api.sarvam.ai/speech-to-text` with model `saaras:v3` |
| `synthesizeSpeech(input)` | ⬜ Stub | TTS via Bulbul v3 |
| `translateText(input)` | ⬜ Stub | Translation API |

**Zod schemas defined**: `TranscribeInputSchema`, `TranscribeOutputSchema`, `SynthesizeInputSchema`, `SynthesizeOutputSchema`, `TranslateInputSchema`, `TranslateOutputSchema`

### Groq (`lib/ai/groq.ts`)

| Function | Status | Description |
|---|---|---|
| `evaluateTriage(transcript, language)` | ✅ Implemented | Triage with SOCRATES, red-flag detection, multilingual follow-up questions |
| `generateSummaryLLM(input)` | ⬜ Stub | Structured summary generation |

**Model**: `qwen/qwen3.8-27b` via `https://api.groq.com/openai/v1/chat/completions`

**Self-healing**: 2-attempt loop — if Zod validation fails on attempt 1, the validation error is sent back to the LLM for correction on attempt 2. If both fail → `ESCALATE_TO_STAFF` error.

**Zod schemas**: `TriageInputSchema`, `TriageOutputSchema`, `SocratesFieldSchema`, `SummaryLLMInputSchema`, `SummaryLLMOutputSchema`

### Gemini (`lib/ai/gemini.ts`)

| Function | Status | Description |
|---|---|---|
| `evaluateTriageGemini(transcript, language)` | ✅ Implemented | Same contract as Groq triage (fallback) |
| `extractDocumentOcr(input)` | ⬜ Stub | Vision OCR for medical documents |

**Model**: `gemini-3.6-flash` via `@google/generative-ai` SDK with `responseMimeType: "application/json"`

**Same self-healing retry pattern as Groq.**

**Zod schemas**: `OcrInputSchema`, `OcrOutputSchema`

### ABDM (`lib/ai/abdm.ts`)

| Function | Status | Description |
|---|---|---|
| `getGatewaySessionToken()` | ✅ Implemented | OAuth2 handshake with ABDM V3 sandbox, in-memory token caching |
| `verifyAbha(input, token)` | ⬜ Stub | ABHA number verification |
| `mapSummaryToFHIR(summary)` | ✅ Implemented | Maps `summaries` row → FHIR R4 DiagnosticReport |

**Token caching**: `tokenCache` module-level variable, refreshes 60s before expiry.

**ABDM endpoint**: `https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions`

---

## 10. Frontend Architecture

### Routing (Next.js App Router)

```
app/
├── layout.tsx            # Root: env import, fonts, Toaster
├── globals.css           # Tailwind + CSS variables
├── (kiosk)/              # Route group — no URL segment
│   ├── layout.tsx        # Kiosk shell (minimal wrapper)
│   ├── page.tsx          # Main kiosk page (language select + consultation UI)
│   └── encounter/
│       └── page.tsx      # Encounter page (voice capture)
└── api/
    └── [[...route]]/
        └── route.ts      # Hono catch-all
```

### Root Layout (`app/layout.tsx`)

- Imports `@/lib/env` at top (fail-fast env validation)
- Loads Geist and Geist Mono fonts via `next/font/google`
- Renders `<Toaster position="top-center" richColors />` from Sonner
- Uses `LayoutProps<"/">` type (from Next.js types)

### Patient flow (kiosk screens)

The patient journey is six steps; each step renders inside the shared
`KioskShell` (sticky top bar with Back/Home/Help, persistent
`StepIndicator`, persistent bottom `AccessibilityBar`):

1. **Welcome / Language select** (`app/(kiosk)/page.tsx`) — three
   large language cards (Hindi / English / Tamil) with native-script
   preview, audio greeting on selection, and Ministry / ABDM / DPDP
   trust badges. (Note: Language can also be switched instantly at any time from the persistent `KioskTopBar`).

2. **Consent** (`app/(kiosk)/consent/page.tsx`) — granular toggles
   for the four `ConsentPurpose` values defined in
   `docs/MODULE_CONTRACT.md §D`. Each card has its own
   `Read aloud` button (browser TTS). Required consent purposes are
   explicitly badged. Decisions persist in
   `lib/store/consent.ts`; the consent text/language/timestamp
   snapshot is sent to `/api/sessions/anon` on encounter start.

3. **Identify** (`app/(kiosk)/identify/page.tsx`) — two equally
   prominent paths (link ABHA / continue without). ABHA linking is
   honestly flagged as `NOT_IMPLEMENTED` pending the live ABDM gateway
   and falls back to the anonymous path so patients are never blocked.

4. **Encounter** (`app/(kiosk)/encounter/page.tsx`) — one question
   at a time. Hold-to-speak capture with live waveform
   (`components/HoldToSpeak.tsx`) plus touch option buttons. Each
   patient turn is shown in a caption-confirmation panel
   ("did we get this right?") so they can correct the system before
   the answer propagates. Red-flag detection triggers a full-screen
   destructive interrupt requiring acknowledgement.

5. **Documents** (`app/(kiosk)/documents/page.tsx`) — camera capture
   (rear-facing preferred), retake/preview/submit cycle, skip-to-summary
   path. Uploads hit the existing `/api/sessions/:id/documents`
   multipart endpoint.

6. **Summary** (`app/(kiosk)/summary/page.tsx`) — patient-facing
   readback with audio playback, "something is wrong" branch back to
   the encounter, and an explicit two-step confirmation before
   finalization. A 4-character take-away code and a visual QR-style
   dot grid are shown after a successful send.

### Doctor dashboard (`app/doctor/`)

- `/doctor/dashboard` — list of sessions from `/api/doctor/sessions`
  with red-flag badges, document counts, and status. Protected by
  Clerk middleware (`proxy.ts`).
- `/doctor/session/[id]` — full structured summary, transcript,
  document timeline, AYUSH dosha visualization
  (`app/doctor/components/DoshaChart.tsx`), and three action buttons:
  Edit (PATCH `/api/sessions/:id`), Push to FHIR (calls
  `lib/ai/abdm.ts::mapSummaryToFHIR` server-side via
  `/api/doctor/sessions/:id/fhir`), Approve (sets
  `physician_edited = true`, finalizes the session).

### HoldToSpeak Component (`components/HoldToSpeak.tsx`)

A hold-to-speak button that:
1. Captures audio via `MediaRecorder` API
2. Sends to Sarvam STT (`/api/ai/transcribe`)
3. Falls back to Web Speech API if Sarvam returns non-OK
4. Shows dynamic audio visualizer using `AudioContext` + `AnalyserNode`
5. Handles `pointerDown/pointerUp/pointerLeave/pointerCancel` for robust touch

### shadcn/ui Configuration (`components.json`)

```json
{
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": { "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

**Installed primitives**: `button`, `card`, `progress`, `sonner`,
`badge`, `separator`, `switch` (custom plain-button impl, see note),
`radio-group`, `field`, `dialog` (custom plain-`role=dialog` impl),
`tabs`, `toggle`, `tooltip`.

> **Implementation note on Switch / Dialog.** We initially wrapped
> `@base-ui/react/switch` and `@base-ui/react/dialog`, but their
> production builds raise form-control validation error #26 when
> statically prerendered (`<Switch.Root>` requires an enclosing
> `<label>` and `<Dialog.Root>` portals must be hydrated).
> The kiosk pages are statically prerendered for speed, so the
> Switch is now a plain `<button role="switch" aria-checked>`
> (see `components/ui/switch.tsx`) and the Dialog is a plain
> `<div role="dialog" aria-modal>` (see
> `components/ui/modal.tsx`). Both remain fully accessible and
> keyboard-operable.

### Patient flow (kiosk screens)

The patient journey is six steps; each step renders inside the shared
`KioskShell` (sticky top bar with Back/Home/Help, persistent
`StepIndicator`, persistent bottom `AccessibilityBar`):

1. **Welcome / Language select** (`app/(kiosk)/page.tsx`) — three
   large language cards (Hindi / English / Tamil) with native-script
   preview, audio greeting on selection, and Ministry / ABDM / DPDP
   trust badges.

2. **Consent** (`app/(kiosk)/consent/page.tsx`) — granular toggles
   for the four `ConsentPurpose` values defined in
   `docs/MODULE_CONTRACT.md §D`. Each card has its own
   `Read aloud` button (browser TTS). Required consent purposes
   are explicitly badged. Decisions persist in
   `lib/store/consent.ts`; the consent text/language/timestamp
   snapshot is sent to `/api/sessions/anon` on encounter start.

3. **Identify** (`app/(kiosk)/identify/page.tsx`) — two equally
   prominent paths (link ABHA / continue without). ABHA linking is
   honestly flagged as `NOT_IMPLEMENTED` pending the live ABDM
   gateway and falls back to the anonymous path so patients are
   never blocked.

4. **Encounter** (`app/(kiosk)/encounter/page.tsx`) — one question
   at a time. Hold-to-speak capture with live waveform
   (`components/HoldToSpeak.tsx`) plus touch option buttons.
   Each patient turn is shown in a caption-confirmation panel
   ("did we get this right?") so they can correct the system
   before the answer propagates. Red-flag detection triggers a
   full-screen destructive interrupt requiring acknowledgement.

5. **Documents** (`app/(kiosk)/documents/page.tsx`) — camera
   capture (rear-facing preferred), retake/preview/submit cycle,
   skip-to-summary path. Uploads hit the existing
   `/api/sessions/:id/documents` multipart endpoint.

6. **Summary** (`app/(kiosk)/summary/page.tsx`) — patient-facing
   readback with audio playback, "something is wrong" branch
   back to the encounter, and an explicit two-step confirmation
   before finalization. A 4-character take-away code and a
   visual QR-style dot grid are shown after a successful send.

### Doctor dashboard (`app/doctor/`)

- `/doctor/dashboard` — list of sessions from `/api/doctor/sessions`
  with red-flag badges, document counts, and status. Protected by
  Clerk middleware (`proxy.ts`).
- `/doctor/session/[id]` — full structured summary, transcript,
  document timeline, AYUSH dosha visualization
  (`app/doctor/components/DoshaChart.tsx`), and three action buttons:
  Edit (PATCH `/api/sessions/:id`), Push to FHIR (calls
  `lib/ai/abdm.ts::mapSummaryToFHIR` server-side via
  `/api/doctor/sessions/:id/fhir`), Approve (sets
  `physician_edited = true`, finalizes the session).

---

## 11. State Management (Zustand)

### Session Store (`lib/store/session.ts`)

Single store managing the entire kiosk session lifecycle:

**State shape**:

| Field | Type | Description |
|---|---|---|
| `sessionId` | `SessionId \| null` | Active session ID |
| `patientId` | `PatientId \| null` | Active patient ID |
| `language` | `SupportedLanguage` | `"hi"` default |
| `currentStage` | `InterviewStage` | `"chief_complaint"` default |
| `transcript` | `TranscriptEntry[]` | Full conversation transcript |
| `currentQuestion` | `string \| null` | Current question to display |
| `isRecording` | `boolean` | Microphone active |
| `isProcessing` | `boolean` | Waiting for AI response |
| `uploadProgress` | `number` | Document upload progress |
| `uploadedDocumentIds` | `string[]` | IDs of uploaded documents |
| `redFlagDetected` | `boolean` | Red-flag triggered |
| `redFlagReason` | `string \| null` | Reason for red-flag |
| `ayushModeEnabled` | `boolean` | AYUSH extended assessment active |

**Offline queue**:
- `queueOfflineMutation(mutation)` — saves to IndexedDB via `idb-keyval`
- `syncOfflineQueue()` — replays mutations when back online, deduplicates by sessionId + timestamp

**Dependencies**: `idb-keyval` for IndexedDB access (used for offline queue persistence).

---

## 12. Type System

### Shared Types (`lib/types.ts`)

```ts
// Discriminated union — modules never throw across boundaries
type Result<T, E = VaidyaSetuError> =
  | { success: true; data: T }
  | { success: false; error: E };

interface VaidyaSetuError {
  code: string;       // machine-readable, e.g. "RED_FLAG_DETECTED"
  message: string;    // human-readable context
  retryable: boolean;
}

// Helper constructors
function ok<T>(data: T): Result<T, never>
function err<E>(error: E): Result<never, E>

// Domain primitives
type SupportedLanguage = "en" | "hi" | "ta";
type PatientId = string;
type SessionId = string;
type DocumentId = string;
type ConsentArtifactId = string;
type AbhaNumber = string;
type ISOTimestamp = string;
type Gender = "male" | "female" | "other";
```

### Cross-Module Rule

All public API functions return `Promise<Result<T>>` — never throw across module boundaries.

---

## 13. FHIR R4 & ABDM Integration

### FHIR DiagnosticReport Mapping

The `mapSummaryToFHIR()` function maps a `summaries` table row to a FHIR R4 DiagnosticReport conforming to the NDHM profile:

```
Profile: https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord
```

**Mapped fields**:
- `resourceType` → `"DiagnosticReport"`
- `id` → `summary.id`
- `status` → `"final"`
- `code.coding[0]` → LOINC `11502-2` (Laboratory report)
- `subject.reference` → `Patient/{id}`
- `effectiveDateTime` → `summary.finalized_at`

**Sample**: See `docs/fhir-diagnostic-report.sample.json`

### ABDM OAuth2 Flow

```
1. POST https://dev.abdm.gov.in/api/hiecm/gateway/v3/sessions
   Body: { clientId, clientSecret, grantType: "client_credentials" }
2. Response: { accessToken, expiresIn }
3. Token cached in-memory with 60s pre-expiry refresh
```

### Zod Validation Schema

```ts
FhirDiagnosticReportSchema = z.object({
  resourceType: z.literal("DiagnosticReport"),
  id: z.string().optional(),
  status: z.enum(["registered", "partial", "preliminary", "final"]),
  code: z.record(z.string(), z.unknown()),
  subject: z.record(z.string(), z.unknown()).optional(),
  result: z.array(z.record(z.string(), z.unknown())).optional(),
});
```

---

## 14. Deployment Architecture

### Primary: Cloudflare (Edge/Serverless)

| Component | Service | Config |
|---|---|---|
| Frontend | Cloudflare Pages | Next.js static + SSR |
| API | Cloudflare Workers (edge runtime) | `wrangler.toml` |
| Document Storage | Cloudflare R2 | Bucket: `vaidyasetu-documents` |
| Database | Neon Postgres (serverless) | HTTP driver, scale-to-zero |

### `wrangler.toml`

```toml
name = "vaidyasetu"
compatibility_date = "2024-03-04"
compatibility_flags = ["nodejs_compat"]
main = ".worker-next/index.mjs"

[assets]
directory = ".worker-next/assets"

[[r2_buckets]]
binding = "vaidyasetu-documents"
bucket_name = "vaidyasetu-documents"
```

### Alternative: Vercel

The project also works on Vercel (zero-config Next.js). Remove `export const runtime = "edge"` and R2 bindings if deploying to Vercel.

### Free Tier Limits

| Service | Limit |
|---|---|
| Cloudflare Workers | 100K requests/day |
| Cloudflare Pages | 500 builds/month |
| Cloudflare R2 | 10 GB storage, zero egress |
| Neon Postgres | 0.5 GB storage, 100 CU-hours/month |
| Clerk | 50,000 MRU |
| Groq | Rate-limited (check [console](https://console.groq.com/docs/rate-limits)) |
| Gemini | Rate-limited (check AI Studio) |
| Sarvam | ₹100 free credits on signup |

### Neon Cold Start Warning

Neon scales to zero after 5 minutes idle. First request after idle has ~1–2s cold start. The kiosk UI should show a loading spinner on first load, or add a scheduled keep-alive ping.

---

## 15. Testing Strategy

### Framework

- **Runner**: Vitest (`^3.2.1`)
- **Config**: `vitest.config.ts`
- **Setup**: `test-setup.ts` — loads `.env.local` and `.env` via `dotenv`

### Existing Tests

| File | What it tests |
|---|---|
| `lib/ai/abdm.test.ts` | ABDM gateway token fetch (mocked), Summary → FHIR mapping + Zod validation |

### Running Tests

```bash
npm test          # Watch mode
npm run test:run  # Single run
```

### Testing Patterns

- Mock `global.fetch` for external API calls
- Use Zod schemas to validate function outputs
- Use `Result<T>` pattern — assert `result.success === true` then check `result.data`

---

## 16. Coding Standards & Hard Rules

### From `AGENTS.md` (Non-Negotiable)

1. **TypeScript strict mode**. Never write `any`. Every exported function has an explicit return type.
2. **Zod validation on every payload** — incoming and outgoing — before it touches business logic.
3. **Drizzle only**: never `db.execute()` with a raw string template. Relational queries and typed query builder only. This is a SQL injection boundary.
4. **No empty `catch` blocks**. Every caught error is either re-thrown with added context or logged via `console.error` with a full trace.
5. **Never guess clinical logic**. Return a typed `TODO`/`NotImplemented` error state. Wrong guesses in diagnostic tools are patient-safety issues.
6. **Reference `docs/MODULE_CONTRACT.md`** before touching any core module.

### From `GEMINI.md` (AI Agent Overrides)

- Default model: Claude Sonnet 5
- If ABDM/FHIR code fails `tsc --noEmit` twice → switch to Claude Opus 5
- Always read `package.json`, `tsconfig.json`, `drizzle.config.ts` before generating routing or backend logic

### Import Rules

- Import across modules **only via the module's barrel** (`api.ts`).
- Never import internal schemas or DB tables from another module.
- Shared types live in `lib/types.ts`.
- Never bypass the AI Gateway (`lib/ai/`).

### Error Handling Pattern

```ts
// Correct — Result<T> pattern
async function doThing(): Promise<Result<Output>> {
  try {
    // ... logic
    return { success: true, data: result };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[doThing] Failed: ${msg}`, error);
    return { success: false, error: { code: "THING_FAILED", message: msg, retryable: true } };
  }
}
```

### `tsconfig.json` Key Settings

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "strict": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

---

## 17. 12-Phase Implementation Roadmap

Each phase is a prompt block designed for AI-assisted code generation. Validation commands must pass before proceeding.

| Phase | Name | Validation Command | Status |
|---|---|---|---|
| 1 | Domain Deconstruction & Module Contract | Review `docs/MODULE_CONTRACT.md` | ✅ |
| 2 | AI-Native Technology Stack Selection | `npx tsc --noEmit; Select-String "redux\|prisma\|express" package.json` | ✅ |
| 3 | Free Toolchain Assembly | `npx tsc --noEmit` | ✅ |
| 4 | Environment & Secrets Wiring | `npx tsc --noEmit && npm run build` | ✅ |
| 5 | Free-Tier Hosting & Deployment | `npx wrangler deploy --dry-run` | ✅ |
| 6 | AI Coding Toolkit & Guardrails | Verify `AGENTS.md`, `GEMINI.md` exist | ✅ |
| 7 | Anchor Files & Reference Extraction | Check `route.ts`, `drizzle.config.ts`, FHIR sample | ✅ |
| 8 | Sprint 1: Schema & ORM Foundation | `npx tsc --noEmit && npm run db:generate` | ✅ |
| 9 | Sprint 2: Conversational Engine (Module A) | `npm run test:run && npx tsc --noEmit` | 🔄 |
| 10 | Sprint 3: Document Intelligence (Module B) | `npm run test:run` | 🔄 |
| 11 | Sprint 4: Summary Generator (Module C) | `npm run test:run` | ⬜ |
| 12 | Sprint 5: Consent & Privacy (Module D) | `npm run test:run` | ⬜ |

### What Each Remaining Phase Should Do

**Phase 9 (Module A — Conversational Engine)**:
- Implement full `processTurn()` engine connecting STT → triage → TTS
- Build interview stage progression logic (chief_complaint → hpi → ... → complete)
- Implement SOCRATES state machine for pain complaints
- Add Dashavidha Pariksha questioning flow
- Generate touch-mode options for each question
- Tests: STT mock, triage mock, stage transitions, red-flag scenarios

**Phase 10 (Module B — Document Intelligence)**:
- Implement `extractDocumentOcr()` using Gemini Vision API
- Build `DocumentTimeline` from extracted data
- Implement abnormal lab value flagging
- Handle all 4 document types with type-specific extraction
- R2 upload/retrieve lifecycle
- Tests: OCR mock with different doc types, timeline construction

**Phase 11 (Module C — Summary Generator)**:
- Implement `generateSummary()` using Groq (Gemini fallback)
- Merge transcript + OCR chronology into structured clinical summary
- Implement Sarvam translation for patient-facing summary
- Implement FHIR R4 bundle builder for DiagnosticReport
- Tests: Summary structure, bilingual output, FHIR compliance

**Phase 12 (Module D — Consent & Privacy)**:
- Implement DPDP Act 2023 consent capture UI
- Implement `wipeSessionData()` — cascade delete conversations, documents (DB + R2), summaries
- ABHA verification flow
- Consent artifact management
- Tests: Consent flow, session wipe completeness, ABHA mock

---

## 18. Current Implementation Status

### Implemented (Working)

| Component | File | What Works |
|---|---|---|
| Env validation | `lib/env.ts` | All 8 keys validated at import time with formatted error |
| Database client | `lib/db/index.ts` | Neon HTTP driver + Drizzle ORM |
| Full schema | `lib/db/schema.ts` | 6 tables + 4 enums + 6 Zod insert schemas |
| Hono API | `app/api/[[...route]]/route.ts` | Sessions CRUD, AI transcribe/triage, document upload |
| Sarvam STT | `lib/ai/sarvam.ts` | `transcribeAudio()` — REST upload to Sarvam |
| Groq triage | `lib/ai/groq.ts` | `evaluateTriage()` — SOCRATES + red-flag + multilingual |
| Gemini triage | `lib/ai/gemini.ts` | `evaluateTriageGemini()` — fallback with same contract |
| ABDM auth | `lib/ai/abdm.ts` | `getGatewaySessionToken()` with caching |
| FHIR mapper | `lib/ai/abdm.ts` | `mapSummaryToFHIR()` → DiagnosticReport |
| Zustand store | `lib/store/session.ts` | Full session state + offline queue |
| Kiosk UI | `app/(kiosk)/page.tsx` | Language select, chat UI, voice input, red-flag alerts |
| HoldToSpeak | `components/HoldToSpeak.tsx` | Audio recording, visualizer, Sarvam → Web Speech fallback |
| RPC client | `lib/api-client.ts` | Type-safe Hono client |
| Tests | `lib/ai/abdm.test.ts` | ABDM token + FHIR mapping tests |
| Patient flow screens | `app/(kiosk)/*` | Welcome / Consent / Identify / Encounter / Documents / Summary (each with KioskShell) |
| Doctor dashboard | `app/doctor/*` | Session queue, per-session review with dosha chart |
| Anon session endpoint | `/api/sessions/anon` | POST: creates patient placeholder + session + accepts consent payload |
| Doctor API | `/api/doctor/*` | GET sessions list, GET session detail, POST approve, POST fhir-push |

### Stubs (Not Implemented — Return `NOT_IMPLEMENTED` Error)

| Function | File | What It Should Do |
|---|---|---|
| `synthesizeSpeech()` | `lib/ai/sarvam.ts` | TTS via Sarvam Bulbul v3 |
| `translateText()` | `lib/ai/sarvam.ts` | Translation via Sarvam API |
| `generateSummaryLLM()` | `lib/ai/groq.ts` | Structured clinical summary from transcript |
| `extractDocumentOcr()` | `lib/ai/gemini.ts` | Gemini Vision OCR for medical documents |
| `verifyAbha()` | `lib/ai/abdm.ts` | ABHA number verification against ABDM |

### Not Yet Created

| Component | Description |
|---|---|
| Module barrel files | `lib/modules/*/api.ts` — per-module public API barrels |
| Doctor dashboard | Physician review, approval, analytics |
| Prescription module | Formulary search, prescription builder |
| Offline service worker | Full offline-first capability |
| RBAC middleware | Role-based access control via Clerk metadata |
| Audit logging | Immutable PHI access log |

---

## 19. Open Ambiguities & TODOs

These are flagged in the codebase as TODOs or documented in MODULE_CONTRACT.md:

| # | Ambiguity | Where Flagged |
|---|---|---|
| 1 | Dashavidha Pariksha scope — spec lists 7 of 10 traditional factors. Remaining 3 needed? | MODULE_CONTRACT.md |
| 2 | Abnormal lab detection — trust Gemini OCR or post-process against reference-range DB? | MODULE_CONTRACT.md |
| 3 | Review of Systems — fixed enum of body systems or flexible `Record<string, string>`? | MODULE_CONTRACT.md |
| 4 | ABHA verification method — which methods should the kiosk support? | MODULE_CONTRACT.md |
| 5 | DPDP consent text versioning — store exact text shown for audit? | MODULE_CONTRACT.md |
| 6 | Session wipe scope — wipe session data only or patient record too? | MODULE_CONTRACT.md |
| 7 | Consent revocation — post-session withdrawal (DPDP Section 6(6)) deferred to v2 | MODULE_CONTRACT.md |
| 8 | Dinacharya/Ritucharya — under `personalHistory` or `ayushAssessment`? | MODULE_CONTRACT.md |
| 9 | Multi-language UI — Hindi-first or English-first? i18n strategy | Blueprint.md |
| 10 | Offline mode depth — read-only or full encounter capture with sync? | Blueprint.md |
| 11 | AYUSH-specific ontologies — SNOMED CT mapping or custom codes? | Blueprint.md |
| 12 | Image capture — photo documentation (tongue, pulse, lesions)? | Blueprint.md |
| 13 | HIS integration — replace or supplement existing Hospital Information Systems? | Blueprint.md |

---

## 20. File Inventory

### Source Files (all paths relative to project root)

```
app/
  layout.tsx                              # Root layout (env, fonts, Toaster)
  globals.css                             # Tailwind + CSS vars
  favicon.ico
  (kiosk)/
    layout.tsx                            # Kiosk shell
    page.tsx                              # Step 1 — Welcome / language select
    consent/page.tsx                      # Step 2 — DPDP consent
    identify/page.tsx                     # Step 3 — ABHA optional link
    encounter/page.tsx                    # Step 4 — Voice/touch interview
    documents/page.tsx                    # Step 5 — Camera capture
    summary/page.tsx                      # Step 6 — Patient-facing review
  doctor/
    layout.tsx                            # Clerk auth guard
    dashboard/page.tsx                    # Session queue
    session/[id]/page.tsx                 # Per-session review + dosha chart
    components/
      DoctorTopBar.tsx
      DoshaChart.tsx
  sign-in/
    page.tsx                              # Clerk hosted sign-in entry
  api/
    [[...route]]/
      route.ts                            # Hono catch-all (sessions, AI)

components/
  HoldToSpeak.tsx                         # Voice input with visualizer (Sarvam + Web Speech fallback)
  kiosk/
    KioskChromeBoot.tsx                   # Mounts accessibility settings on <html>
    KioskShell.tsx                        # Common wrapper for patient-facing screens
    KioskTopBar.tsx                       # Back / Home / Help + dialog
    AccessibilityBar.tsx                  # Persistent text-size, high-contrast, audio toggles
    StepIndicator.tsx                     # "Step X of Y" progress
    useSpeech.ts                          # Browser TTS hook
  ui/
    button.tsx                            # shadcn/ui (base-nova)
    card.tsx                              # shadcn/ui
    progress.tsx                          # shadcn/ui
    sonner.tsx                            # shadcn/ui (toast)
    badge.tsx                             # Status / count badge
    separator.tsx                         # Plain <hr> wrapper
    switch.tsx                            # Plain <button role="switch"> (NOT base-ui)
    radio-group.tsx                       # base-ui radio-group wrapper
    field.tsx                             # Label/description form field
    dialog.tsx                            # base-ui dialog wrapper (currently unused in prerendered pages)
    tabs.tsx                              # base-ui tabs wrapper
    tooltip.tsx                           # base-ui tooltip wrapper
    toggle.tsx                            # base-ui toggle wrapper
    modal.tsx                             # Plain <div role="dialog"> (used in place of base-ui Dialog)

lib/
  env.ts                                  # Zod env validation
  types.ts                                # Result<T>, domain primitives
  utils.ts                                # cn() class merge
  api-client.ts                           # Hono RPC client
  consent-types.ts                        # Shared Zod schemas for ConsentPurpose
  i18n/
    dict.ts                               # en/hi/ta static dictionaries + t() helper
  db/
    index.ts                              # Drizzle client
    schema.ts                             # All tables + enums + Zod schemas
  ai/
    index.ts                              # Barrel exports
    sarvam.ts                             # STT, TTS (stub), Translation (stub)
    groq.ts                               # Triage, Summary (stub)
    gemini.ts                             # OCR (stub), Triage fallback
    abdm.ts                               # ABDM auth, ABHA (stub), FHIR mapper
    abdm.test.ts                          # Integration tests
  store/
    session.ts                            # Existing: Zustand session store + offline queue
    kiosk-ui.ts                           # Patient accessibility preferences (text scale, audio, language)
    consent.ts                            # DPDP consent decisions + validation

docs/
  MODULE_CONTRACT.md                      # Module boundaries & contracts
  fhir-diagnostic-report.sample.json      # FHIR R4 sample

human/
  Blueprint.md                            # Master plan & roadmap
  Architecture.png                        # Visual architecture diagram
  *.pdf                                   # Original spec documents
```

### Config Files

```
package.json                              # Dependencies & scripts
tsconfig.json                             # TypeScript strict config
drizzle.config.ts                         # Drizzle Kit (schema glob, postgres)
vitest.config.ts                          # Vitest config
test-setup.ts                             # Dotenv loading for tests
wrangler.toml                             # Cloudflare Workers + R2
components.json                           # shadcn/ui config
eslint.config.mjs                         # ESLint flat config
postcss.config.mjs                        # PostCSS (Tailwind)
.env.example                              # Env var template
.gitignore                                # Git ignores
AGENTS.md                                 # AI agent coding rules
GEMINI.md                                 # Antigravity workspace overrides
```

---

*This document is the single source of truth for VaidyaSetu's technical state.
Update it whenever architectural decisions are made, modules are implemented,
or the phase status changes.*
