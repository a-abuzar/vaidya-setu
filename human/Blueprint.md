# VaidyaSetu — AI-Native Build Blueprint
### (renamed from MediKiosk) — Ministry of AYUSH Problem Statement 26047 — Built via Antigravity

Verified against live sources, September 2026. Free-tier numbers and model names drift; the exact model/quota values below carry a "check at build time" note where volatility is high — everything else is stable enough to build against directly.

---

## 0. Assumed Decisions (original clarifying questions resolved)

The source plan left five open questions. Resolved as follows so nothing blocks Phase 1:

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | Audio transport | **Chunked REST upload** (`.wav` per statement) | Simplicity for MVP; WebSocket streaming (<250ms) is a v2 upgrade, not a hackathon-week task |
| 2 | ABDM for low-literacy | **Optional ABDM linkage** (patient can proceed anonymously or via hospital token) + **Assisted Mode** as staff fallback | Biometric hardware integration is out of scope; anonymous flow guarantees a working demo even if ABHA creation stalls |
| 3 | OCR volume | **Low volume (1–2 pages), synchronous** | Matches kiosk single-visit reality; async queue is unnecessary complexity for the prototype |
| 4 | UI language | **Static dictionaries (`next-intl`)** for chrome + **Sarvam TTS audio** layered on top for low-literacy guidance | LLM-generated UI text reintroduces the exact hallucination risk this stack is designed to eliminate |
| 5 | Deployment target | **Fully cloud serverless** (Cloudflare Workers + Pages + Neon) | Matches the hosting architecture already selected; local Docker only if venue Wi-Fi proves unreliable during rehearsal |

---

## 1. Master Human Setup Checklist

Do this before Phase 1. Every item below is something **you** do in a browser — not a prompt for the AI agent. Total time: 45–90 minutes if nothing requires manual approval.

### 1.1 Groq — LLM orchestration (triage reasoning, conversational engine)
- **Sign up:** https://console.groq.com/ — GitHub or Google login, no card.
- **Get key:** left sidebar → **API Keys** → **Create API Key** → copy immediately (shown once).
- **Model to use:** `llama-3.3-70b-versatile` — current general-purpose model with reliable tool-calling and structured JSON output; use this for red-flag triage and SOCRATES branching logic. If you need a cheaper/faster fallback for trivial sub-tasks, `llama-3.1-8b-instant` is available on the same key.
- **Free tier:** no credit card, rate-limited only (organization-level, not per-key — a second key does not raise your limit). Exact RPM/TPD figures change; check the live numbers at https://console.groq.com/docs/rate-limits before you plan around a specific number.
- **Env var:** `GROQ_API_KEY`

### 1.2 Google AI Studio — Gemini (document OCR / handwriting intelligence)
- **Sign up:** https://aistudio.google.com/ — Google account.
- **Get key:** **Get API key** (top left) → **Create API key** → attach to a new or existing GCP project (billing not required for the free tier).
- **Model to use:** call the rolling alias `gemini-flash-latest` in code so you never hand-update a version string, or pin to `gemini-2.5-flash` if you want a fixed, GA, definitely-free-tier model for the demo. **Do not select a Pro-series model** (`gemini-2.5-pro`, `gemini-3.x-pro`) — Pro models left the free tier April 2026 and will 402 on you mid-hackathon.
- **Free tier:** no card required; rate-limited (tens of RPM range). Confirm current limits on the model picker inside AI Studio itself — it displays your live quota.
- **Env var:** `GEMINI_API_KEY`

### 1.3 Sarvam AI — Indic speech (STT + TTS)
- **Sign up:** https://dashboard.sarvam.ai/
- **Get key:** dashboard → **API Keys**.
- **Free credits:** ₹100 on signup (promotional amounts vary — the dashboard shows your live balance).
- **Models to use:**
  - STT: `saaras:v3` — current default, 22 languages, supports `transcribe`/`translate`/`verbatim`/`translit`/`codemix` modes. Do **not** build against `saarika:v2.5` — it's being deprecated and `saaras:v3` already covers its languages.
  - TTS: **Bulbul v3** — confirm the exact API model string (`bulbul:v3` vs an SDK default of `bulbul:v2`) against the live reference at https://docs.sarvam.ai before you hardcode it; SDKs lag the API by a version sometimes.
  - Worth knowing, not required: **Sarvam Vision** is a 3B-parameter Indic-native OCR/document model (PDF/image → Markdown), an alternative to Gemini for Module B. It currently ships as a self-hosted AWS SageMaker deployment, which is more setup than a hackathon needs — stick with Gemini for the prototype, revisit Sarvam Vision if you productionize.
- **Env var:** `SARVAM_API_KEY`

### 1.4 NHA ABDM Sandbox — start this one FIRST, it can involve a wait
- **Register:** https://sandbox.abdm.gov.in/ — this is a government developer portal, not instant self-serve like the others. Register your organization, request sandbox access.
- **What you get:** Client ID + Client Secret for Milestone 1 (ABHA creation/verification), plus mock ABHA identities and FHIR gateway routing.
- **Critical:** target the **ABDM V3 APIs**. V0.5/V1.0 are legacy — if a tutorial's URLs don't say `/v3/`, it's stale, skip it.
- **Env var:** `ABDM_CLIENT_ID`, `ABDM_CLIENT_SECRET`

### 1.5 Neon — serverless Postgres
- **Sign up:** https://neon.tech/ — GitHub/Google login.
- **Get connection string:** create a project → **Connection Details** on the dashboard → copy the **pooled** connection string (not the direct one — pooled is what Drizzle over serverless needs).
- **Free tier (current):** 0.5 GB storage/project, 100 CU-hours/month, up to 100 projects, 10 branches/project, autoscale to 2 CU, **scale-to-zero after 5 minutes idle**. That last point matters for kiosk UX: the first request after any idle gap eats a cold-start (~1–2s). Plan the UI's first-load spinner around it, or add a scheduled keep-alive ping if the demo timing is tight.
- **Env var:** `DATABASE_URL`

### 1.6 Clerk — authentication
- **Sign up:** https://clerk.com/ → **Create application** → framework: Next.js.
- **Get keys:** dashboard → **API Keys**.
- **Free tier (current):** 50,000 MRU (Monthly *Retained* Users — a user only counts once they return 24h+ after first signing in, so it under-counts relative to MAU). Raised from 10,000 in Feb 2026. Unlimited applications, no card.
- **Env vars:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

### 1.7 Cloudflare — hosting (Pages, Workers, R2)
- **Sign up:** https://dash.cloudflare.com/sign-up — free.
- **Install tooling:**
  ```pwsh
  npm install -g wrangler
  wrangler login
  ```
- **Create an R2 bucket** (dashboard → R2 → Create bucket) for document uploads.
- **Free tier (current):** Workers 100K requests/day, Pages 500 builds/month, R2 10 GB storage with **no egress fees** — this last point is why R2 (not S3) is correct for shuttling document images between kiosk, Worker, and Gemini.
- **Env var:** none needed directly — Wrangler handles auth via `wrangler login`; R2 bucket binding goes in `wrangler.toml`.

### 1.8 `.env.example` — the exact file Phase 4 generates for you
```
SARVAM_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
ABDM_CLIENT_ID=
ABDM_CLIENT_SECRET=
```

---

## 2. The 12 Phases

Each phase = one prompt block, paste verbatim into Antigravity, then run the validation command before moving on. **Never proceed to the next phase if validation fails** — feed the exact error string back to the agent and re-run instead.

---

### Phase 1 — Domain Deconstruction & Module Contract

```
You are scaffolding VaidyaSetu, an AI-native patient case-taking kiosk for Indian
government OPDs (4,000–10,000 patients/day, 2–5 minute consultations) submitted
for Ministry of AYUSH problem statement 26047. Read the attached project spec in
full before writing anything.

Produce a single markdown file, docs/MODULE_CONTRACT.md, defining the four
modules as strict TypeScript interface contracts (not implementations yet):

1. ConversationalHistoryEngine — adaptive voice/touch interview, dual-mode input,
   AYUSH extended mode (Dashavidha Pariksha: Prakriti, Vikriti, Agni, Koshtha,
   Ahara-Vihara, Nidana, Samprapti), red-flag detection with SOCRATES branching
   on pain complaints.
2. MedicalDocumentIntelligence — OCR ingestion (1-2 pages, synchronous),
   chronological timeline construction, abnormal-lab-value flagging.
3. StructuredSummaryGenerator — stateless transform: transcript + OCR chronology
   -> single-page clinical summary (Chief Complaint -> HPI -> Past History ->
   Drug/Allergy -> Family -> Personal -> ROS -> Prior Investigations), bilingual
   output (patient-facing local language, physician-facing English/Hindi).
4. ConsentPrivacyIntegration — ABDM OAuth2 handshake, ABHA verification,
   DPDP Act 2023-compliant consent capture, session data wipe post-submission.

For each module, define the exact input/output TypeScript types and list every
external dependency it will call in later phases (Sarvam, Groq, Gemini, ABDM).
Do not write business logic. If any module's boundary is ambiguous, write a
TODO comment stating the ambiguity rather than guessing.
```

**Validation:** `npx tsc --noEmit docs/MODULE_CONTRACT.md 2>$null; Get-Content docs/MODULE_CONTRACT.md` (this phase is a review step — confirm the four contracts exist and match the module list before Phase 2)

---

### Phase 2 — AI-Native Technology Stack Selection

```
Given docs/MODULE_CONTRACT.md, initialize a TypeScript monorepo for VaidyaSetu
using: Next.js (App Router), Hono.js, Drizzle ORM, Zod, Zustand, shadcn/ui +
Tailwind CSS, Clerk. Reject Redux, Prisma, Material UI, and Express — do not
install them even as transitive suggestions.

Rationale to follow strictly: file-system routing (Next.js App Router) makes
the URL-to-component relationship explicit for AI-driven generation. Zustand
keeps state in one observable hook-based block instead of fragmenting it
across actions/reducers/selectors. shadcn/ui copies raw typed React into the
repo instead of hiding DOM structure behind a compiled package. Hono +
@hono/zod-openapi generates OpenAPI 3.1 natively from a single Zod schema,
so validation logic and API docs can never drift apart. Drizzle defines
schema in plain TypeScript mirroring SQL directly, unlike Prisma's proprietary
schema DSL and generated client proxy.

Run: npx create-next-app@latest . --typescript --app --tailwind --eslint
Then install: hono @hono/zod-openapi drizzle-orm drizzle-kit zod zustand
@clerk/nextjs. Initialize shadcn/ui with npx shadcn@latest init.
Confirm package.json reflects all of the above with no rejected packages
present. Report the final dependency tree.
```

**Validation:** `npx tsc --noEmit; Get-Content package.json | Select-String "redux|prisma|express" ` (must return nothing)

---

### Phase 3 — Free Toolchain Assembly

```
Scaffold the following empty-but-typed structure for VaidyaSetu:

app/
  (kiosk)/            # patient-facing routes
  api/[[...route]]/   # Hono mount point
  layout.tsx
components/ui/        # shadcn primitives live here, do not hand-edit
lib/
  db/schema.ts         # Drizzle schema, empty for now
  ai/                  # Groq, Gemini, Sarvam service wrappers, empty stubs
  store/session.ts      # Zustand store, empty shape only
  env.ts                # see Phase 4

For each service wrapper stub in lib/ai/, define only the function signature
and a Zod input/output schema — no implementation. Every stub must return
Promise<Result<T, VaidyaSetuError>> using a discriminated union, never throw
across module boundaries. Do not implement Sprint logic yet; this phase is
structure only. List every file created.
```

**Validation:** `npx tsc --noEmit`

---

### Phase 4 — Environment & Secrets Wiring

```
Create .env.example at the project root with exactly these keys, no others,
each on its own line with no default value:

SARVAM_API_KEY
GROQ_API_KEY
GEMINI_API_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
ABDM_CLIENT_ID
ABDM_CLIENT_SECRET

Then write lib/env.ts: a Zod schema validating process.env against exactly
these keys, split into server-only and NEXT_PUBLIC_-prefixed client-safe
groups. The module must throw a single, clearly formatted error at import
time (not at first use) if any required var is missing or empty, listing
every missing key in one message rather than failing on the first. Import
this module at the top of app/layout.tsx so a misconfigured deployment
fails at build/boot, never at a random runtime request.
```

**Validation:** `npx tsc --noEmit && npm run build 2>&1 | Select-String "env"` (should show a clean fail-fast error if `.env.local` is absent, and a clean build if present)

---

### Phase 5 — Free-Tier Hosting & Deployment Architecture

```
Configure VaidyaSetu for 100% free-tier deployment on Cloudflare. Write
wrangler.toml at the project root targeting Cloudflare Pages for the
statically-exported Next.js frontend and a Cloudflare Worker (edge runtime)
for the Hono.js backend mounted at app/api/[[...route]]/route.ts. Bind an
R2 bucket named vaidyasetu-documents for temporary OCR document storage.
Do not generate Kubernetes YAML, Terraform HCL, or a Dockerfile — this stack
is Edge/Serverless only. Confirm next.config.ts uses output: 'export' or the
Cloudflare-Pages-compatible adapter, whichever the installed Next.js version
requires — check the installed version first, do not assume.
```

**Validation:** `npx wrangler deploy --dry-run`

---

### Phase 6 — Antigravity AI Coding Toolkit & Guardrails

This phase is mostly human setup, not an agent prompt — Antigravity reads its instructions from fixed paths, not a `.cursorrules` file (that's Cursor's convention, not this tool's).

**6.1 — Create `AGENTS.md` at the project root** (cross-tool baseline; Antigravity auto-reads this):

```markdown
# AGENTS.md — VaidyaSetu

You are an expert TypeScript architect building VaidyaSetu, a regulated
clinical history platform for Indian government AYUSH OPDs. Stack: Next.js
App Router, Hono.js, Drizzle ORM, Zod, Zustand, shadcn/ui, Clerk. Do not
invent alternative frameworks or add new dependencies without stating why
in your response first.

## Non-negotiable rules
- TypeScript strict mode. Never write `any`. Every exported function has an
  explicit return type.
- Every REST/RPC payload — incoming and outgoing — is validated with Zod
  before it touches business logic.
- Drizzle only: never call `db.execute()` with a raw string template.
  Relational queries and the typed query builder only. This is a SQL
  injection boundary, not a style preference.
- No empty `catch` blocks. Every caught error is either re-thrown with
  added context or logged via `console.error` with a full trace — never
  silently swallowed.
- If a requirement is clinically or technically ambiguous, write a function
  signature that returns a typed TODO/NotImplemented error state. Do not
  guess at clinical logic — a wrong guess in a diagnostic support tool is
  a patient-safety issue, not a bug.
- Reference docs/MODULE_CONTRACT.md before touching any of the four core
  modules; do not redefine their boundaries independently.
```

**6.2 — Create `GEMINI.md` at the project root** (Antigravity-specific overrides — takes precedence over `AGENTS.md` when the two conflict):

```markdown
# GEMINI.md — Antigravity overrides for VaidyaSetu

- Default model for this workspace: Claude Sonnet 5. Reason: strongest
  observed adherence to Next.js App Router conventions and Drizzle schema
  patterns over long generation sessions.
- For Phase 11 (ABDM/FHIR mapping) specifically: if Sonnet's output fails
  `tsc --noEmit` twice on the same file, switch this conversation to
  Claude Opus 5 rather than retrying a third time on Sonnet.
- Before generating routing or backend logic, read package.json,
  tsconfig.json, and drizzle.config.ts into context first. Do not assume
  dependency versions.
```

Switch models via the model dropdown in the Antigravity chat panel — pick this per-conversation, it is not a config file setting.

**6.3 — Download the Anthropic public Agent Skills into Antigravity's native skills path** (`.agents/skills/`, the same path Antigravity, Codex, and Goose all read). Run this once from anywhere — it targets your project path directly:

```pwsh
New-Item -ItemType Directory -Force -Path "C:\Users\abuza\VaidyaSetu\.agents\skills" | Out-Null; npx degit anthropics/skills/skills "C:\Users\abuza\VaidyaSetu\.agents\skills" --force
```

Pulls the full public `anthropics/skills` catalogue (frontend-design, mcp-builder, docx, pdf, pptx, skill-creator, web-artifacts-builder, and the rest) with no git history, straight into the folder Antigravity discovers automatically. `frontend-design` is the one that matters most here — it directly informs the kiosk touch-UI work in Phase 12. Re-run the same command later to refresh.

---

### Phase 7 — Anchor Files & Reference Repository Extraction

```
Fetch eric-sison/nextjs-honojs-boilerplate from GitHub as a reference anchor
— do not copy it wholesale, extract only two files for pattern-matching:

1. Its app/api/[[...route]]/route.ts — study how Hono RPC mounts inside the
   Next.js App Router with edge runtime, then generate our equivalent file
   identically in structure, adapted to our module names.
2. Its drizzle.config.ts — copy the connection and dialect configuration
   pattern exactly; do not invent alternative config keys.

Then fetch a sample FHIR R4 DiagnosticReport JSON payload from the ABDM
Sandbox documentation (Milestone 3 Data Exchange reference). Save it as
docs/fhir-diagnostic-report.sample.json. This is the schema our Phase 11
summary-to-FHIR mapper must conform to exactly — flag any field in our
summaries table that has no corresponding FHIR R4 element rather than
inventing one.
```

**Validation:** `Get-ChildItem docs/fhir-diagnostic-report.sample.json, app/api/[[...route]]/route.ts, drizzle.config.ts`

---

### Phase 8 — Sprint 1: Schema & ORM Foundation

```
Build lib/db/schema.ts in Drizzle ORM. Tables, all UUID primary keys:

- patients: full_name, date_of_birth, gender, phone, preferred_language
  (enum: en/hi/ta), abha_id (nullable text), abha_linked (boolean, default
  false), created_at.
- sessions: patient_id (fk), kiosk_id, status (enum: in_progress,
  awaiting_triage, completed, escalated), started_at, completed_at
  (nullable).
- conversations: session_id (fk), transcript (jsonb array of
  {role, text, lang, timestamp}), red_flag (boolean, default false),
  red_flag_reason (nullable text).
- documents: session_id (fk), r2_key (text — pointer into the R2 bucket,
  never store the file itself in Postgres), doc_type (enum: prescription,
  lab_report, discharge_summary, imaging), ocr_status (enum: pending,
  processing, complete, failed), extracted_json (nullable jsonb),
  uploaded_at.
- summaries: session_id (fk), chief_complaint, hpi, past_history (jsonb),
  drug_allergy_history (jsonb), family_history, personal_history,
  ros (jsonb), prior_investigations (jsonb), ayush_assessment (nullable
  jsonb — Prakriti/Vikriti/Agni/Koshtha/Ahara-Vihara fields), physician_
  edited (boolean, default false), finalized_at (nullable).
- abdm_links: patient_id (fk), abha_number, consent_artifact_id (nullable),
  linked_at.

Generate matching Zod insertion schemas for every table using drizzle-zod.
Every foreign key gets an explicit onDelete policy — state your choice
(cascade vs restrict) per relationship and justify it in a code comment.
```

**Validation:** `npx tsc --noEmit && npx drizzle-kit generate`

---

### Phase 9 — Sprint 2: Backend Core API

```
Build the Hono router in app/api/[[...route]]/route.ts using the Sprint 1
schema. Endpoints:

- POST /api/sessions — create a session for a patient (creates patient row
  if new).
- PATCH /api/sessions/:id — update status/transcript.
- POST /api/sessions/:id/documents — accept a document upload, write bytes
  to the R2 bucket, insert a documents row with ocr_status='pending',
  return the row.
- POST /api/sessions/:id/finalize — trigger summary generation from the
  session's conversation + documents, insert the summaries row.
- GET /api/sessions/:id/summary — return the finalized summary.

Every endpoint uses @hono/zod-validator against the Phase 8 Zod schemas
before touching the database. Every response is a typed JSON envelope:
{ success: true, data: T } | { success: false, error: { code: string,
message: string } } — never a bare object or a bare error string. No
endpoint may call db.execute() with a raw template.
```

**Validation:** `npx tsc --noEmit`

---

### Phase 10 — Sprint 3: AI Voice & Triage Engine

```
Implement lib/ai/sarvam.ts: a function transcribeAudio(blob) that posts to
Sarvam's Speech-to-Text endpoint using the saaras:v3 model and returns the
transcript. Implement lib/ai/groq.ts: a function evaluateTriage(transcript)
that sends the transcript to Groq's llama-3.3-70b-versatile with a system
prompt instructing it to: (a) detect emergency red-flag symptoms —
dyspnoea, chest pain with radiation, severe bleeding — and set
red_flag: true with a reason if found; (b) if the complaint involves pain,
apply SOCRATES (Site, Onset, Character, Radiation, Associations, Time
course, Exacerbating/relieving factors, Severity) and identify which
SOCRATES fields are still unanswered; (c) formulate exactly one targeted
follow-up question for the missing field.

Coerce the Groq response through a strict Zod schema
{ redFlag: boolean, redFlagReason: string | null, socratesFieldsMissing:
string[], nextQuestion: string | null }. On a Zod parse failure, retry once
by feeding the exact validation error back into the same Groq call as
additional context. If the second attempt also fails validation, return a
typed error result instructing the frontend to escalate to human staff —
do not fabricate a plausible-looking fallback response.
```

**Validation:** `npx tsc --noEmit && npm run lint`

---

### Phase 11 — Sprint 4: ABDM Sandbox Integration

```
Implement lib/ai/abdm.ts. First, a function getGatewaySessionToken() that
performs the OAuth 2.0 handshake against the ABDM V3 sandbox gateway using
ABDM_CLIENT_ID and ABDM_CLIENT_SECRET, hitting the /api/hiecm/gateway/v3/
sessions endpoint, and returns a typed token object. This function is
stateless — cache the token in memory with its expiry, never in the
database.

Second, a function mapSummaryToFHIR(summary: Summary): FHIRDiagnosticReport
that transforms a summaries row into an HL7 FHIR R4 DiagnosticReport
payload matching docs/fhir-diagnostic-report.sample.json field-for-field.
Every summaries column must map to a specific FHIR element or be explicitly
listed in a code comment as "no FHIR R4 equivalent — omitted." Do not
invent a custom FHIR extension to force a fit; flag the gap instead and
move on.

Write one integration test that runs both functions against ABDM_SANDBOX
mock credentials and asserts the FHIR payload validates against the R4
DiagnosticReport shape.
```

**Validation:** `npx tsc --noEmit && npm test -- abdm`

---

### Phase 12 — Sprint 5: Frontend UI Assembly & Free-Tier Disaster Recovery

```
Build the kiosk frontend using shadcn/ui, heavily icon-based, for
non-tech-savvy touch-screen use. Implement lib/store/session.ts as a
Zustand store holding the active session's ephemeral state (current
question, transcript-so-far, upload progress). Build a prominent
"Hold to Speak" component using the browser's MediaRecorder API. All data
fetching goes through the Hono RPC client so the UI-to-API contract is
type-checked end to end — no hand-written fetch calls with untyped JSON.

Then implement the three free-tier failover paths as part of this same UI
layer, each behind the same service interface so the frontend never
branches on which provider actually served the request:

1. Sarvam STT returns HTTP 429 -> fall back to the browser's native
   Web Speech API. Log the degradation; do not fail the interaction.
2. Groq returns 429/5xx -> fail over to Gemini using the same Zod-parsed
   output contract from Phase 10 — the triage logic must not know which
   model answered.
3. A Neon write fails (connection drop, cold-start timeout) -> the Zustand
   store queues the pending transcript/document write into IndexedDB
   (never localStorage — payloads include jsonb blobs that can exceed
   localStorage's practical size). A background sync utility flushes the
   queue to the Hono API once connectivity returns, in original order,
   deduplicated by session id + timestamp.

Confirm no console.error is left unhandled in the browser during a
simulated offline-to-online transition (throttle the network in devtools,
do not just assert it in code).
```

**Validation:** `npm run build`

---

## 3. Execution Order Recap

1. Section 1 (human checklist) — start ABDM sandbox registration first, it's the slow one.
2. Phases 1–7 — scaffolding, tooling, anchors. No clinical logic yet.
3. Phases 8–12 — the five sprints, strictly in order. Do not start Phase 9 with a failing Phase 8 validation.

This is for informational and technical planning purposes only — clinical logic embedded in the software (triage flags, AYUSH assessments) requires domain-expert review before any real-patient use; nothing here constitutes medical advice or a certified clinical device.
